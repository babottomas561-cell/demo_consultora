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

    session.execute(text(f'SET search_path TO "{tenant_schema}"'))

    table_obj = table(table_name, *[column(k) for k in data[0].keys()])
    stmt = insert(table_obj).values(data)

    if conflict_cols:
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
            "producto_id": v.producto_id,
            "cantidad": v.cantidad,
            "precio_unitario": v.precio_unitario,
            "total": v.total,
            "total_real": None
        })

    if clientes_data:
        clientes_table = table("clientes", column("external_id"), column("nombre"))
        stmt_clientes = insert(clientes_table).values(list(clientes_data.values()))
        stmt_clientes = stmt_clientes.on_conflict_do_nothing(index_elements=['external_id'])
        session.execute(stmt_clientes)

    rows_inserted, failed = _insert_chunk(session, tenant_schema, "ventas", ventas_data, ['fecha', 'cliente_id', 'producto_id'])
    return rows_inserted, failed

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

        with SessionLocal() as session:
            chunk_size = 5000
            total_ventas = 0
            total_compras = 0
            total_cta_cli = 0
            total_cta_prov = 0
            total_caja = 0

            for i in range(0, len(ventas), chunk_size):
                inserted, _ = _insert_ventas_chunk(session, tenant_schema, ventas[i:i+chunk_size])
                total_ventas += inserted

            for i in range(0, len(compras), chunk_size):
                inserted, _ = _insert_chunk(
                    session,
                    tenant_schema,
                    "compras",
                    compras[i:i+chunk_size],
                    ['fecha', 'proveedor_id', 'producto_id'],
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

            session.commit()

        logger.info(
            "Successfully seeded tenant %s: ventas=%s compras=%s cta_clientes=%s cta_proveedores=%s caja=%s",
            tenant_schema,
            total_ventas,
            total_compras,
            total_cta_cli,
            total_cta_prov,
            total_caja,
        )
        return {
            "status": "done",
            "ventas_generadas": len(ventas),
            "compras_generadas": len(compras),
            "cta_clientes_generadas": len(cta_cte_cli),
            "cta_proveedores_generadas": len(cta_cte_prov),
            "movimientos_caja_generados": len(caja),
            "ventas_insertadas": total_ventas,
            "compras_insertadas": total_compras,
            "cta_clientes_insertadas": total_cta_cli,
            "cta_proveedores_insertadas": total_cta_prov,
            "movimientos_caja_insertados": total_caja,
        }
    except Exception as e:
        print(traceback.format_exc())
        raise Exception(f"Failed to seed demo: {str(e)}")
