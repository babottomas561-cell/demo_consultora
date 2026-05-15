from __future__ import annotations

import os
import hashlib
import json
from datetime import date, timedelta
from typing import Any

import psycopg2
from psycopg2.extras import Json, execute_values
from psycopg2 import sql

from connectors.infomanager import INFOMANAGER_REPORT_CATALOG, InfomanagerConnector
from worker_app import celery_app


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5433/demo_consultora")
COMMISSION_RATE = float(os.getenv("INFOMANAGER_COMMISSION_RATE", "0.03"))
RAW_REPORT_MAX_PAGES = int(os.getenv("INFOMANAGER_RAW_REPORT_MAX_PAGES", "500"))


def _as_float(value: Any, default: float = 0.0) -> float:
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _report_row_key(report_key: str, row: dict[str, Any], index: int) -> str:
    for key in ("id", "fa_id", "movimiento", "comprobante_id", "id_comprobante", "numero_de_comprobante", "cod_articulo"):
        value = row.get(key)
        if value not in (None, ""):
            return f"{report_key}:{key}:{value}"
    digest = hashlib.sha1(json.dumps(row, sort_keys=True, default=str).encode("utf-8")).hexdigest()
    return f"{report_key}:row:{index}:{digest}"


def _sync_infomanager_report_rows(cur, im: InfomanagerConnector, desde: date, hasta: date) -> dict[str, int]:
    counts: dict[str, int] = {}
    for report_key, report in INFOMANAGER_REPORT_CATALOG.items():
        if not report.get("supported"):
            continue
        rows = im.fetch_report_rows(report_key, desde, hasta, max_pages=RAW_REPORT_MAX_PAGES)
        counts[report_key] = len(rows)
        values = [
            (
                report_key,
                report["name"],
                _report_row_key(report_key, row, index),
                desde,
                hasta,
                Json(row),
            )
            for index, row in enumerate(rows)
        ]
        if values:
            execute_values(
                cur,
                """
                INSERT INTO infomanager_report_rows (
                  report_key, report_name, row_key, fecha_desde, fecha_hasta, payload, synced_at
                )
                VALUES %s
                ON CONFLICT (report_key, row_key) DO UPDATE SET
                  report_name=EXCLUDED.report_name,
                  fecha_desde=EXCLUDED.fecha_desde,
                  fecha_hasta=EXCLUDED.fecha_hasta,
                  payload=EXCLUDED.payload,
                  synced_at=NOW()
                """,
                values,
                template="(%s, %s, %s, %s, %s, %s, NOW())",
                page_size=500,
            )
    return counts


def _set_tenant_search_path(cur, tenant_schema: str) -> None:
    cur.execute(sql.SQL("SET search_path TO {}").format(sql.Identifier(tenant_schema)))


def _upsert_clientes_from_ventas(cur, ventas: list[dict[str, Any]]) -> None:
    clientes: dict[str, str] = {}
    for venta in ventas:
        cliente_id = venta.get("cliente_id")
        if cliente_id:
            clientes[str(cliente_id)] = venta.get("cliente_nombre") or f"Cliente {cliente_id}"

    for external_id, nombre in clientes.items():
        cur.execute(
            """
            INSERT INTO clientes (external_id, nombre)
            VALUES (%s, %s)
            ON CONFLICT (external_id) DO UPDATE SET
              nombre=EXCLUDED.nombre
            """,
            (external_id, nombre),
        )


def _sync_clientes_maestro(cur, clientes_maestro: list[dict[str, Any]]) -> dict[str, str]:
    """Upsert client master data and return {cod_cliente: nombre} lookup."""
    lookup: dict[str, str] = {}
    for c in clientes_maestro:
        cod = str(c.get("cod_cliente", "0"))
        nombre = c.get("nombre") or c.get("razon_social") or f"Cliente {cod}"
        lookup[cod] = nombre
        cur.execute(
            """
            INSERT INTO clientes (external_id, nombre)
            VALUES (%s, %s)
            ON CONFLICT (external_id) DO UPDATE SET
              nombre = CASE
                WHEN EXCLUDED.nombre <> '' AND EXCLUDED.nombre NOT LIKE 'Cliente %%'
                THEN EXCLUDED.nombre
                ELSE clientes.nombre
              END
            """,
            (cod, nombre),
        )
    return lookup


