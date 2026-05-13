import os
import traceback
from worker_app import celery_app
from connectors.excel import ExcelConector
from sqlalchemy import create_engine, text, table, column
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import insert

# Sync Engine specifically for the worker
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgrespassword@localhost:5433/demo_consultora")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@celery_app.task(bind=True, name="tasks.excel.process_excel")
def process_excel(self, tenant_schema: str, filepath: str, job_id: str):
    """
    Celery task to process an Excel file and load it into the tenant's database.
    """
    rows_inserted = 0
    rows_skipped = 0
    
    try:
        # Initialize connector
        connector = ExcelConector(filepath=filepath, chunk_size=5000)
        
        # Connect to DB synchronously
        with SessionLocal() as session:
            # Set schema
            session.execute(text(f'SET search_path TO "{tenant_schema}"'))
            
            # Process in chunks
            for chunk in connector.extract_and_normalize():
                if not chunk:
                    continue
                
                # Prepare data for insertion into Clientes and Ventas
                ventas_data = []
                clientes_data = {} # Dict to deduplicate
                
                for v in chunk:
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
                if ventas_data:
                    ventas_table = table(
                        "ventas", 
                        column("fecha"), column("cliente_id"), column("producto_id"),
                        column("cantidad"), column("precio_unitario"), column("total"), column("total_real")
                    )
                    stmt_ventas = insert(ventas_table).values(ventas_data)
                    stmt_ventas = stmt_ventas.on_conflict_do_nothing(
                        index_elements=['fecha', 'cliente_id', 'producto_id', 'tipo_comprobante']
                    )
                    
                    result = session.execute(stmt_ventas)
                    
                    # session.execute returns an object with rowcount if supported
                    inserted_in_chunk = result.rowcount
                    rows_inserted += inserted_in_chunk
                    rows_skipped += len(ventas_data) - inserted_in_chunk
            
            session.commit()
            
        return {
            "status": "done",
            "rows_inserted": rows_inserted,
            "rows_skipped": rows_skipped,
            "filename": os.path.basename(filepath)
        }
    
    except Exception as e:
        # Provide trace for debugging
        print(traceback.format_exc())
        raise Exception(f"Failed to process excel: {str(e)}")
        
    finally:
        # Always clean up the temp file
        if os.path.exists(filepath):
            os.remove(filepath)
