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
