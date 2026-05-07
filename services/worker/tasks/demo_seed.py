import os
import datetime
import traceback
from worker_app import celery_app
from connectors.infomanager_demo import InfomanagerDemoConector
from sqlalchemy import create_engine, text, table, column, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5433/demo_consultora")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

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
        
    # Upsert Clientes
    if clientes_data:
        clientes_table = table("clientes", column("external_id"), column("nombre"))
        stmt_clientes = insert(clientes_table).values(list(clientes_data.values()))
        stmt_clientes = stmt_clientes.on_conflict_do_nothing(index_elements=['external_id'])
        session.execute(stmt_clientes)
        
    # Upsert Ventas
    rows_inserted = 0
    if ventas_data:
        ventas_table = table(
            "ventas", 
            column("fecha"), column("cliente_id"), column("producto_id"),
            column("cantidad"), column("precio_unitario"), column("total"), column("total_real")
        )
        stmt_ventas = insert(ventas_table).values(ventas_data)
        stmt_ventas = stmt_ventas.on_conflict_do_nothing(
            index_elements=['fecha', 'cliente_id', 'producto_id']
        )
        
        result = session.execute(stmt_ventas)
        rows_inserted = result.rowcount
        
    return rows_inserted, len(ventas_data) - rows_inserted

@celery_app.task(bind=True, name="tasks.demo_seed.seed_tenant_demo")
def seed_tenant_demo(self, tenant_schema: str, meses: int = 12):
    try:
        connector = InfomanagerDemoConector()
        hasta = datetime.datetime.now()
        # Estimate ~30 days per month
        desde = hasta - datetime.timedelta(days=meses * 30)
        
        ventas = connector.generar_ventas_periodo(desde, hasta)
        
        with SessionLocal() as session:
            # Insert in chunks of 5000 to avoid huge memory usage in session
            chunk_size = 5000
            total_inserted = 0
            for i in range(0, len(ventas), chunk_size):
                chunk = ventas[i:i+chunk_size]
                inserted, _ = _insert_ventas_chunk(session, tenant_schema, chunk)
                total_inserted += inserted
            session.commit()
            
        return {"status": "done", "ventas_generadas": len(ventas), "ventas_insertadas": total_inserted}
    except Exception as e:
        print(traceback.format_exc())
        raise Exception(f"Failed to seed demo: {str(e)}")

@celery_app.task(bind=True, name="tasks.demo_seed.tick_demo_ventas")
def tick_demo_ventas(self):
    try:
        connector = InfomanagerDemoConector()
        
        with SessionLocal() as session:
            # Find all companies with erp_type = 'infomanager_demo'
            # Assuming 'companies' table is in 'public' schema or default search_path
            session.execute(text('SET search_path TO "public"'))
            result = session.execute(text("SELECT tenant_schema FROM companies WHERE erp_type = 'infomanager_demo' AND is_provisioned = TRUE"))
            tenants = [row[0] for row in result.fetchall()]
            
            for tenant in tenants:
                ventas = connector.generar_ventas_ahora()
                if ventas:
                    _insert_ventas_chunk(session, tenant, ventas)
                    
            session.commit()
            
        return {"status": "done", "tenants_processed": len(tenants)}
    except Exception as e:
        print(traceback.format_exc())
        raise Exception(f"Failed to tick demo ventas: {str(e)}")