def _enrich_ventas_nombres(cur, cliente_lookup: dict[str, str]) -> None:
    """Update ventas.cliente_nombre from the client master lookup."""
    if not cliente_lookup:
        return
    for cod, nombre in cliente_lookup.items():
        if nombre and not nombre.startswith("Cliente "):
            cur.execute(
                """
                UPDATE ventas SET cliente_nombre = %s
                WHERE cliente_id = %s AND (cliente_nombre IS NULL OR cliente_nombre = '' OR cliente_nombre LIKE 'Cliente %%')
                """,
                (nombre, cod),
            )


def _enrich_compras_nombres(cur, proveedor_lookup: dict[str, str]) -> None:
    """Update compras.proveedor_nombre from the provider master lookup."""
    if not proveedor_lookup:
        return
    for cod, nombre in proveedor_lookup.items():
        if nombre and not nombre.startswith("Proveedor "):
            cur.execute(
                """
                UPDATE compras SET proveedor_nombre = %s
                WHERE proveedor_id = %s AND (proveedor_nombre IS NULL OR proveedor_nombre = '' OR proveedor_nombre LIKE 'Proveedor %%')
                """,
                (nombre, cod),
            )


def _enrich_ventas_from_cta_clientes(cur) -> None:
    """Use customer current-account names when sales headers lack customer names."""
    cur.execute(
        """
        WITH names AS (
          SELECT cliente_id, MAX(cliente_nombre) AS cliente_nombre
          FROM cuentas_corrientes_clientes
          WHERE NULLIF(TRIM(cliente_nombre), '') IS NOT NULL
          GROUP BY cliente_id
        )
        UPDATE ventas v
        SET cliente_nombre = names.cliente_nombre
        FROM names
        WHERE v.cliente_id = names.cliente_id
          AND (
            v.cliente_nombre IS NULL
            OR v.cliente_nombre = ''
            OR v.cliente_nombre LIKE 'Cliente %%'
          )
        """
    )
    cur.execute(
        """
        INSERT INTO clientes (external_id, nombre)
        SELECT cliente_id, MAX(cliente_nombre)
        FROM cuentas_corrientes_clientes
        WHERE NULLIF(TRIM(cliente_nombre), '') IS NOT NULL
        GROUP BY cliente_id
        ON CONFLICT (external_id) DO UPDATE SET
          nombre = CASE
            WHEN EXCLUDED.nombre <> '' AND EXCLUDED.nombre NOT LIKE 'Cliente %%'
            THEN EXCLUDED.nombre
            ELSE clientes.nombre
          END
        """
    )


def _map_saldo_cliente(row: dict[str, Any], index: int) -> dict[str, Any]:
    cliente_id = str(row.get("cliente_id") or row.get("cod_cliente") or row.get("codcliente") or 0)
    importe = _as_float(row.get("importe") or row.get("saldo") or row.get("saldo_acumulado"))
    comprobante_id = str(
        row.get("comprobante_id")
        or row.get("comprobante")
        or row.get("nro_comprobante")
        or row.get("numero")
        or f"saldo-cliente-{cliente_id}-{index}"
    )
    return {
        "cliente_id": cliente_id,
        "cliente_nombre": row.get("cliente_nombre") or row.get("nombre") or row.get("razon_social") or f"Cliente {cliente_id}",
        "comprobante_id": comprobante_id,
        "tipo": row.get("tipo") or "saldo",
        "fecha": row.get("fecha") or date.today(),
        "importe": importe,
        "saldo_acumulado": _as_float(row.get("saldo_acumulado") or row.get("saldo"), importe),
        "fecha_vencimiento": row.get("fecha_vencimiento") or row.get("vencimiento"),
    }


