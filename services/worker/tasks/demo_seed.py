import os
import datetime
import logging
import traceback
from worker_app import celery_app
from connectors.infomanager_demo import InfomanagerDemoConector
from sqlalchemy import create_engine, text, table, column
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5433/demo_consultora")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
logger = logging.getLogger(__name__)

def _insert_chunk(session, tenant_schema: str, table_name: str, data: list, conflict_cols: list = None):
    if not data:
        return 0, 0

    if conflict_cols:
        deduped = {}
        for row in data:
            key = tuple(row.get(col) for col in conflict_cols)
            deduped[key] = row
        data = list(deduped.values())

    session.execute(text(f'SET search_path TO "{tenant_schema}"'))

    table_obj = table(table_name, *[column(k) for k in data[0].keys()])
    stmt = insert(table_obj).values(data)

    if conflict_cols:
        update_cols = {
            key: getattr(stmt.excluded, key)
            for key in data[0].keys()
            if key not in conflict_cols
        }
        if update_cols:
            stmt = stmt.on_conflict_do_update(index_elements=conflict_cols, set_=update_cols)
        else:
            stmt = stmt.on_conflict_do_nothing(index_elements=conflict_cols)

    result = session.execute(stmt)
    rows_inserted = result.rowcount

    return rows_inserted, len(data) - rows_inserted

def _insert_ventas_chunk(session, tenant_schema: str, ventas):
    if not ventas:
        return 0, 0

    session.execute(text(f'SET search_path TO "{tenant_schema}"'))

    ventas_data = []
    clientes_data = {}

    for v in ventas:
        clientes_data[v.cliente_id] = {
            "external_id": v.cliente_id,
            "nombre": v.cliente_nombre
        }
        ventas_data.append({
            "fecha": v.fecha,
            "cliente_id": v.cliente_id,
            "cliente_nombre": v.cliente_nombre,
            "producto_id": v.producto_id,
            "producto_nombre": v.producto_nombre,
            "cantidad": v.cantidad,
            "precio_unitario": v.precio_unitario,
            "total": v.total,
            "total_real": None,
            "tipo_comprobante": getattr(v, "tipo_comprobante", "FA"),
            "tipo_factura": getattr(v, "tipo_factura", None),
            "punto_de_venta": getattr(v, "punto_de_venta", None),
            "cod_vendedor": getattr(v, "cod_vendedor", None),
            "cod_empresa": getattr(v, "cod_empresa", 1),
            "tag": getattr(v, "tag", "S"),
            "condicion_venta_tipo": getattr(v, "condicion_venta_tipo", None),
            "neto": getattr(v, "neto", None),
            "iva_importe": getattr(v, "iva_importe", None),
            "anulada": getattr(v, "anulada", "N"),
            "cod_deposito": getattr(v, "cod_deposito", None),
            "cod_rubro": getattr(v, "cod_rubro", None),
            "cod_subrubro": getattr(v, "cod_subrubro", None),
            "precio_compra_actual": getattr(v, "precio_compra_actual", None),
            "descuento_porc": getattr(v, "descuento_porc", 0),
        })

    if clientes_data:
        clientes_table = table("clientes", column("external_id"), column("nombre"))
        stmt_clientes = insert(clientes_table).values(list(clientes_data.values()))
        stmt_clientes = stmt_clientes.on_conflict_do_update(
            index_elements=['external_id'],
            set_={"nombre": stmt_clientes.excluded.nombre},
        )
        session.execute(stmt_clientes)

    rows_inserted, failed = _insert_chunk(session, tenant_schema, "ventas", ventas_data, ['fecha', 'cliente_id', 'producto_id', 'tipo_comprobante'])
    return rows_inserted, failed

