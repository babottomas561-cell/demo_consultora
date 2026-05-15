#!/usr/bin/env python3
"""
Test rápido de conexión con Infomanager usando el conector real.

Uso:
    INFOMANAGER_CLIENT_ID=ck_test_imp_02 \
    INFOMANAGER_CLIENT_SECRET=kn7Zj3298n7sU4TLR \
    python scripts/test_infomanager_connection.py
"""
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "worker"))

from connectors.infomanager import InfomanagerConnector

erp_config = {
    "client_id": os.getenv("INFOMANAGER_CLIENT_ID"),
    "client_secret": os.getenv("INFOMANAGER_CLIENT_SECRET"),
}

if not erp_config["client_id"] or not erp_config["client_secret"]:
    print("ERROR: Definí INFOMANAGER_CLIENT_ID y INFOMANAGER_CLIENT_SECRET")
    sys.exit(1)

conector = InfomanagerConnector(
    client_id=erp_config["client_id"],
    client_secret=erp_config["client_secret"],
)

print("1. Probando autenticación...")
conector.authenticate()
print(f"   Token obtenido: {conector.token[:20]}...")
print(f"   Expira: {conector.token_expires}")

print("\n2. Trayendo artículos (primeros 5)...")
articulos = conector.fetch_paginated("/api/v1/articulos", {"page": 1, "limit": 5})
print(f"   Total artículos en esta página: {len(articulos)}")
for a in articulos[:5]:
    print(f"   - {a.get('cod_articulo')} | {a.get('descripcion')}")

print("\n3. Trayendo ventas últimos 7 días...")
hasta = date.today()
desde = hasta - timedelta(days=7)
ventas = conector.sync_ventas(desde, hasta)
print(f"   Total ventas (ítems): {len(ventas)}")
if ventas:
    v = ventas[0]
    print(f"   Primera venta: fecha={v.get('fecha')} cliente={v.get('cliente_nombre')} total={v.get('total')}")

print("\n4. Trayendo clientes (primeros 5)...")
clientes_raw = conector.fetch_paginated("/api/v1/clientes", {"page": 1, "limit": 5})
print(f"   Total clientes en esta página: {len(clientes_raw)}")
for c in clientes_raw[:5]:
    print(f"   - {c.get('cod_cliente')} | {c.get('nombre')}")

print("\n5. Trayendo saldos de clientes...")
saldos = conector.sync_saldos_clientes()
print(f"   Total filas de saldos: {len(saldos)}")
if saldos:
    s = saldos[0]
    print(f"   Primer saldo: cliente={s.get('cliente_nombre')} saldo={s.get('saldo_acumulado')}")

print("\n✅ Conexión exitosa!")
