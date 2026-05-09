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

    # Upsert Clientes
    if clientes_data:
        clientes_table = table("clientes", column("external_id"), column("nombre"))
        stmt_clientes = insert(clientes_table).values(list(clientes_data.values()))
        stmt_clientes = stmt_clientes.on_conflict_do_update(
            index_elements=['external_id'],
            set_={"nombre": stmt_clientes.excluded.nombre},
        )
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
        recibos = datos["recibos"]
        presupuestos = datos["presupuestos"]
        stock = datos["stock"]

        print(f"Generated {len(ventas)} ventas, {len(compras)} compras, {len(cta_cte_cli)} cta_cte_cli, {len(cta_cte_prov)} cta_cte_prov, {len(caja)} mov_caja, {len(recibos)} recibos. Inserting...")

        with SessionLocal() as session:
            chunk_size = 5000

            _insert_chunk(session, tenant_schema, "vendedores", datos["vendedores"], ['cod_vendedor'])
            _insert_chunk(session, tenant_schema, "puntos_de_venta", datos["puntos_de_venta"], ['id'])
            _insert_chunk(session, tenant_schema, "depositos", datos["depositos"], ['cod_deposito'])
            _insert_chunk(session, tenant_schema, "rubros", datos["rubros"], ['cod_rubro'])
            _insert_chunk(session, tenant_schema, "subrubros", datos["subrubros"], ['cod_subrubro'])

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

            total_recibos = 0
            for i in range(0, len(recibos), chunk_size):
                chunk = recibos[i:i+chunk_size]
                inserted, _ = _insert_chunk(session, tenant_schema, "recibos", chunk, ['id'])
                total_recibos += inserted

            total_presupuestos = 0
            for i in range(0, len(presupuestos), chunk_size):
                chunk = presupuestos[i:i+chunk_size]
                inserted, _ = _insert_chunk(session, tenant_schema, "presupuestos", chunk, ['id'])
                total_presupuestos += inserted

            _insert_chunk(session, tenant_schema, "stock", stock, ['cod_articulo', 'cod_deposito'])

            session.commit()

        print(f"Success! Inserted all records into {tenant_schema}. Recibos={total_recibos}, presupuestos={total_presupuestos}.")
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