def _seed_infomanager_tables(session, tenant_schema: str):
    """Populate InfoManager-specific tables from already-seeded base data."""
    session.execute(text(f'SET search_path TO "{tenant_schema}"'))

    # Product ID → cod_articulo mapping (string key → integer)
    PROD_MAP_SQL = """(VALUES
        ('REM001',1001),('REM002',1002),('PAN001',2001),('PAN002',2002),
        ('VES001',3001),('VES002',3002),('CAM001',4001),('CAM002',4002),
        ('BUZ001',5001),('CAL001',6001),('CAL002',6002),('CAL003',6003),
        ('ACC001',7001),('ACC002',7002)
    ) AS pm(prod_id, cod_articulo)"""

    # 1. empresas_infomanager
    session.execute(text("""
        INSERT INTO empresas_infomanager
            (cod_empresa, nombre, nombre_1, cuit, categoria_iva, habilitada, cod_deposito_default)
        VALUES
            (1, 'Moda & Style SRL', 'Moda Style', '30-71234567-8', 'RI', true, 1),
            (2, 'Indumentaria Sur SA', 'Indumentaria Sur', '30-68765432-1', 'RI', true, 2)
        ON CONFLICT (cod_empresa) DO UPDATE
            SET nombre = EXCLUDED.nombre, habilitada = EXCLUDED.habilitada
    """))

    # 2. listas_precios
    session.execute(text("""
        INSERT INTO listas_precios (cod_lista, descripcion, aplica_a, cod_empresa, habilitado)
        VALUES
            (1, 'Minorista', 'minoristas', 1, true),
            (2, 'Mayorista', 'mayoristas', 1, true),
            (3, 'Especial VIP', 'especial', 1, true)
        ON CONFLICT (cod_lista) DO UPDATE SET descripcion = EXCLUDED.descripcion
    """))

    # 3. stock_disponible — from stock table joined with ventas/compras via product map
    session.execute(text("DELETE FROM stock_disponible"))
    session.execute(text(f"""
        INSERT INTO stock_disponible
            (cod_articulo, descripcion, cod_deposito,
             stock_entradas, stock_salidas, compras, ventas,
             existencia, existencia_anterior,
             precio_compra, precio_venta,
             pto_de_reposicion, cod_rubro, rubro, cod_subrubro, subrubro,
             proveedor, habilitado)
        SELECT
            st.cod_articulo,
            v_agg.producto_nombre AS descripcion,
            st.cod_deposito,
            COALESCE(c_agg.total_compras_qty, 0) AS stock_entradas,
            COALESCE(v_agg.total_ventas_qty, 0) AS stock_salidas,
            COALESCE(c_agg.total_compras_val, 0) AS compras,
            COALESCE(v_agg.total_ventas_val, 0) AS ventas,
            st.cantidad AS existencia,
            ROUND(st.cantidad * 1.1) AS existencia_anterior,
            st.precio_compra_actual AS precio_compra,
            ROUND(st.precio_compra_actual / 0.55, 2) AS precio_venta,
            st.stock_minimo AS pto_de_reposicion,
            v_agg.cod_rubro,
            r.nombre AS rubro,
            v_agg.cod_subrubro,
            sr.nombre AS subrubro,
            NULL AS proveedor,
            1 AS habilitado
        FROM stock st
        JOIN {PROD_MAP_SQL} ON pm.cod_articulo = st.cod_articulo
        LEFT JOIN (
            SELECT
                pm2.cod_articulo,
                MAX(v.producto_nombre) AS producto_nombre,
                MAX(v.cod_rubro) AS cod_rubro,
                MAX(v.cod_subrubro) AS cod_subrubro,
                SUM(CASE WHEN v.cantidad > 0 THEN v.cantidad ELSE 0 END) AS total_ventas_qty,
                SUM(CASE WHEN v.cantidad > 0 THEN v.total ELSE 0 END) AS total_ventas_val
            FROM ventas v
            JOIN {PROD_MAP_SQL.replace('pm', 'pm2')} ON pm2.prod_id = v.producto_id
            GROUP BY pm2.cod_articulo
        ) v_agg ON v_agg.cod_articulo = st.cod_articulo
        LEFT JOIN (
            SELECT
                pm3.cod_articulo,
                SUM(c.cantidad) AS total_compras_qty,
                SUM(c.total) AS total_compras_val
            FROM compras c
            JOIN {PROD_MAP_SQL.replace('pm', 'pm3')} ON pm3.prod_id = c.producto_id
            GROUP BY pm3.cod_articulo
        ) c_agg ON c_agg.cod_articulo = st.cod_articulo
        LEFT JOIN rubros r ON r.cod_rubro = v_agg.cod_rubro
        LEFT JOIN subrubros sr ON sr.cod_subrubro = v_agg.cod_subrubro
    """))

    # 4. items_listas_precios — one row per product × list
    session.execute(text(f"""
        INSERT INTO items_listas_precios
            (cod_lista, cod_articulo, art_descripcion, art_precio_compra,
             art_precio_venta, lista_precio_venta, lista_descuento, fecha_actualizacion)
        SELECT
            lp.cod_lista,
            sd.cod_articulo,
            sd.descripcion AS art_descripcion,
            sd.precio_compra AS art_precio_compra,
            CASE lp.cod_lista
                WHEN 1 THEN sd.precio_venta
                WHEN 2 THEN sd.precio_venta * 0.75
                WHEN 3 THEN sd.precio_venta * 0.90
            END AS art_precio_venta,
            CASE lp.cod_lista
                WHEN 1 THEN sd.precio_venta
                WHEN 2 THEN sd.precio_venta * 0.75
                WHEN 3 THEN sd.precio_venta * 0.90
            END AS lista_precio_venta,
            CASE lp.cod_lista WHEN 1 THEN 0 WHEN 2 THEN 25 WHEN 3 THEN 10 END AS lista_descuento,
            CURRENT_DATE AS fecha_actualizacion
        FROM stock_disponible sd
        CROSS JOIN listas_precios lp
        WHERE sd.cod_deposito = 1
        ON CONFLICT ON CONSTRAINT idx_items_lista_unico DO UPDATE
            SET art_precio_venta = EXCLUDED.art_precio_venta,
                lista_precio_venta = EXCLUDED.lista_precio_venta
    """))

    # 5. facturas_venta — one header per invoice entry in cta_cte_clientes
    session.execute(text("""
        INSERT INTO facturas_venta
            (fa_id, tipo_comprobante, tipo_factura, fa_cod_empresa,
             fa_fecha, fa_cc, fa_pto_vta, fa_nro, fa_moneda,
             cod_cliente, cod_vendedor,
             fa_total, fa_total_moneda_local,
             primer_fec_vto, ult_fec_vto,
             rc_imp_pagado, saldo_fa)
        SELECT
            ABS(('x' || MD5(ccc.comprobante_id))::bit(63)::bigint) AS fa_id,
            'FA' AS tipo_comprobante,
            CASE WHEN ccc.cliente_id LIKE 'MAY%' THEN 'A' ELSE 'B' END AS tipo_factura,
            1 AS fa_cod_empresa,
            ccc.fecha::date AS fa_fecha,
            ccc.cliente_id AS fa_cc,
            1 AS fa_pto_vta,
            ROW_NUMBER() OVER (ORDER BY ccc.fecha) AS fa_nro,
            'ARS' AS fa_moneda,
            CAST(REGEXP_REPLACE(ccc.cliente_id, '[^0-9]', '', 'g') AS INTEGER) AS cod_cliente,
            v_agg.cod_vendedor,
            ccc.importe AS fa_total,
            ccc.importe AS fa_total_moneda_local,
            (ccc.fecha + INTERVAL '30 days')::date AS primer_fec_vto,
            (ccc.fecha + INTERVAL '30 days')::date AS ult_fec_vto,
            COALESCE(recibo.importe_cobrado, 0) AS rc_imp_pagado,
            GREATEST(ccc.importe - COALESCE(recibo.importe_cobrado, 0), 0) AS saldo_fa
        FROM cuentas_corrientes_clientes ccc
        LEFT JOIN (
            SELECT MAX(cod_vendedor) AS cod_vendedor, cliente_id
            FROM ventas GROUP BY cliente_id
        ) v_agg ON v_agg.cliente_id = ccc.cliente_id
        LEFT JOIN (
            SELECT REPLACE(comprobante_id, 'REC-', '') AS factura_ref, ABS(importe) AS importe_cobrado
            FROM cuentas_corrientes_clientes WHERE tipo = 'recibo'
        ) recibo ON recibo.factura_ref = ccc.comprobante_id
        WHERE ccc.tipo = 'factura' AND ccc.importe > 0 AND ccc.comprobante_id IS NOT NULL
        ON CONFLICT (fa_id) DO NOTHING
    """))

    # 6. saldos_clientes — one row per client, aggregated from cta_cte
    session.execute(text("""
        INSERT INTO saldos_clientes
            (cod_cliente, nombre, fecha, dias_deuda, tot_entrada, tot_salida, tot_saldo, color, prevision)
        SELECT
            CAST(REGEXP_REPLACE(cliente_id, '[^0-9]', '', 'g') AS INTEGER) AS cod_cliente,
            MAX(cliente_nombre) AS nombre,
            MAX(fecha::date) AS fecha,
            GREATEST(EXTRACT(DAY FROM NOW() - MIN(
                CASE WHEN tipo = 'factura' AND importe > 0 AND saldo_acumulado > 0 THEN fecha END
            ))::int, 0) AS dias_deuda,
            SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END) AS tot_entrada,
            SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END) AS tot_salida,
            SUM(importe) AS tot_saldo,
            CASE
                WHEN SUM(importe) <= 0 THEN 1
                WHEN GREATEST(EXTRACT(DAY FROM NOW() - MIN(
                    CASE WHEN tipo = 'factura' AND importe > 0 AND saldo_acumulado > 0 THEN fecha END
                ))::int, 0) <= 30 THEN 2
                WHEN GREATEST(EXTRACT(DAY FROM NOW() - MIN(
                    CASE WHEN tipo = 'factura' AND importe > 0 AND saldo_acumulado > 0 THEN fecha END
                ))::int, 0) <= 60 THEN 3
                ELSE 4
            END AS color,
            GREATEST(SUM(importe), 0) * 0.05 AS prevision
        FROM cuentas_corrientes_clientes
        GROUP BY CAST(REGEXP_REPLACE(cliente_id, '[^0-9]', '', 'g') AS INTEGER)
        HAVING SUM(importe) > 0 OR SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END) > 0
    """))

    # 7. comprobantes_pendientes_clientes — unpaid invoices only
    session.execute(text("""
        INSERT INTO comprobantes_pendientes_clientes
            (comprobante_id, tipo_comprobante, cod_cliente, nombre,
             cod_empresa, cod_vendedor, punto_de_venta, numero,
             importe_factura, importe_pagado, saldo,
             fecha_factura, dias_deuda, color, moneda_fa)
        SELECT
            ABS(('x' || MD5(ccc.comprobante_id))::bit(63)::bigint) AS comprobante_id,
            'FA' AS tipo_comprobante,
            CAST(REGEXP_REPLACE(ccc.cliente_id, '[^0-9]', '', 'g') AS INTEGER) AS cod_cliente,
            ccc.cliente_nombre AS nombre,
            1 AS cod_empresa,
            v_agg.cod_vendedor,
            '1' AS punto_de_venta,
            ccc.comprobante_id AS numero,
            ccc.importe AS importe_factura,
            COALESCE(pagado.importe_cobrado, 0) AS importe_pagado,
            GREATEST(ccc.importe - COALESCE(pagado.importe_cobrado, 0), 0) AS saldo,
            ccc.fecha::date AS fecha_factura,
            GREATEST(EXTRACT(DAY FROM NOW() - ccc.fecha)::int, 0) AS dias_deuda,
            CASE
                WHEN GREATEST(EXTRACT(DAY FROM NOW() - ccc.fecha)::int, 0) <= 30 THEN 2
                WHEN GREATEST(EXTRACT(DAY FROM NOW() - ccc.fecha)::int, 0) <= 60 THEN 3
                ELSE 4
            END AS color,
            'ARS' AS moneda_fa
        FROM cuentas_corrientes_clientes ccc
        LEFT JOIN (
            SELECT MAX(cod_vendedor) AS cod_vendedor, cliente_id FROM ventas GROUP BY cliente_id
        ) v_agg ON v_agg.cliente_id = ccc.cliente_id
        LEFT JOIN (
            SELECT REPLACE(comprobante_id, 'REC-', '') AS factura_ref, ABS(importe) AS importe_cobrado
            FROM cuentas_corrientes_clientes WHERE tipo = 'recibo'
        ) pagado ON pagado.factura_ref = ccc.comprobante_id
        WHERE ccc.tipo = 'factura' AND ccc.importe > 0 AND ccc.comprobante_id IS NOT NULL
          AND GREATEST(ccc.importe - COALESCE(pagado.importe_cobrado, 0), 0) > 0.01
    """))

    # 8. movimientos_stock — salidas from ventas, entradas from compras
    session.execute(text(f"""
        INSERT INTO movimientos_stock
            (id, cod_articulo, descripcion, fecha, tipo_movimiento, cantidad, precio, total, cod_deposito, cod_empresa)
        SELECT
            MD5('S-' || v.id::text) AS id,
            pm.cod_articulo,
            v.producto_nombre AS descripcion,
            v.fecha::date,
            'salida' AS tipo_movimiento,
            -ABS(v.cantidad)::numeric AS cantidad,
            v.precio_unitario AS precio,
            -ABS(v.total) AS total,
            COALESCE(v.cod_deposito, 1) AS cod_deposito,
            COALESCE(v.cod_empresa, 1) AS cod_empresa
        FROM ventas v
        JOIN {PROD_MAP_SQL} ON pm.prod_id = v.producto_id
        WHERE v.cantidad > 0
        ON CONFLICT (id) DO NOTHING
    """))
    session.execute(text(f"""
        INSERT INTO movimientos_stock
            (id, cod_articulo, descripcion, fecha, tipo_movimiento, cantidad, precio, total, cod_deposito, cod_empresa)
        SELECT
            MD5('E-' || ROW_NUMBER() OVER (ORDER BY c.fecha)::text || '-' || pm.cod_articulo::text) AS id,
            pm.cod_articulo,
            c.producto_nombre AS descripcion,
            c.fecha::date,
            'entrada' AS tipo_movimiento,
            c.cantidad::numeric AS cantidad,
            c.precio_unitario AS precio,
            c.total AS total,
            1 AS cod_deposito,
            1 AS cod_empresa
        FROM compras c
        JOIN {PROD_MAP_SQL} ON pm.prod_id = c.producto_id
        ON CONFLICT (id) DO NOTHING
    """))

    # 9. movimientos_contables — debe+haber pairs for each sale, haber for purchases
    session.execute(text("""
        INSERT INTO movimientos_contables
            (id, fecha, cuenta, plan_descripcion, debe, haber, tipo_comprobante, numero, descripcion, cod_empresa, tag)
        SELECT
            MD5('VD-' || v.id::text) AS id,
            v.fecha::date, 111001, 'Caja y Bancos',
            v.total, 0, 'FA', v.id::text, 'Cobro ' || v.cliente_nombre,
            COALESCE(v.cod_empresa, 1), 'S'
        FROM ventas v WHERE v.total > 0
        ON CONFLICT (id) DO NOTHING
    """))
    session.execute(text("""
        INSERT INTO movimientos_contables
            (id, fecha, cuenta, plan_descripcion, debe, haber, tipo_comprobante, numero, descripcion, cod_empresa, tag)
        SELECT
            MD5('VH-' || v.id::text) AS id,
            v.fecha::date, 411001, 'Ventas',
            0, v.total, 'FA', v.id::text, 'Venta ' || v.cliente_nombre,
            COALESCE(v.cod_empresa, 1), 'S'
        FROM ventas v WHERE v.total > 0
        ON CONFLICT (id) DO NOTHING
    """))
    session.execute(text("""
        INSERT INTO movimientos_contables
            (id, fecha, cuenta, plan_descripcion, debe, haber, tipo_comprobante, numero, descripcion, cod_empresa, tag)
        SELECT
            MD5('CH-' || ROW_NUMBER() OVER (ORDER BY c.fecha)::text) AS id,
            c.fecha::date, 211001, 'Proveedores a Pagar',
            0, c.total, 'FC', ROW_NUMBER() OVER (ORDER BY c.fecha)::text,
            'Compra ' || c.producto_nombre, 1, 'C'
        FROM compras c WHERE c.total > 0
        ON CONFLICT (id) DO NOTHING
    """))

    # 10. comprobantes_proveedores — outstanding supplier invoices
    session.execute(text("""
        INSERT INTO comprobantes_proveedores
            (comprobante_id, proveedor_id, proveedor_nombre, tipo, numero,
             fecha, fecha_vencimiento, importe_total, importe_pagado, saldo)
        SELECT
            ccp.comprobante_id,
            ccp.proveedor_id,
            ccp.proveedor_nombre,
            'FA' AS tipo,
            ccp.comprobante_id AS numero,
            ccp.fecha,
            ccp.fecha_vencimiento,
            ccp.importe AS importe_total,
            COALESCE(pago.importe_pagado, 0) AS importe_pagado,
            GREATEST(ccp.importe - COALESCE(pago.importe_pagado, 0), 0) AS saldo
        FROM cuentas_corrientes_proveedores ccp
        LEFT JOIN (
            SELECT REPLACE(comprobante_id, 'PAG-', '') AS factura_ref, ABS(importe) AS importe_pagado
            FROM cuentas_corrientes_proveedores WHERE tipo = 'pago'
        ) pago ON pago.factura_ref = ccp.comprobante_id
        WHERE ccp.tipo = 'factura' AND ccp.importe > 0 AND ccp.comprobante_id IS NOT NULL
          AND GREATEST(ccp.importe - COALESCE(pago.importe_pagado, 0), 0) > 0.01
        ON CONFLICT ON CONSTRAINT idx_comprobante_proveedor_unico DO NOTHING
    """))


