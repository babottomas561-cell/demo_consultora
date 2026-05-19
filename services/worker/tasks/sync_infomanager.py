from __future__ import annotations

import os
import hashlib
import json
from datetime import date, timedelta
from typing import Any

import psycopg2
from psycopg2.extras import Json, execute_values
from psycopg2 import sql

from connectors.infomanager import INFOMANAGER_REPORT_CATALOG, InfomanagerConnector, _as_int
from worker_app import celery_app


DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5433/demo_consultora")
COMMISSION_RATE = float(os.getenv("INFOMANAGER_COMMISSION_RATE", "0.03"))
RAW_REPORT_MAX_PAGES = int(os.getenv("INFOMANAGER_RAW_REPORT_MAX_PAGES", "500"))
HISTORICAL_START = date.fromisoformat(os.getenv("INFOMANAGER_HISTORICAL_START", "2010-01-01"))


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
        # Deduplicate by row_key within the batch to avoid PostgreSQL's
        # "ON CONFLICT DO UPDATE command cannot affect row a second time" error
        # when the upstream API returns duplicate rows in the same response.
        seen_keys: dict[str, tuple] = {}
        for index, row in enumerate(rows):
            rk = _report_row_key(report_key, row, index)
            seen_keys[rk] = (report_key, report["name"], rk, desde, hasta, Json(row))
        values = list(seen_keys.values())
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
            INSERT INTO clientes (
              external_id, nombre, cuit, email, cod_vendedor, habilitado,
              cod_zona, lista_precio, condicion_venta, cod_rubro_cliente
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (external_id) DO UPDATE SET
              nombre = CASE
                WHEN EXCLUDED.nombre <> '' AND EXCLUDED.nombre NOT LIKE 'Cliente %%'
                THEN EXCLUDED.nombre
                ELSE clientes.nombre
              END,
              cuit              = COALESCE(EXCLUDED.cuit, clientes.cuit),
              email             = COALESCE(EXCLUDED.email, clientes.email),
              cod_vendedor      = COALESCE(EXCLUDED.cod_vendedor, clientes.cod_vendedor),
              habilitado        = EXCLUDED.habilitado,
              cod_zona          = COALESCE(EXCLUDED.cod_zona, clientes.cod_zona),
              lista_precio      = COALESCE(EXCLUDED.lista_precio, clientes.lista_precio),
              condicion_venta   = COALESCE(EXCLUDED.condicion_venta, clientes.condicion_venta),
              cod_rubro_cliente = COALESCE(EXCLUDED.cod_rubro_cliente, clientes.cod_rubro_cliente)
            """,
            (
                cod, nombre,
                c.get("cuit") or None,
                c.get("email") or None,
                c.get("cod_vendedor"),
                c.get("habilitado", True),
                c.get("cod_zona"),
                c.get("lista_precio"),
                c.get("condicion_venta"),
                c.get("cod_rubro_cliente"),
            ),
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

        # --- Empresas master data ---
        empresas_raw = im.fetch_paginated("/api/v1/empresas", max_pages=1)
        for emp in empresas_raw:
            cod = int(emp.get("cod_empresa") or 1)
            cur.execute(
                """
                INSERT INTO empresas_infomanager (cod_empresa, nombre, cuit, direccion, email, habilitada)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (cod_empresa) DO UPDATE SET
                  nombre=EXCLUDED.nombre, cuit=EXCLUDED.cuit,
                  direccion=EXCLUDED.direccion, email=EXCLUDED.email,
                  habilitada=EXCLUDED.habilitada
                """,
                (
                    cod,
                    emp.get("nombre") or emp.get("nombre_1") or f"Empresa {cod}",
                    emp.get("cuit"),
                    emp.get("direccion"),
                    emp.get("email"),
                    str(emp.get("habilitada", "S")) in ("S", "1", "True", "true"),
                ),
            )

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
            nombre = p.get("nombre") or p.get("razon_social") or f"Proveedor {cod}"
            proveedor_lookup[cod] = nombre
            if cod and cod != "0":
                cur.execute(
                    """
                    INSERT INTO proveedores (cod_proveedor, nombre, cuit, habilitado)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (cod_proveedor) DO UPDATE SET
                      nombre = EXCLUDED.nombre,
                      cuit = EXCLUDED.cuit,
                      habilitado = EXCLUDED.habilitado,
                      synced_at = NOW()
                    """,
                    (cod, nombre, p.get("cuit") or "", p.get("habilitado", True)),
                )

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

        for pdv in im.sync_puntos_de_venta():
            cur.execute(
                """
                INSERT INTO puntos_de_venta (id, nombre, cod_empresa, habilitado)
                VALUES (%(id)s, %(nombre)s, %(cod_empresa)s, %(habilitado)s)
                ON CONFLICT (id) DO UPDATE SET
                  nombre=EXCLUDED.nombre,
                  cod_empresa=EXCLUDED.cod_empresa,
                  habilitado=EXCLUDED.habilitado
                """,
                pdv,
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

        desde = HISTORICAL_START
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
                  cod_deposito, cod_rubro, cod_lista_precios, precio_compra_actual, descuento_porc
                )
                VALUES (
                  %(fecha)s, %(cliente_id)s, %(cliente_nombre)s, %(producto_id)s,
                  %(producto_nombre)s, %(cantidad)s, %(precio_unitario)s, %(total)s,
                  %(tipo_comprobante)s, %(tipo_factura)s, %(punto_de_venta)s,
                  %(cod_vendedor)s, %(cod_empresa)s, %(tag)s,
                  %(condicion_venta_tipo)s, %(neto)s, %(iva_importe)s,
                  %(anulada)s, %(cod_deposito)s, %(cod_rubro)s, %(cod_lista_precios)s,
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
                  cod_lista_precios=EXCLUDED.cod_lista_precios,
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
            pago_importe = _as_float(pago.get("importe"))
            if pago_importe and pago_importe > 0:
                prov_nombre = pago.get("proveedor_nombre") or f"Proveedor {pago.get('proveedor_id', '')}"
                pago_forma = pago.get("forma_pago") or "efectivo"
                cur.execute(
                    """
                    INSERT INTO movimientos_caja (fecha, tipo, descripcion, importe, saldo_acumulado)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (fecha, tipo, descripcion, importe) DO NOTHING
                    """,
                    (
                        pago.get("fecha"),
                        "egreso",
                        f"Pago {prov_nombre} ({pago_forma})",
                        -abs(pago_importe),
                        0,
                    ),
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
                cur.execute(
                    "UPDATE facturas_compra SET proveedor = %s WHERE cod_proveedor::text = %s AND (proveedor IS NULL OR proveedor = '' OR proveedor LIKE 'Proveedor %%')",
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

        # --- Infomanager-specific tables (facturas, items de listas) ---
        try:
            desde_fa = HISTORICAL_START
            hasta_fa = date.today()

            listas = im.obtener_listas_precios()
            _upsert_listas_precios(cur, listas)
            items_count = 0
            for lista in listas:
                if not _as_bool(lista.get("habilitado"), True):
                    continue
                cod_lista = _as_int(lista.get("cod_lista"))
                if not cod_lista:
                    continue
                items = im.obtener_items_lista_precios(cod_lista, desde_fa, hasta_fa)
                items_count += _upsert_items_lista(cur, items, cod_lista)
            print(f"[sync_company] items_listas={items_count}")

            fv = im.obtener_facturas_venta(desde_fa, hasta_fa)
            n_fv = _upsert_facturas_venta(cur, fv)
            print(f"[sync_company] facturas_venta={n_fv}")

            fc = im.obtener_facturas_compra(desde_fa, hasta_fa)
            n_fc = _upsert_facturas_compra(cur, fc)
            print(f"[sync_company] facturas_compra={n_fc}")

            fcr = im.obtener_facturas_con_recibos(desde_fa, hasta_fa)
            n_fcr = _upsert_facturas_con_recibos(cur, fcr)
            print(f"[sync_company] facturas_con_recibos={n_fcr}")

            mc = im.obtener_movimientos_contables(desde_fa, hasta_fa, "0", 0)
            n_mc = _upsert_movimientos_contables(cur, mc)
            print(f"[sync_company] movimientos_contables={n_mc}")
        except Exception as fa_exc:
            print(f"[sync_company] facturas sync skipped: {fa_exc}")

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


def _as_bool(value: Any, default: bool = False) -> bool:
    if value in (None, ""):
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().upper() not in ("0", "N", "FALSE", "NO")


def _upsert_empresas(cur, rows: list[dict]) -> None:
    for r in rows:
        cur.execute(
            """
            INSERT INTO empresas_infomanager (
              cod_empresa, nombre, nombre_1, cuit, direccion, email,
              telefonos, categoria_iva, habilitada, cod_deposito_default
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (cod_empresa) DO UPDATE SET
              nombre=EXCLUDED.nombre, nombre_1=EXCLUDED.nombre_1,
              cuit=EXCLUDED.cuit, direccion=EXCLUDED.direccion,
              email=EXCLUDED.email, telefonos=EXCLUDED.telefonos,
              categoria_iva=EXCLUDED.categoria_iva,
              habilitada=EXCLUDED.habilitada,
              cod_deposito_default=EXCLUDED.cod_deposito_default
            """,
            (
                _as_int(r.get("cod_empresa")),
                r.get("nombre") or "",
                r.get("nombre_1"),
                r.get("cuit"),
                r.get("direccion"),
                r.get("email"),
                r.get("telefonos"),
                r.get("categoria_iva"),
                _as_bool(r.get("habilitada"), True),
                _as_int(r.get("cod_deposito")) or None,
            ),
        )


def _upsert_cotizaciones(cur, im, fecha_desde, fecha_hasta) -> int:
    rows = im.sync_cotizaciones(fecha_desde, fecha_hasta)
    for r in rows:
        cur.execute(
            """
            INSERT INTO cotizaciones (fecha, moneda, valor)
            VALUES (%s, %s, %s)
            ON CONFLICT (fecha, moneda) DO UPDATE SET valor = EXCLUDED.valor
            """,
            (r["fecha"], r["moneda"], r["valor"]),
        )
    return len(rows)


def _upsert_listas_precios(cur, rows: list[dict]) -> None:
    for r in rows:
        cur.execute(
            """
            INSERT INTO listas_precios (cod_lista, descripcion, aplica_a, cod_empresa, habilitado)
            VALUES (%s,%s,%s,%s,%s)
            ON CONFLICT (cod_lista) DO UPDATE SET
              descripcion=EXCLUDED.descripcion, aplica_a=EXCLUDED.aplica_a,
              habilitado=EXCLUDED.habilitado
            """,
            (
                _as_int(r.get("cod_lista")),
                r.get("descripcion") or "",
                r.get("aplica_a"),
                _as_int(r.get("cod_empresa")) or None,
                _as_bool(r.get("habilitado"), True),
            ),
        )


def _upsert_items_lista(cur, items: list[dict], cod_lista: int) -> int:
    from psycopg2.extras import execute_values
    values = []
    for r in items:
        values.append((
            cod_lista,
            _as_int(r.get("cod_articulo")),
            r.get("art_descripcion"),
            _as_float(r.get("art_precio_compra")),
            _as_float(r.get("art_precio_venta")),
            _as_float(r.get("art_iva")),
            _as_float(r.get("lista_porcentaje")),
            _as_float(r.get("lista_precio_sugerido")),
            _as_float(r.get("lista_precio_base")),
            _as_float(r.get("lista_descuento")),
            _as_float(r.get("lista_precio_con_iva")),
            _as_float(r.get("lista_precio_venta")),
            _as_float(r.get("lista_cotizacion")),
            r.get("fecha_actualiz"),
        ))
    if not values:
        return 0
    seen: dict = {}
    for v in values:
        seen[(v[0], v[1])] = v
    values = list(seen.values())
    execute_values(
        cur,
        """
        INSERT INTO items_listas_precios (
          cod_lista, cod_articulo, art_descripcion,
          art_precio_compra, art_precio_venta, art_iva,
          lista_porcentaje, lista_precio_sugerido, lista_precio_base,
          lista_descuento, lista_precio_con_iva, lista_precio_venta,
          lista_cotizacion, fecha_actualizacion, synced_at
        ) VALUES %s
        ON CONFLICT (cod_lista, cod_articulo) DO UPDATE SET
          art_descripcion=EXCLUDED.art_descripcion,
          art_precio_compra=EXCLUDED.art_precio_compra,
          art_precio_venta=EXCLUDED.art_precio_venta,
          art_iva=EXCLUDED.art_iva,
          lista_porcentaje=EXCLUDED.lista_porcentaje,
          lista_precio_sugerido=EXCLUDED.lista_precio_sugerido,
          lista_precio_base=EXCLUDED.lista_precio_base,
          lista_descuento=EXCLUDED.lista_descuento,
          lista_precio_con_iva=EXCLUDED.lista_precio_con_iva,
          lista_precio_venta=EXCLUDED.lista_precio_venta,
          lista_cotizacion=EXCLUDED.lista_cotizacion,
          fecha_actualizacion=EXCLUDED.fecha_actualizacion,
          synced_at=NOW()
        """,
        values,
        template="(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())",
        page_size=500,
    )
    return len(values)


def _replace_snapshot(cur, table: str, rows: list[dict], insert_fn) -> int:
    cur.execute(f"TRUNCATE TABLE {table}")
    return insert_fn(cur, rows)


def _insert_saldos_clientes(cur, rows: list[dict]) -> int:
    from psycopg2.extras import execute_values
    values = []
    for r in rows:
        values.append((
            _as_int(r.get("cod_cliente")),
            r.get("nombre"),
            r.get("fecha"),
            _as_int(r.get("dias_deuda")),
            _as_float(r.get("tot_entrada")),
            _as_float(r.get("tot_salida")),
            _as_float(r.get("tot_saldo")),
            _as_int(r.get("color")),
            _as_float(r.get("prevision")),
            r.get("cod_cuenta"),
            r.get("cta_descripcion"),
        ))
    if not values:
        return 0
    execute_values(
        cur,
        """
        INSERT INTO saldos_clientes (
          cod_cliente, nombre, fecha, dias_deuda,
          tot_entrada, tot_salida, tot_saldo, color,
          prevision, cod_cuenta, cta_descripcion, snapshot_at
        ) VALUES %s
        """,
        values,
        template="(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())",
        page_size=1000,
    )
    return len(values)


def _insert_comprobantes_pendientes(cur, rows: list[dict]) -> int:
    from psycopg2.extras import execute_values
    values = []
    for r in rows:
        values.append((
            _as_int(r.get("id")),
            r.get("tipo_comprobante"),
            _as_int(r.get("cod_cliente")) or None,
            r.get("nombre"),
            _as_int(r.get("cod_empresa")) or None,
            _as_int(r.get("cod_vendedor")) or None,
            str(r.get("punto_de_venta") or ""),
            str(r.get("numero") or ""),
            _as_float(r.get("importe_factura")),
            _as_float(r.get("importe_pagado")),
            _as_float(r.get("saldo")),
            r.get("fecha_factura"),
            _as_int(r.get("dias_deuda")),
            _as_int(r.get("color")),
            r.get("moneda_fa"),
            r.get("detalle"),
        ))
    if not values:
        return 0
    execute_values(
        cur,
        """
        INSERT INTO comprobantes_pendientes_clientes (
          comprobante_id, tipo_comprobante, cod_cliente, nombre,
          cod_empresa, cod_vendedor, punto_de_venta, numero,
          importe_factura, importe_pagado, saldo,
          fecha_factura, dias_deuda, color, moneda_fa, detalle, snapshot_at
        ) VALUES %s
        """,
        values,
        template="(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())",
        page_size=500,
    )
    return len(values)


def _insert_stock_disponible(cur, rows: list[dict]) -> int:
    from psycopg2.extras import execute_values
    values = []
    for r in rows:
        values.append((
            _as_int(r.get("cod_articulo")),
            r.get("descripcion"),
            _as_int(r.get("cod_deposito")) or None,
            _as_float(r.get("stock_entradas")),
            _as_float(r.get("stock_salidas")),
            _as_float(r.get("compras")),
            _as_float(r.get("ventas")),
            _as_float(r.get("existencia")),
            _as_float(r.get("existencia_anterior")),
            _as_float(r.get("precio_compra")),
            _as_float(r.get("precio_venta")),
            _as_float(r.get("pto_de_reposicion")),
            _as_int(r.get("cod_rubro")) or None,
            r.get("rubro"),
            _as_int(r.get("cod_subrubro")) or None,
            r.get("subrubro"),
            r.get("proveedor"),
            _as_int(r.get("habilitado")),
        ))
    if not values:
        return 0
    execute_values(
        cur,
        """
        INSERT INTO stock_disponible (
          cod_articulo, descripcion, cod_deposito,
          stock_entradas, stock_salidas, compras, ventas,
          existencia, existencia_anterior,
          precio_compra, precio_venta, pto_de_reposicion,
          cod_rubro, rubro, cod_subrubro, subrubro,
          proveedor, habilitado, snapshot_at
        ) VALUES %s
        """,
        values,
        template="(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())",
        page_size=500,
    )
    return len(values)


def _upsert_facturas_venta(cur, rows: list[dict]) -> int:
    from psycopg2.extras import execute_values
    values = []
    for r in rows:
        values.append((
            _as_int(r.get("fa_id")),
            r.get("tipo_comprobante"),
            r.get("tipo_factura"),
            _as_int(r.get("fa_cod_empresa")) or None,
            r.get("fa_fecha"),
            r.get("fa_cc"),
            _as_int(r.get("fa_pto_vta")) or None,
            r.get("fa_nro"),
            r.get("fa_moneda"),
            _as_float(r.get("fa_cotiz")),
            _as_int(r.get("cod_cliente")) or None,
            _as_int(r.get("cod_vendedor")) or None,
            _as_float(r.get("fa_total")),
            _as_float(r.get("fa_total_moneda_local")),
            r.get("primer_fec_vto"),
            r.get("ult_fec_vto"),
            _as_int(r.get("vto_cant_cuotas")),
            _as_float(r.get("vto_importe")),
            _as_float(r.get("rc_imp_pagado")),
            _as_float(r.get("saldo_fa")),
            r.get("ultimo_recibo"),
            str(r.get("remitos_asociados") or ""),
        ))
    if not values:
        return 0
    seen: dict = {}
    for v in values:
        seen[v[0]] = v
    values = list(seen.values())
    execute_values(
        cur,
        """
        INSERT INTO facturas_venta (
          fa_id, tipo_comprobante, tipo_factura, fa_cod_empresa,
          fa_fecha, fa_cc, fa_pto_vta, fa_nro, fa_moneda, fa_cotiz,
          cod_cliente, cod_vendedor, fa_total, fa_total_moneda_local,
          primer_fec_vto, ult_fec_vto, vto_cant_cuotas, vto_importe,
          rc_imp_pagado, saldo_fa, ultimo_recibo, remitos_asociados, synced_at
        ) VALUES %s
        ON CONFLICT (fa_id) DO UPDATE SET
          rc_imp_pagado=EXCLUDED.rc_imp_pagado,
          saldo_fa=EXCLUDED.saldo_fa,
          synced_at=NOW()
        """,
        values,
        template="(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())",
        page_size=500,
    )
    return len(values)


def _upsert_facturas_compra(cur, rows: list[dict]) -> int:
    from psycopg2.extras import execute_values
    values = []
    for r in rows:
        # API /reportes/facturas_compras returns fa_id/fa_fecha/fa_total/nombre fields
        fa_id = _as_int(r.get("fa_id") or r.get("id"))
        if not fa_id:
            continue
        values.append((
            fa_id,
            r.get("fa_fecha") or r.get("fecha"),
            None,                                         # fecha_comprobante not in response
            r.get("fa_cc") or r.get("tipo_comprobante"),  # fa_cc = tipo (e.g. "S")
            None,                                         # tipo_factura not in response
            str(r.get("fa_nro") or r.get("numero") or ""),
            _as_int(r.get("fa_pto_vta") or r.get("punto_de_venta")) or None,
            r.get("moneda"),
            None,                                         # cotizacion not in response
            _as_float(r.get("fa_total") or r.get("importe_total")),
            None,                                         # importe_iva not in response
            _as_int(r.get("cod_proveedor")) or None,
            r.get("nombre") or r.get("proveedor"),
            _as_int(r.get("fa_cod_empresa") or r.get("cod_empresa")) or None,
            r.get("fa_cc") or r.get("tag"),
            False,
            None,
            "",
            _as_int(r.get("nro_ultima_OP") or r.get("id_orden_de_compra")) or None,
        ))
    if not values:
        return 0
    seen: dict = {}
    for v in values:
        seen[v[0]] = v
    values = list(seen.values())
    execute_values(
        cur,
        """
        INSERT INTO facturas_compra (
          id, fecha, fecha_comprobante, tipo_comprobante, tipo_factura,
          numero, punto_de_venta, moneda, cotizacion, importe_total,
          importe_iva, cod_proveedor, proveedor, cod_empresa, tag,
          anulada, cod_deposito, nro_cai, id_orden_de_compra, synced_at
        ) VALUES %s
        ON CONFLICT (id) DO UPDATE SET
          importe_total=EXCLUDED.importe_total, synced_at=NOW()
        """,
        values,
        template="(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())",
        page_size=500,
    )
    return len(values)


def _upsert_facturas_con_recibos(cur, rows: list[dict]) -> int:
    from psycopg2.extras import execute_values
    values = []
    for r in rows:
        fa_id = _as_int(r.get("fa_id"))
        rc_id = _as_int(r.get("rc_id")) or None
        if not fa_id:
            continue
        values.append((
            fa_id,
            r.get("tipo_comp"),
            _as_int(r.get("fa_cod_empresa")) or None,
            r.get("fa_fecha"),
            r.get("fa_cc"),
            _as_int(r.get("fa_pto_vta")) or None,
            r.get("fa_nro"),
            r.get("fa_moneda"),
            _as_float(r.get("fa_cotiz")),
            _as_int(r.get("cod_cliente")) or None,
            _as_float(r.get("fa_total")),
            _as_float(r.get("fa_total_moneda_local")),
            rc_id,
            r.get("rc_fecha"),
            r.get("rc_nro"),
            r.get("rc_moneda"),
            _as_float(r.get("rc_cotiz")),
            _as_float(r.get("imp_pag_moneda_local")),
            r.get("cond_pago"),
            _as_float(r.get("importe")),
            _as_int(r.get("cod_banco")) or None,
            r.get("cheque_numero"),
            r.get("cheque_fec_pago"),
            _as_float(r.get("importe_retencion")),
            r.get("primer_fec_vto"),
            r.get("ult_fec_vto"),
        ))
    if not values:
        return 0
    seen: dict = {}
    for v in values:
        seen[(v[0], v[12])] = v
    values = list(seen.values())
    execute_values(
        cur,
        """
        INSERT INTO facturas_con_recibos (
          fa_id, tipo_comp, fa_cod_empresa, fa_fecha, fa_cc,
          fa_pto_vta, fa_nro, fa_moneda, fa_cotiz, cod_cliente,
          fa_total, fa_total_moneda_local, rc_id, rc_fecha, rc_nro,
          rc_moneda, rc_cotiz, imp_pag_moneda_local, cond_pago, importe,
          cod_banco, cheque_numero, cheque_fec_pago, importe_retencion,
          primer_fec_vto, ult_fec_vto, synced_at
        ) VALUES %s
        ON CONFLICT (fa_id, rc_id) DO UPDATE SET
          imp_pag_moneda_local=EXCLUDED.imp_pag_moneda_local,
          synced_at=NOW()
        """,
        values,
        template="(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())",
        page_size=500,
    )
    return len(values)


def _upsert_movimientos_contables(cur, rows: list[dict]) -> int:
    from psycopg2.extras import execute_values
    values = []
    seen: set = set()
    for r in rows:
        row_id = str(r.get("id") or "")
        if not row_id or row_id in seen:
            continue
        seen.add(row_id)
        values.append((
            row_id,
            r.get("fecha"),
            _as_int(r.get("cuenta")),
            r.get("plan_descripcion"),
            _as_float(r.get("debe")),
            _as_float(r.get("haber")),
            r.get("tipo_comprobante"),
            r.get("numero"),
            r.get("descripcion") or r.get("concepto"),
            _as_int(r.get("cod_empresa")),
            r.get("tag"),
            _as_int(r.get("cod_unidad_negocio")),
            r.get("movimiento"),
        ))
    if not values:
        return 0
    execute_values(
        cur,
        """
        INSERT INTO movimientos_contables (
          id, fecha, cuenta, plan_descripcion, debe, haber,
          tipo_comprobante, numero, descripcion, cod_empresa,
          tag, cod_unidad_negocio, movimiento
        ) VALUES %s
        ON CONFLICT (id) DO UPDATE SET
          debe=EXCLUDED.debe, haber=EXCLUDED.haber,
          plan_descripcion=EXCLUDED.plan_descripcion,
          descripcion=EXCLUDED.descripcion
        """,
        values,
        template="(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        page_size=500,
    )
    return len(values)


@celery_app.task(name="tasks.sync_infomanager.sync_incremental")
def sync_incremental(tenant_schema: str, erp_config: dict, connector_id: int = None) -> dict:
    """Fast incremental sync (~30 s): last 2 days of invoices + full snapshots."""
    import time
    t0 = time.time()
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    counts: dict[str, int] = {}
    try:
        if connector_id:
            cur.execute(
                "UPDATE public.company_connectors SET sync_status='running' WHERE id = %s",
                (connector_id,),
            )
            conn.commit()

        client_id = erp_config["client_id"]
        client_secret = erp_config["client_secret"]
        base_url = erp_config.get("base_url")
        im = InfomanagerConnector(client_id, client_secret, base_url)
        im.authenticate()

        _set_tenant_search_path(cur, tenant_schema)

        desde_inc = date.today() - timedelta(days=2)
        hasta_inc = date.today()

        # Catalogs (always refresh)
        _upsert_empresas(cur, im.obtener_empresas())
        counts["empresas"] = 1

        for dep in im.obtener_depositos():
            cur.execute(
                """
                INSERT INTO depositos (cod_deposito, nombre, habilitado)
                VALUES (%s,%s,%s)
                ON CONFLICT (cod_deposito) DO UPDATE SET nombre=EXCLUDED.nombre
                """,
                (
                    _as_int(dep.get("cod_deposito")),
                    dep.get("descripcion") or dep.get("nombre") or "",
                    True,
                ),
            )
        counts["depositos"] = 1

        for v in im.obtener_vendedores():
            cur.execute(
                """
                INSERT INTO vendedores (cod_vendedor, nombre, habilitado)
                VALUES (%s,%s,%s)
                ON CONFLICT (cod_vendedor) DO UPDATE SET nombre=EXCLUDED.nombre
                """,
                (_as_int(v.get("cod_vendedor")), v.get("nombre") or "", v.get("inactivo", "N") != "S"),
            )
        counts["vendedores"] = 1

        for pdv in im.sync_puntos_de_venta():
            cur.execute(
                """
                INSERT INTO puntos_de_venta (id, nombre, cod_empresa, habilitado)
                VALUES (%(id)s, %(nombre)s, %(cod_empresa)s, %(habilitado)s)
                ON CONFLICT (id) DO UPDATE SET
                  nombre=EXCLUDED.nombre,
                  cod_empresa=EXCLUDED.cod_empresa,
                  habilitado=EXCLUDED.habilitado
                """,
                pdv,
            )
        counts["puntos_de_venta"] = 1

        counts["cotizaciones"] = _upsert_cotizaciones(cur, im, desde_inc, hasta_inc)

        _upsert_listas_precios(cur, im.obtener_listas_precios())
        counts["listas_precios"] = 1

        # Incremental invoices
        fv = im.obtener_facturas_venta(desde_inc, hasta_inc)
        counts["facturas_venta"] = _upsert_facturas_venta(cur, fv)

        fc = im.obtener_facturas_compra(desde_inc, hasta_inc)
        counts["facturas_compra"] = _upsert_facturas_compra(cur, fc)

        fcr = im.obtener_facturas_con_recibos(desde_inc, hasta_inc)
        counts["facturas_con_recibos"] = _upsert_facturas_con_recibos(cur, fcr)

        # Full snapshots — truncate + insert
        saldos = im.obtener_saldos_clientes()
        cur.execute("TRUNCATE TABLE saldos_clientes")
        counts["saldos_clientes"] = _insert_saldos_clientes(cur, saldos)

        pendientes = im.obtener_comprobantes_pendientes()
        cur.execute("TRUNCATE TABLE comprobantes_pendientes_clientes")
        counts["comprobantes_pendientes_clientes"] = _insert_comprobantes_pendientes(cur, pendientes)

        stock = im.obtener_stock_disponible()
        cur.execute("TRUNCATE TABLE stock_disponible")
        counts["stock_disponible"] = _insert_stock_disponible(cur, stock)

        if connector_id:
            cur.execute(
                "UPDATE public.company_connectors"
                " SET sync_status='ok', last_sync_at=NOW(), sync_error=NULL"
                " WHERE id = %s",
                (connector_id,),
            )

        conn.commit()
        duracion = round(time.time() - t0, 2)
        return {
            "tenant_schema": tenant_schema,
            "status": "ok",
            "tablas": counts,
            "duracion_segundos": duracion,
        }
    except Exception as exc:
        conn.rollback()
        if connector_id:
            try:
                cur.execute(
                    "UPDATE public.company_connectors"
                    " SET sync_status='error', sync_error=%s WHERE id = %s",
                    (str(exc)[:500], connector_id),
                )
                conn.commit()
            except Exception:
                pass
        raise
    finally:
        cur.close()
        conn.close()


@celery_app.task(name="tasks.sync_infomanager.sync_completo")
def sync_completo(tenant_schema: str, erp_config: dict, connector_id: int = None) -> dict:
    """Full sync once a day: all history from HISTORICAL_START + price lists + accounting."""
    import time
    t0 = time.time()
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    counts: dict[str, int] = {}
    try:
        client_id = erp_config["client_id"]
        client_secret = erp_config["client_secret"]
        base_url = erp_config.get("base_url")
        im = InfomanagerConnector(client_id, client_secret, base_url)
        im.authenticate()

        _set_tenant_search_path(cur, tenant_schema)

        desde = HISTORICAL_START
        hasta = date.today()

        _upsert_empresas(cur, im.obtener_empresas())

        for dep in im.obtener_depositos():
            cur.execute(
                """
                INSERT INTO depositos (cod_deposito, nombre, habilitado)
                VALUES (%s,%s,%s)
                ON CONFLICT (cod_deposito) DO UPDATE SET nombre=EXCLUDED.nombre
                """,
                (
                    _as_int(dep.get("cod_deposito")),
                    dep.get("descripcion") or dep.get("nombre") or "",
                    True,
                ),
            )

        for pdv in im.sync_puntos_de_venta():
            cur.execute(
                """
                INSERT INTO puntos_de_venta (id, nombre, cod_empresa, habilitado)
                VALUES (%(id)s, %(nombre)s, %(cod_empresa)s, %(habilitado)s)
                ON CONFLICT (id) DO UPDATE SET
                  nombre=EXCLUDED.nombre,
                  cod_empresa=EXCLUDED.cod_empresa,
                  habilitado=EXCLUDED.habilitado
                """,
                pdv,
            )
        counts["puntos_de_venta"] = 1

        counts["cotizaciones"] = _upsert_cotizaciones(cur, im, desde, hasta)

        listas = im.obtener_listas_precios()
        _upsert_listas_precios(cur, listas)
        counts["listas_precios"] = len(listas)

        # Items for every enabled price list
        items_count = 0
        for lista in listas:
            if not _as_bool(lista.get("habilitado"), True):
                continue
            cod_lista = _as_int(lista.get("cod_lista"))
            if not cod_lista:
                continue
            items = im.obtener_items_lista_precios(cod_lista, desde, hasta)
            items_count += _upsert_items_lista(cur, items, cod_lista)
        counts["items_listas_precios"] = items_count

        fv = im.obtener_facturas_venta(desde, hasta)
        counts["facturas_venta"] = _upsert_facturas_venta(cur, fv)

        fc = im.obtener_facturas_compra(desde, hasta)
        counts["facturas_compra"] = _upsert_facturas_compra(cur, fc)

        fcr = im.obtener_facturas_con_recibos(desde, hasta)
        counts["facturas_con_recibos"] = _upsert_facturas_con_recibos(cur, fcr)

        mc = im.obtener_movimientos_contables(desde, hasta, "0", 0)
        counts["movimientos_contables"] = _upsert_movimientos_contables(cur, mc)

        saldos = im.obtener_saldos_clientes()
        cur.execute("TRUNCATE TABLE saldos_clientes")
        counts["saldos_clientes"] = _insert_saldos_clientes(cur, saldos)

        pendientes = im.obtener_comprobantes_pendientes()
        cur.execute("TRUNCATE TABLE comprobantes_pendientes_clientes")
        counts["comprobantes_pendientes_clientes"] = _insert_comprobantes_pendientes(cur, pendientes)

        stock = im.obtener_stock_disponible()
        cur.execute("TRUNCATE TABLE stock_disponible")
        counts["stock_disponible"] = _insert_stock_disponible(cur, stock)

        conn.commit()

        # Update connector status if connector_id provided
        if connector_id:
            cur2 = conn.cursor()
            cur2.execute(
                "UPDATE public.company_connectors SET sync_status='ok', last_sync_at=NOW() WHERE id=%s",
                (connector_id,),
            )
            conn.commit()
            cur2.close()

        elapsed = round(time.time() - t0, 2)
        print(f"[sync_completo] {tenant_schema} OK in {elapsed}s — {counts}")
        return {
            "tenant_schema": tenant_schema,
            "status": "ok",
            "tablas": counts,
            "duracion_segundos": elapsed,
        }
    except Exception as exc:
        conn.rollback()
        if connector_id:
            try:
                cur2 = conn.cursor()
                cur2.execute(
                    "UPDATE public.company_connectors SET sync_status='error', sync_error=%s WHERE id=%s",
                    (str(exc)[:500], connector_id),
                )
                conn.commit()
                cur2.close()
            except Exception:
                pass
        print(f"[sync_completo] {tenant_schema} FAILED: {exc}")
        raise
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
