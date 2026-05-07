import pandas as pd
import random
from datetime import datetime, timedelta

def generate_excel():
    records = []
    start_date = datetime(2026, 1, 1)
    
    clientes = [
        ("C001", "Cliente A"),
        ("C002", "Cliente B"),
        ("C003", "Cliente C"),
    ]
    
    productos = [
        ("P100", "Producto X", 150.0),
        ("P200", "Producto Y", 200.0),
        ("P300", "Producto Z", 50.5),
    ]

    for i in range(100):
        fecha = start_date + timedelta(days=random.randint(0, 90))
        cliente_id, cliente_nombre = random.choice(clientes)
        producto_id, producto_nombre, precio = random.choice(productos)
        cantidad = random.randint(1, 10)
        total = cantidad * precio
        
        records.append({
            "fecha": fecha.strftime("%Y-%m-%d"),
            "cliente_id": cliente_id,
            "cliente_nombre": cliente_nombre,
            "producto_id": producto_id,
            "producto_nombre": producto_nombre,
            "cantidad": cantidad,
            "precio_unitario": precio,
            "total": total
        })
        
    df = pd.DataFrame(records)
    df.to_excel("test_data.xlsx", index=False)
    print("test_data.xlsx generated with 100 rows.")
    
def generate_bad_excel():
    records = [{"bad_column": "value", "fecha": "2026-01-01"}]
    df = pd.DataFrame(records)
    df.to_excel("bad_data.xlsx", index=False)
    print("bad_data.xlsx generated.")

if __name__ == "__main__":
    generate_excel()
    generate_bad_excel()