def _backfill_ventas_infomanager_fields(session, tenant_schema: str):
    session.execute(text(f'SET search_path TO "{tenant_schema}"'))
    session.execute(text("""
        UPDATE ventas
        SET
            tipo_comprobante = COALESCE(tipo_comprobante, 'FA'),
            tipo_factura = COALESCE(tipo_factura, CASE WHEN cliente_id LIKE 'MAY%' THEN 'A' ELSE 'B' END),
            punto_de_venta = COALESCE(punto_de_venta, ((id % 3) + 1)),
            cod_vendedor = COALESCE(cod_vendedor, ((id % 5) + 1)),
            cod_empresa = COALESCE(cod_empresa, 1),
            tag = COALESCE(tag, 'S'),
            condicion_venta_tipo = COALESCE(condicion_venta_tipo, CASE WHEN cliente_id LIKE 'MAY%' THEN 2 ELSE 1 END),
            neto = COALESCE(neto, total / 1.21),
            iva_importe = COALESCE(iva_importe, total - (total / 1.21)),
            anulada = COALESCE(anulada, 'N'),
            cod_deposito = COALESCE(cod_deposito, CASE WHEN id % 4 = 0 THEN 2 ELSE 1 END),
            cod_rubro = COALESCE(cod_rubro, CASE
                WHEN producto_id LIKE 'REM%' THEN 1
                WHEN producto_id LIKE 'PAN%' THEN 2
                WHEN producto_id LIKE 'VES%' THEN 3
                WHEN producto_id LIKE 'CAM%' THEN 4
                WHEN producto_id LIKE 'BUZ%' THEN 5
                WHEN producto_id LIKE 'CAL%' THEN 6
                WHEN producto_id LIKE 'ACC%' THEN 7
                ELSE 8
            END),
            cod_subrubro = COALESCE(cod_subrubro, CASE producto_id
                WHEN 'REM001' THEN 101
                WHEN 'REM002' THEN 102
                WHEN 'PAN001' THEN 201
                WHEN 'PAN002' THEN 202
                WHEN 'VES001' THEN 301
                WHEN 'VES002' THEN 302
                WHEN 'CAM001' THEN 401
                WHEN 'CAM002' THEN 402
                WHEN 'BUZ001' THEN 501
                WHEN 'CAL001' THEN 601
                WHEN 'CAL002' THEN 602
                WHEN 'CAL003' THEN 603
                WHEN 'ACC001' THEN 701
                WHEN 'ACC002' THEN 702
                ELSE 801
            END),
            precio_compra_actual = COALESCE(precio_compra_actual, precio_unitario * 0.55),
            descuento_porc = COALESCE(descuento_porc, CASE WHEN cliente_id LIKE 'MAY%' THEN 25 ELSE 0 END)
        WHERE cod_vendedor IS NULL
           OR precio_compra_actual IS NULL
           OR cod_rubro IS NULL
           OR cod_subrubro IS NULL
    """))

