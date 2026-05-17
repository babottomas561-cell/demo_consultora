import os, sys, json
from datetime import date, timedelta
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

erp_config = {
    "client_id": "ck_test_imp_02",
    "client_secret": "kn7Zj3298n7sU4TLR"
}

from connectors.infomanager import InfomanagerConnector
c = InfomanagerConnector(
    client_id=erp_config["client_id"],
    client_secret=erp_config["client_secret"]
)

desde = date(2025, 1, 1)
hasta = date.today()

tests = [
    ("empresas", lambda: c.obtener_empresas()),
    ("depositos", lambda: c.obtener_depositos()),
    ("vendedores", lambda: c.obtener_vendedores()),
    ("listas_precios", lambda: c.obtener_listas_precios()),
    ("items_lista_4", lambda: c.obtener_items_lista_precios(4, desde, hasta)),
    ("items_lista_6", lambda: c.obtener_items_lista_precios(6, desde, hasta)),
    ("facturas_venta", lambda: c.obtener_facturas_venta(desde, hasta)),
    ("facturas_compra", lambda: c.obtener_facturas_compra(desde, hasta)),
    ("facturas_con_recibos", lambda: c.obtener_facturas_con_recibos(desde, hasta)),
    ("saldos_clientes", lambda: c.obtener_saldos_clientes()),
    ("comprobantes_pendientes", lambda: c.obtener_comprobantes_pendientes()),
    ("stock_disponible", lambda: c.obtener_stock_disponible()),
    ("presupuestos_confirmados", lambda: c.obtener_presupuestos_confirmados()),
    ("movimientos_contables", lambda: c.obtener_movimientos_contables(
        desde, hasta, cod_cuenta="1114000", cod_empresa=1)),
]

print("=" * 60)
print("TEST DE TODOS LOS MÉTODOS DEL CONECTOR INFOMANAGER")
print("=" * 60)

resultados = {}
for nombre, fn in tests:
    try:
        data = fn()
        count = len(data) if isinstance(data, list) else 1
        resultados[nombre] = {"status": "OK", "count": count}
        print(f"  OK  {nombre}: {count} registros")
        if count > 0 and isinstance(data, list):
            print(f"       Ejemplo keys: {list(data[0].keys())[:8]}")
    except Exception as e:
        resultados[nombre] = {"status": "ERROR", "error": str(e)}
        print(f"  FAIL {nombre}: {e}")

print("\n" + "=" * 60)
ok = sum(1 for r in resultados.values() if r["status"] == "OK")
fail = sum(1 for r in resultados.values() if r["status"] == "ERROR")
print(f"OK: {ok}/{len(resultados)}  FAIL: {fail}/{len(resultados)}")
for nombre, r in resultados.items():
    if r["status"] == "ERROR":
        print(f"  FAIL {nombre}: {r['error']}")