def _map_saldo_proveedor(row: dict[str, Any], index: int) -> dict[str, Any]:
    proveedor_id = str(row.get("proveedor_id") or row.get("cod_proveedor") or row.get("codproveedor") or 0)
    importe = _as_float(row.get("importe") or row.get("saldo") or row.get("saldo_acumulado"))
    comprobante_id = str(
        row.get("comprobante_id")
        or row.get("comprobante")
        or row.get("nro_comprobante")
        or row.get("numero")
        or f"saldo-proveedor-{proveedor_id}-{index}"
    )
    return {
        "proveedor_id": proveedor_id,
        "proveedor_nombre": row.get("proveedor_nombre") or row.get("nombre") or row.get("razon_social") or f"Proveedor {proveedor_id}",
        "comprobante_id": comprobante_id,
        "tipo": row.get("tipo") or "saldo",
        "fecha": row.get("fecha") or date.today(),
        "importe": importe,
        "saldo_acumulado": _as_float(row.get("saldo_acumulado") or row.get("saldo"), importe),
        "fecha_vencimiento": row.get("fecha_vencimiento") or row.get("vencimiento"),
    }


def _enrich_customer_documents_with_salespeople(
    comprobantes: dict[str, dict[str, Any]],
    ventas: list[dict[str, Any]],
    vendedor_lookup: dict[int, str],
) -> None:
    vendedor_by_cliente_fecha: dict[tuple[str, str], int] = {}
    for venta in ventas:
        cod_vendedor = venta.get("cod_vendedor")
        fecha = str(venta.get("fecha") or "")[:10]
        cliente_id = str(venta.get("cliente_id") or "")
        if cliente_id and fecha and cod_vendedor:
            vendedor_by_cliente_fecha[(cliente_id, fecha)] = int(cod_vendedor)

    for doc in comprobantes.values():
        if doc.get("cod_vendedor"):
            doc["vendedor_nombre"] = vendedor_lookup.get(int(doc["cod_vendedor"]))
            continue
        key = (str(doc.get("cliente_id") or ""), str(doc.get("fecha") or "")[:10])
        cod_vendedor = vendedor_by_cliente_fecha.get(key)
        if cod_vendedor:
            doc["cod_vendedor"] = cod_vendedor
            doc["vendedor_nombre"] = vendedor_lookup.get(cod_vendedor)