@celery_app.task(bind=True, name="tasks.demo_seed.seed_tenant_demo")
def seed_tenant_demo(self, tenant_schema: str, meses: int = 12):
    try:
        connector = InfomanagerDemoConector()
        hoy = datetime.datetime.now().replace(hour=23, minute=0, second=0, microsecond=0)
        hasta = hoy
        desde = (hoy - datetime.timedelta(days=meses * 30)).replace(hour=0)

        datos = connector.generar_datos_periodo(desde, hasta)
        ventas = datos["ventas"]
        compras = datos["compras"]
        cta_cte_cli = datos["cta_cte_clientes"]
        cta_cte_prov = datos["cta_cte_proveedores"]
        caja = datos["movimientos_caja"]
        recibos = datos["recibos"]
        presupuestos = datos["presupuestos"]
        stock = datos["stock"]

        with SessionLocal() as session:
            chunk_size = 5000
            total_ventas = 0
            total_compras = 0
            total_cta_cli = 0
            total_cta_prov = 0
            total_caja = 0
            total_recibos = 0
            total_presupuestos = 0

            _insert_chunk(session, tenant_schema, "vendedores", datos["vendedores"], ['cod_vendedor'])
            _insert_chunk(session, tenant_schema, "puntos_de_venta", datos["puntos_de_venta"], ['id'])
            _insert_chunk(session, tenant_schema, "depositos", datos["depositos"], ['cod_deposito'])
            _insert_chunk(session, tenant_schema, "rubros", datos["rubros"], ['cod_rubro'])
            _insert_chunk(session, tenant_schema, "subrubros", datos["subrubros"], ['cod_subrubro'])

            for i in range(0, len(ventas), chunk_size):
                inserted, _ = _insert_ventas_chunk(session, tenant_schema, ventas[i:i+chunk_size])
                total_ventas += inserted
            _backfill_ventas_infomanager_fields(session, tenant_schema)

            for i in range(0, len(compras), chunk_size):
                inserted, _ = _insert_chunk(
                    session,
                    tenant_schema,
                    "compras",
                    compras[i:i+chunk_size],
                    ['fecha', 'proveedor_id', 'producto_id', 'tipo_comprobante'],
                )
                total_compras += inserted

            for i in range(0, len(cta_cte_cli), chunk_size):
                inserted, _ = _insert_chunk(
                    session,
                    tenant_schema,
                    "cuentas_corrientes_clientes",
                    cta_cte_cli[i:i+chunk_size],
                    ['comprobante_id', 'tipo'],
                )
                total_cta_cli += inserted

            for i in range(0, len(cta_cte_prov), chunk_size):
                inserted, _ = _insert_chunk(
                    session,
                    tenant_schema,
                    "cuentas_corrientes_proveedores",
                    cta_cte_prov[i:i+chunk_size],
                    ['comprobante_id', 'tipo'],
                )
                total_cta_prov += inserted

            for i in range(0, len(caja), chunk_size):
                inserted, _ = _insert_chunk(
                    session,
                    tenant_schema,
                    "movimientos_caja",
                    caja[i:i+chunk_size],
                    ['fecha', 'tipo', 'descripcion', 'importe'],
                )
                total_caja += inserted

            for i in range(0, len(recibos), chunk_size):
                inserted, _ = _insert_chunk(
                    session,
                    tenant_schema,
                    "recibos",
                    recibos[i:i+chunk_size],
                    ['id'],
                )
                total_recibos += inserted

            for i in range(0, len(presupuestos), chunk_size):
                inserted, _ = _insert_chunk(
                    session,
                    tenant_schema,
                    "presupuestos",
                    presupuestos[i:i+chunk_size],
                    ['id'],
                )
                total_presupuestos += inserted

            _insert_chunk(session, tenant_schema, "stock", stock, ['cod_articulo', 'cod_deposito'])

            session.commit()

            _seed_infomanager_tables(session, tenant_schema)
            session.commit()

        logger.info(
            "Successfully seeded tenant %s: ventas=%s compras=%s cta_clientes=%s cta_proveedores=%s caja=%s recibos=%s presupuestos=%s stock=%s",
            tenant_schema,
            total_ventas,
            total_compras,
            total_cta_cli,
            total_cta_prov,
            total_caja,
            total_recibos,
            total_presupuestos,
            len(stock),
        )
        return {
            "status": "done",
            "ventas_generadas": len(ventas),
            "compras_generadas": len(compras),
            "cta_clientes_generadas": len(cta_cte_cli),
            "cta_proveedores_generadas": len(cta_cte_prov),
            "movimientos_caja_generados": len(caja),
            "recibos_generados": len(recibos),
            "presupuestos_generados": len(presupuestos),
            "stock_generado": len(stock),
            "ventas_insertadas": total_ventas,
            "compras_insertadas": total_compras,
            "cta_clientes_insertadas": total_cta_cli,
            "cta_proveedores_insertadas": total_cta_prov,
            "movimientos_caja_insertados": total_caja,
            "recibos_insertados": total_recibos,
            "presupuestos_insertados": total_presupuestos,
            "stock_insertado": len(stock),
        }
    except Exception as e:
        print(traceback.format_exc())
        raise Exception(f"Failed to seed demo: {str(e)}")
