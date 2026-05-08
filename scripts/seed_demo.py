import sys
import os
import argparse
import traceback
from sqlalchemy import create_engine, text, table, column
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert

# Append services/worker to sys.path to easily import the connector
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'services', 'worker')))

from connectors.infomanager_demo import InfomanagerDemoConector
import datetime

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

def seed_tenant(tenant_schema: str, database_url: str):
    print(f"Connecting to DB and seeding tenant: {tenant_schema}...")
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    try:
        connector = InfomanagerDemoConector()
        hasta = datetime.datetime.now()
        desde = hasta - datetime.timedelta(days=365) # 12 months
        
        print(f"Generating data from {desde} to {hasta}...")
        ventas = connector.generar_ventas_periodo(desde, hasta)
        print(f"Generated {len(ventas)} sales records. Inserting into DB...")
        
        with SessionLocal() as session:
            chunk_size = 5000
            total_inserted = 0
            for i in range(0, len(ventas), chunk_size):
                chunk = ventas[i:i+chunk_size]
                inserted, _ = _insert_ventas_chunk(session, tenant_schema, chunk)
                total_inserted += inserted
                print(f"Inserted chunk: {total_inserted}/{len(ventas)}")
            session.commit()
            
        print(f"Success! Inserted {total_inserted} records into {tenant_schema}.ventas")
        return True
    except Exception as e:
        print(f"Error seeding tenant: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed a demo tenant with historical data.")
    parser.add_argument("tenant_schema", help="The name of the tenant schema (e.g., tenant_demo1)")
    args = parser.parse_args()
    
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable is not set.")
        sys.exit(1)
        
    success = seed_tenant(args.tenant_schema, db_url)
    sys.exit(0 if success else 1)