@celery_app.task(bind=True, max_retries=3, name="tasks.sync_infomanager.sync_company")
def sync_company(self, company_id: int, connector_id: int):
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT cc.client_id, cc.client_secret, cc.base_url, c.tenant_schema
            FROM public.company_connectors cc
            JOIN public.companies c ON c.id = cc.company_id
            WHERE cc.id = %s AND cc.company_id = %s
            """,
            (connector_id, company_id),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError(f"Connector {connector_id} for company {company_id} not found")

        client_id, client_secret, base_url, tenant = row
        cur.execute(
            """
            UPDATE public.company_connectors
            SET sync_status='running', sync_error=NULL
            WHERE id=%s
            """,
            (connector_id,),
        )
        conn.commit()

        im = InfomanagerConnector(client_id, client_secret, base_url)
        im.authenticate()
        cur.execute(
            """
            UPDATE public.company_connectors
            SET access_token=%s, token_expires_at=%s
            WHERE id=%s
            """,
            (im.token, im.token_expires, connector_id),
        )

        _set_tenant_search_path(cur, tenant)

        vendedores = im.sync_vendedores()
        vendedor_lookup: dict[int, str] = {}
        for vendedor in vendedores:
            vendedor_lookup[int(vendedor["cod_vendedor"])] = vendedor["nombre"]
            cur.execute(
                """
                INSERT INTO vendedores (cod_vendedor, nombre, habilitado)
                VALUES (%(cod_vendedor)s, %(nombre)s, %(habilitado)s)
                ON CONFLICT (cod_vendedor) DO UPDATE SET
                  nombre=EXCLUDED.nombre,
                  habilitado=EXCLUDED.habilitado
                """,
                vendedor,
            )

        # --- Client & provider master data ---
        clientes_maestro = im.sync_clientes()
        cliente_lookup = _sync_clientes_maestro(cur, clientes_maestro)

        proveedores_maestro = im.sync_proveedores()
        proveedor_lookup: dict[str, str] = {}
        for p in proveedores_maestro:
            cod = str(p.get("cod_proveedor", "0"))
            proveedor_lookup[cod] = p.get("nombre") or p.get("razon_social") or f"Proveedor {cod}"

        articulos, rubros, subrubros = im.sync_articulos()
        for cod_rubro, nombre in rubros.items():
            cur.execute(
                """
                INSERT INTO rubros (cod_rubro, nombre)
                VALUES (%s, %s)
                ON CONFLICT (cod_rubro) DO UPDATE SET nombre=EXCLUDED.nombre
                """,
                (cod_rubro, nombre),
            )
        for subrubro in subrubros.values():
            cur.execute(
                """
                INSERT INTO subrubros (cod_subrubro, cod_rubro, nombre)
                VALUES (%(cod_subrubro)s, %(cod_rubro)s, %(nombre)s)
                ON CONFLICT (cod_subrubro) DO UPDATE SET
                  cod_rubro=EXCLUDED.cod_rubro,
                  nombre=EXCLUDED.nombre
                """,
                subrubro,
            )

        for deposito in im.sync_depositos():
            cur.execute(
                """
                INSERT INTO depositos (cod_deposito, nombre, habilitado)
                VALUES (%(cod_deposito)s, %(nombre)s, %(habilitado)s)
                ON CONFLICT (cod_deposito) DO UPDATE SET
                  nombre=EXCLUDED.nombre,
                  habilitado=EXCLUDED.habilitado
                """,
                deposito,
            )

        stock_data = im.sync_stock()
        for stock in stock_data:
            cur.execute(
                """
                INSERT INTO stock (cod_articulo, cod_deposito, cantidad, precio_compra_actual, stock_minimo)
                VALUES (%(cod_articulo)s, %(cod_deposito)s, %(cantidad)s, %(precio_compra_actual)s, %(stock_minimo)s)
                ON CONFLICT (cod_articulo, cod_deposito) DO UPDATE SET
                  cantidad=EXCLUDED.cantidad,
                  precio_compra_actual=EXCLUDED.precio_compra_actual,
                  stock_minimo=EXCLUDED.stock_minimo,
                  ultima_actualizacion=NOW()
                """,
                stock,
            )

        desde = date.today() - timedelta(days=365)
        hasta = date.today()

        ventas = im.sync_ventas(desde, hasta)

        # Delete-then-insert for the sync window: avoids stale/corrupted rows from
        # previous syncs (e.g. FA records that were overwritten as NC due to old constraint).
        # Safer than upsert when the upstream data model can change between syncs.
        cur.execute("DELETE FROM ventas WHERE fecha >= %s AND fecha <= %s", (desde, hasta))

        _upsert_clientes_from_ventas(cur, ventas)
        for venta in ventas:
            cur.execute(
                """
                INSERT INTO ventas (
                  fecha, cliente_id, cliente_nombre, producto_id, producto_nombre,
                  cantidad, precio_unitario, total, tipo_comprobante, tipo_factura,
                  punto_de_venta, cod_vendedor, cod_empresa, tag,
                  condicion_venta_tipo, neto, iva_importe, anulada,
                  cod_deposito, cod_rubro, precio_compra_actual, descuento_porc
                )
                VALUES (
                  %(fecha)s, %(cliente_id)s, %(cliente_nombre)s, %(producto_id)s,
                  %(producto_nombre)s, %(cantidad)s, %(precio_unitario)s, %(total)s,
                  %(tipo_comprobante)s, %(tipo_factura)s, %(punto_de_venta)s,
                  %(cod_vendedor)s, %(cod_empresa)s, %(tag)s,
                  %(condicion_venta_tipo)s, %(neto)s, %(iva_importe)s,
                  %(anulada)s, %(cod_deposito)s, %(cod_rubro)s,
                  %(precio_compra_actual)s, %(descuento_porc)s
                )
                ON CONFLICT (fecha, cliente_id, producto_id, tipo_comprobante) DO UPDATE SET
                  cliente_nombre=EXCLUDED.cliente_nombre,
                  producto_nombre=EXCLUDED.producto_nombre,
                  total=EXCLUDED.total,
                  cantidad=EXCLUDED.cantidad,
                  precio_unitario=EXCLUDED.precio_unitario,
                  neto=EXCLUDED.neto,
                  iva_importe=EXCLUDED.iva_importe,
                  precio_compra_actual=EXCLUDED.precio_compra_actual,
                  descuento_porc=EXCLUDED.descuento_porc
                """,
                venta,
            )

        compras = im.sync_compras(desde, hasta)
        for compra in compras:
            proveedor_nombre = proveedor_lookup.get(str(compra.get("proveedor_id")))
            if proveedor_nombre and not proveedor_nombre.startswith("Proveedor "):
                compra["proveedor_nombre"] = proveedor_nombre
            cur.execute(
                """
                INSERT INTO compras (
                  fecha, proveedor_id, proveedor_nombre, producto_id, producto_nombre,
                  cantidad, precio_unitario, total, tipo_comprobante, tipo_factura,
                  punto_de_venta, cod_empresa, neto, iva_importe, anulada, cod_deposito
                )
                VALUES (
                  %(fecha)s, %(proveedor_id)s, %(proveedor_nombre)s,
                  %(producto_id)s, %(producto_nombre)s, %(cantidad)s,
                  %(precio_unitario)s, %(total)s, %(tipo_comprobante)s, %(tipo_factura)s,
                  %(punto_de_venta)s, %(cod_empresa)s, %(neto)s, %(iva_importe)s,
                  %(anulada)s, %(cod_deposito)s
                )
                ON CONFLICT (fecha, proveedor_id, producto_id, tipo_comprobante) DO UPDATE SET
                  proveedor_nombre=EXCLUDED.proveedor_nombre,
                  producto_nombre=EXCLUDED.producto_nombre,
                  cantidad=EXCLUDED.cantidad,
                  precio_unitario=EXCLUDED.precio_unitario,
                  total=EXCLUDED.total,
                  tipo_factura=EXCLUDED.tipo_factura,
                  punto_de_venta=EXCLUDED.punto_de_venta,
                  cod_empresa=EXCLUDED.cod_empresa,
                  neto=EXCLUDED.neto,
                  iva_importe=EXCLUDED.iva_importe,
                  anulada=EXCLUDED.anulada,
                  cod_deposito=EXCLUDED.cod_deposito
                """,
                compra,
            )

        # --- Enrich names from master data ---
        _enrich_ventas_nombres(cur, cliente_lookup)
        _enrich_compras_nombres(cur, proveedor_lookup)

        for index, saldo in enumerate(im.sync_saldos_clientes()):
            cur.execute(
                """
                INSERT INTO cuentas_corrientes_clientes (
                  cliente_id, cliente_nombre, comprobante_id, tipo, fecha,
                  importe, saldo_acumulado, fecha_vencimiento
                )
                VALUES (
                  %(cliente_id)s, %(cliente_nombre)s, %(comprobante_id)s,
                  %(tipo)s, %(fecha)s, %(importe)s, %(saldo_acumulado)s,
                  %(fecha_vencimiento)s
                )
                ON CONFLICT (comprobante_id, tipo) DO UPDATE SET
                  cliente_nombre=EXCLUDED.cliente_nombre,
                  importe=EXCLUDED.importe,
                  saldo_acumulado=EXCLUDED.saldo_acumulado,
                  fecha_vencimiento=EXCLUDED.fecha_vencimiento
                """,
                _map_saldo_cliente(saldo, index),
            )

        _enrich_ventas_from_cta_clientes(cur)

        for index, saldo in enumerate(im.sync_saldos_proveedores(desde, hasta)):
            cur.execute(
                """
                INSERT INTO cuentas_corrientes_proveedores (
                  proveedor_id, proveedor_nombre, comprobante_id, tipo, fecha,
                  importe, saldo_acumulado, fecha_vencimiento
                )
                VALUES (
                  %(proveedor_id)s, %(proveedor_nombre)s, %(comprobante_id)s,
                  %(tipo)s, %(fecha)s, %(importe)s, %(saldo_acumulado)s,
                  %(fecha_vencimiento)s
                )
                ON CONFLICT (comprobante_id, tipo) DO UPDATE SET
                  proveedor_nombre=EXCLUDED.proveedor_nombre,
                  importe=EXCLUDED.importe,
                  saldo_acumulado=EXCLUDED.saldo_acumulado,
                  fecha_vencimiento=EXCLUDED.fecha_vencimiento
                """,
                _map_saldo_proveedor(saldo, index),
            )

        comprobantes_clientes, pagos_clientes = im.sync_comprobantes_clientes(desde, hasta)
        _enrich_customer_documents_with_salespeople(comprobantes_clientes, ventas, vendedor_lookup)
        for comprobante in comprobantes_clientes.values():
            cliente_id = str(comprobante.get("cliente_id") or "")
            cliente_nombre = comprobante.get("cliente_nombre") or cliente_lookup.get(cliente_id) or f"Cliente {cliente_id}"
            comprobante["cliente_nombre"] = cliente_nombre
            cur.execute(
                """
                INSERT INTO comprobantes_clientes (
                  comprobante_id, cliente_id, cliente_nombre, tipo, numero,
                  punto_de_venta, fecha, fecha_vencimiento, importe_total,
                  importe_pagado, saldo, cod_vendedor, detalle
                )
                VALUES (
                  %(comprobante_id)s, %(cliente_id)s, %(cliente_nombre)s,
                  %(tipo)s, %(numero)s, %(punto_de_venta)s, %(fecha)s,
                  %(fecha_vencimiento)s, %(importe_total)s, %(importe_pagado)s,
                  %(saldo)s, %(cod_vendedor)s, %(detalle)s
                )
                ON CONFLICT (comprobante_id, tipo) DO UPDATE SET
                  cliente_id=EXCLUDED.cliente_id,
                  cliente_nombre=EXCLUDED.cliente_nombre,
                  numero=EXCLUDED.numero,
                  punto_de_venta=EXCLUDED.punto_de_venta,
                  fecha=EXCLUDED.fecha,
                  fecha_vencimiento=EXCLUDED.fecha_vencimiento,
                  importe_total=EXCLUDED.importe_total,
                  importe_pagado=EXCLUDED.importe_pagado,
                  saldo=EXCLUDED.saldo,
                  cod_vendedor=EXCLUDED.cod_vendedor,
                  detalle=EXCLUDED.detalle
                """,
                comprobante,
            )

        for pago in pagos_clientes:
            cod_cliente = str(pago.get("cod_cliente") or "")
            if not pago.get("cliente_nombre") and cod_cliente in cliente_lookup:
                pago["cliente_nombre"] = cliente_lookup[cod_cliente]
            cur.execute(
                """
                INSERT INTO pagos_clientes (
                  pago_id, comprobante_id, fecha, forma_pago, importe,
                  cod_cliente, cliente_nombre
                )
                VALUES (
                  %(pago_id)s, %(comprobante_id)s, %(fecha)s, %(forma_pago)s,
                  %(importe)s, %(cod_cliente)s, %(cliente_nombre)s
                )
                ON CONFLICT (pago_id, comprobante_id) DO UPDATE SET
                  fecha=EXCLUDED.fecha,
                  forma_pago=EXCLUDED.forma_pago,
                  importe=EXCLUDED.importe,
                  cod_cliente=EXCLUDED.cod_cliente,
                  cliente_nombre=EXCLUDED.cliente_nombre
                """,
                pago,
            )

        comprobantes_proveedores, pagos_proveedores = im.sync_comprobantes_proveedores(desde, hasta)
        for comprobante in comprobantes_proveedores:
            proveedor_id = str(comprobante.get("proveedor_id") or "")
            if proveedor_id in proveedor_lookup and not proveedor_lookup[proveedor_id].startswith("Proveedor "):
                comprobante["proveedor_nombre"] = proveedor_lookup[proveedor_id]
            cur.execute(
                """
                INSERT INTO comprobantes_proveedores (
                  comprobante_id, proveedor_id, proveedor_nombre, tipo, numero,
                  punto_de_venta, fecha, fecha_vencimiento, importe_total,
                  importe_pagado, saldo, detalle
                )
                VALUES (
                  %(comprobante_id)s, %(proveedor_id)s, %(proveedor_nombre)s,
                  %(tipo)s, %(numero)s, %(punto_de_venta)s, %(fecha)s,
                  %(fecha_vencimiento)s, %(importe_total)s, %(importe_pagado)s,
                  %(saldo)s, %(detalle)s
                )
                ON CONFLICT (comprobante_id, tipo) DO UPDATE SET
                  proveedor_id=EXCLUDED.proveedor_id,
                  proveedor_nombre=EXCLUDED.proveedor_nombre,
                  numero=EXCLUDED.numero,
                  punto_de_venta=EXCLUDED.punto_de_venta,
                  fecha=EXCLUDED.fecha,
                  fecha_vencimiento=EXCLUDED.fecha_vencimiento,
                  importe_total=EXCLUDED.importe_total,
                  importe_pagado=EXCLUDED.importe_pagado,
                  saldo=EXCLUDED.saldo,
                  detalle=EXCLUDED.detalle
                """,
                comprobante,
            )

        for pago in pagos_proveedores:
            cur.execute(
                """
                INSERT INTO pagos_proveedores (
                  pago_id, comprobante_id, fecha, forma_pago, importe,
                  proveedor_id, proveedor_nombre
                )
                VALUES (
                  %(pago_id)s, %(comprobante_id)s, %(fecha)s, %(forma_pago)s,
                  %(importe)s, %(proveedor_id)s, %(proveedor_nombre)s
                )
                ON CONFLICT (pago_id, comprobante_id) DO UPDATE SET
                  fecha=EXCLUDED.fecha,
                  forma_pago=EXCLUDED.forma_pago,
                  importe=EXCLUDED.importe,
                  proveedor_id=EXCLUDED.proveedor_id,
                  proveedor_nombre=EXCLUDED.proveedor_nombre
                """,
                pago,
            )

        for comision in im.build_comisiones_vendedores(comprobantes_clientes, pagos_clientes, vendedor_lookup, COMMISSION_RATE):
            cur.execute(
                """
                INSERT INTO comisiones_vendedores (
                  cod_vendedor, vendedor_nombre, periodo, base_cobrada,
                  porcentaje, comision, recibos
                )
                VALUES (
                  %(cod_vendedor)s, %(vendedor_nombre)s, %(periodo)s,
                  %(base_cobrada)s, %(porcentaje)s, %(comision)s, %(recibos)s
                )
                ON CONFLICT (cod_vendedor, periodo) DO UPDATE SET
                  vendedor_nombre=EXCLUDED.vendedor_nombre,
                  base_cobrada=EXCLUDED.base_cobrada,
                  porcentaje=EXCLUDED.porcentaje,
                  comision=EXCLUDED.comision,
                  recibos=EXCLUDED.recibos
                """,
                comision,
            )

        raw_report_counts = _sync_infomanager_report_rows(cur, im, desde, hasta)

        for presupuesto in im.sync_presupuestos(desde, hasta):
            cur.execute(
                """
                INSERT INTO presupuestos (
                  id, fecha, cod_cliente, cliente_nombre, cod_vendedor,
                  total, confirmado, fecha_conversion, venta_id
                )
                VALUES (
                  %(id)s, %(fecha)s, %(cod_cliente)s, %(cliente_nombre)s,
                  %(cod_vendedor)s, %(total)s, %(confirmado)s,
                  %(fecha_conversion)s, %(venta_id)s
                )
                ON CONFLICT (id) DO UPDATE SET
                  fecha=EXCLUDED.fecha,
                  cod_cliente=EXCLUDED.cod_cliente,
                  cliente_nombre=EXCLUDED.cliente_nombre,
                  cod_vendedor=EXCLUDED.cod_vendedor,
                  total=EXCLUDED.total,
                  confirmado=EXCLUDED.confirmado,
                  fecha_conversion=EXCLUDED.fecha_conversion,
                  venta_id=EXCLUDED.venta_id
                """,
                presupuesto,
            )

        # Enrich names in related tables from master lookups
        for cod, nombre in cliente_lookup.items():
            if nombre and not nombre.startswith("Cliente "):
                cur.execute(
                    "UPDATE cuentas_corrientes_clientes SET cliente_nombre = %s WHERE cliente_id = %s AND (cliente_nombre IS NULL OR cliente_nombre = '' OR cliente_nombre LIKE 'Cliente %%')",
                    (nombre, cod),
                )
                cur.execute(
                    "UPDATE presupuestos SET cliente_nombre = %s WHERE cod_cliente::text = %s AND (cliente_nombre IS NULL OR cliente_nombre = '' OR cliente_nombre LIKE 'Cliente %%')",
                    (nombre, cod),
                )
        for cod, nombre in proveedor_lookup.items():
            if nombre and not nombre.startswith("Proveedor "):
                cur.execute(
                    "UPDATE cuentas_corrientes_proveedores SET proveedor_nombre = %s WHERE proveedor_id = %s AND (proveedor_nombre IS NULL OR proveedor_nombre = '' OR proveedor_nombre LIKE 'Proveedor %%')",
                    (nombre, cod),
                )

        recibos = im.sync_recibos(desde, hasta)
        saldo_acum = 0.0
        for recibo in recibos:
            cur.execute(
                """
                INSERT INTO recibos (
                  id, fecha, cod_cliente, cliente_nombre, forma_pago,
                  importe, factura_id, tarjeta_numero, tarjeta_cupon
                )
                VALUES (
                  %(id)s, %(fecha)s, %(cod_cliente)s, %(cliente_nombre)s,
                  %(forma_pago)s, %(importe)s, %(factura_id)s,
                  %(tarjeta_numero)s, %(tarjeta_cupon)s
                )
                ON CONFLICT (id) DO UPDATE SET
                  fecha=EXCLUDED.fecha,
                  cod_cliente=EXCLUDED.cod_cliente,
                  cliente_nombre=EXCLUDED.cliente_nombre,
                  forma_pago=EXCLUDED.forma_pago,
                  importe=EXCLUDED.importe,
                  factura_id=EXCLUDED.factura_id
                """,
                recibo,
            )
            importe = _as_float(recibo.get("importe"))
            saldo_acum += importe
            cliente = recibo.get("cliente_nombre") or f"Cliente {recibo.get('cod_cliente', '')}"
            forma = recibo.get("forma_pago") or "efectivo"
            cur.execute(
                """
                INSERT INTO movimientos_caja (fecha, tipo, descripcion, importe, saldo_acumulado)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (fecha, tipo, descripcion, importe) DO UPDATE SET
                  saldo_acumulado=EXCLUDED.saldo_acumulado
                """,
                (
                    recibo.get("fecha"),
                    "cobro",
                    f"Recibo {recibo['id']} - {cliente} ({forma})",
                    importe,
                    round(saldo_acum, 2),
                ),
            )

        cur.execute(
            """
            UPDATE public.company_connectors
            SET sync_status='ok', last_sync_at=NOW(), sync_error=NULL
            WHERE id=%s
            """,
            (connector_id,),
        )
        conn.commit()
        return {
            "company_id": company_id,
            "connector_id": connector_id,
            "tenant_schema": tenant,
            "status": "success",
            "raw_reports": raw_report_counts,
        }
    except Exception as exc:
        conn.rollback()
        cur.execute(
            """
            UPDATE public.company_connectors
            SET sync_status='error', sync_error=%s
            WHERE id=%s
            """,
            (str(exc)[:500], connector_id),
        )
        conn.commit()
        raise self.retry(exc=exc, countdown=60)
    finally:
        cur.close()
        conn.close()


@celery_app.task(name="tasks.sync_infomanager.sync_all_companies")
def sync_all_companies():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, company_id
            FROM public.company_connectors
            WHERE connector_type='INFOMANAGER'
              AND sync_status <> 'running'
            """
        )
        connectors = cur.fetchall()
    finally:
        cur.close()
        conn.close()

    for connector_id, company_id in connectors:
        sync_company.delay(company_id, connector_id)

    return {"queued": len(connectors)}
