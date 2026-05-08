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

    # Upsert Clientes
    if clientes_data:
        clientes_table = table("clientes", column("external_id"), column("nombre"))
        stmt_clientes = insert(clientes_table).values(list(clientes_data.values()))
        stmt_clientes = stmt_clientes.on_conflict_do_nothing(index_elements=['external_id'])
        session.execute(stmt_clientes)

    # Upsert Ventas
    rows_inserted, failed = _insert_chunk(session, tenant_schema, "ventas", ventas_data, ['fecha', 'cliente_id', 'producto_id'])
    return rows_inserted, failed

def seed_tenant(tenant_schema: str, database_url: str):
    print(f"Connecting to DB and seeding tenant: {tenant_schema}...")
    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    try:
        connector = InfomanagerDemoConector()
        hoy = datetime.datetime.now().replace(hour=23, minute=0, second=0, microsecond=0)
        hasta = hoy
        desde = (hoy - datetime.timedelta(days=365)).replace(hour=0)

        print(f"Generating data from {desde} to {hasta}...")
        datos = connector.generar_datos_periodo(desde, hasta)
        ventas = datos["ventas"]
        compras = datos["compras"]
        cta_cte_cli = datos["cta_cte_clientes"]
        cta_cte_prov = datos["cta_cte_proveedores"]
        caja = datos["movimientos_caja"]

        print(f"Generated {len(ventas)} ventas, {len(compras)} compras, {len(cta_cte_cli)} cta_cte_cli, {len(cta_cte_prov)} cta_cte_prov, {len(caja)} mov_caja. Inserting...")

        with SessionLocal() as session:
            chunk_size = 5000

            # Ventas (incluye Clientes)
            total_ventas = 0
            for i in range(0, len(ventas), chunk_size):
                chunk = ventas[i:i+chunk_size]
                inserted, _ = _insert_ventas_chunk(session, tenant_schema, chunk)
                total_ventas += inserted
            print(f"Inserted {total_ventas} ventas.")

            # Compras
            total_compras = 0
            for i in range(0, len(compras), chunk_size):
                chunk = compras[i:i+chunk_size]
                inserted, _ = _insert_chunk(session, tenant_schema, "compras", chunk, ['fecha', 'proveedor_id', 'producto_id'])
                total_compras += inserted
            print(f"Inserted {total_compras} compras.")

            # Cta Cte Clientes
            total_cta_cli = 0
            for i in range(0, len(cta_cte_cli), chunk_size):
                chunk = cta_cte_cli[i:i+chunk_size]
                inserted, _ = _insert_chunk(session, tenant_schema, "cuentas_corrientes_clientes", chunk, ['comprobante_id', 'tipo'])
                total_cta_cli += inserted

            # Cta Cte Proveedores
            total_cta_prov = 0
            for i in range(0, len(cta_cte_prov), chunk_size):
                chunk = cta_cte_prov[i:i+chunk_size]
                inserted, _ = _insert_chunk(session, tenant_schema, "cuentas_corrientes_proveedores", chunk, ['comprobante_id', 'tipo'])
                total_cta_prov += inserted

            # Caja
            total_caja = 0
            for i in range(0, len(caja), chunk_size):
                chunk = caja[i:i+chunk_size]
                inserted, _ = _insert_chunk(session, tenant_schema, "movimientos_caja", chunk, ['fecha', 'tipo', 'descripcion', 'importe'])
                total_caja += inserted

            session.commit()

        print(f"Success! Inserted all records into {tenant_schema}")
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
