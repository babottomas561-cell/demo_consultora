"""
Auditoría completa de la API Infomanager.
Ejecutar: python3 services/worker/scripts/audit_api.py
"""
import requests
import json

BASE = "https://impedidos.infomanager.com.ar"
DESDE = "20260101"
HASTA = "20260510"

# ── Autenticación ───────────────────────────────────────────────────────────
print("Autenticando...")
r = requests.post(
    f"{BASE}/api/v1/auth/login",
    json={"client_id": "ck_test_imp_02", "client_secret": "kn7Zj3298n7sU4TLR"},
    timeout=20,
)
r.raise_for_status()
token = r.json().get("token") or r.json().get("access_token") or r.json().get("accessToken")
print(f"Auth OK  — token: {token[:40]}...")
H = {"Authorization": f"Bearer {token}", "accept": "application/json"}

# ── Endpoints a auditar ────────────────────────────────────────────────────
# Todos los endpoints con sus params CORRECTOS (descubiertos por auditoría).
# Clave: los reportes necesitan page+limit en query string o devuelven 400.
ENDPOINTS = [
    # VENTAS
    ("VENTAS cabeceras",        f"/api/v1/ventas?fechaDesde={DESDE}&fechaHasta={HASTA}&page=1&limit=3"),
    ("VENTAS items",            f"/api/v1/ventas/items?fechaDesde={DESDE}&fechaHasta={HASTA}&page=1&limit=3"),
    # COMPRAS
    ("COMPRAS cabeceras",       f"/api/v1/compras?fechaDesde={DESDE}&fechaHasta={HASTA}&page=1&limit=3"),
    ("COMPRAS items",           f"/api/v1/compras/items?fechaDesde={DESDE}&fechaHasta={HASTA}&page=1&limit=3"),
    ("COMPRAS por-factura",     f"/api/v1/compras/compras-por-factura?fecha_desde=2026-01-01&fecha_hasta=2026-05-10&cod_proveedor=0&cod_articulo=0&cod_rubro=0&cod_subrubro=0&cod_unidad_negocio=0&centro_de_costo=T&usuario=admin&page=1&limit=3"),
    # ARTÍCULOS Y STOCK
    ("ARTICULOS lista",         "/api/v1/articulos?page=1&limit=3"),
    ("ARTICULOS stock",         "/api/v1/articulos/stock"),
    ("DEPOSITOS",               "/api/v1/depositos"),
    ("ARTICULOS movimientos",   "/api/v1/articulos/movimientos-por-articulo?fecha_desde=2026-01-01&fecha_hasta=2026-05-10&cod_articulo=140&cod_deposito=1&page=1&limit=5"),
    # CLIENTES
    ("CLIENTES lista",          "/api/v1/clientes?page=1&limit=3"),
    # PROVEEDORES
    ("PROVEEDORES lista",       "/api/v1/proveedores?page=1&limit=3"),
    # VENDEDORES
    ("VENDEDORES",              "/api/v1/vendedores"),
    # PRESUPUESTOS
    ("PRESUPUESTOS confirmados",    f"/api/v1/presupuestos/confirmados?fechaDesde={DESDE}&fechaHasta={HASTA}&page=1&limit=3"),
    ("PRESUPUESTOS no_confirmados", f"/api/v1/presupuestos/no_confirmados?fechaDesde={DESDE}&fechaHasta={HASTA}&page=1&limit=3"),
    # REPORTES — requieren tag/codEmpresa/fechas/page/limit
    ("REPORTE facturas",                f"/api/v1/reportes/facturas?fechaDesde={DESDE}&fechaHasta={HASTA}&tag=T&codEmpresa=0&page=1&limit=5"),
    ("REPORTE facturas_con_recibos",    f"/api/v1/reportes/facturas_con_recibos?fechaDesde={DESDE}&fechaHasta={HASTA}&tag=T&codEmpresa=0&page=1&limit=5"),
    ("REPORTE facturas_compras",        f"/api/v1/reportes/facturas_compras?fechaDesde={DESDE}&fechaHasta={HASTA}&tag=T&codEmpresa=0&codProveedor=0&page=1&limit=5"),
    ("REPORTE saldos_clientes",         "/api/v1/reportes/saldos_clientes?tag=T&codCliente=0&codEmpresa=0&page=1&limit=5"),
    ("REPORTE comprob_pendientes",      "/api/v1/reportes/comprob_pendientes_clientes?tag=T&codCliente=0&codEmpresa=0&page=1&limit=5"),
    ("REPORTE disponible_cli=3000",     "/api/v1/reportes/disponible_por_cliente?codCliente=3000&page=1&limit=5"),
    ("REPORTE lista_precio codLista=4", f"/api/v1/reportes/lista_precio_por_codigo?codLista=4&fechaDesde={DESDE}&fechaHasta={HASTA}&page=1&limit=5"),
    # MAESTROS
    ("RUBROS",          "/api/v1/rubros/All"),
    ("SUBRUBROS",       "/api/v1/subrubros/All"),
    ("PUNTOS DE VENTA", "/api/v1/puntos-de-venta"),
    ("EMPRESAS",        "/api/v1/empresas"),
    ("MONEDAS",         "/api/v1/monedas/all"),
]


def extract_items(data):
    """Devuelve (items_list, total, root_keys)."""
    if isinstance(data, list):
        return data, len(data), []
    if isinstance(data, dict):
        root_keys = list(data.keys())
        for key in ("data", "items", "results", "result",
                    "lVentasItems", "lComprasItems", "lItems"):
            val = data.get(key)
            if isinstance(val, list):
                total = data.get("total") or data.get("totalItems") or data.get("count") or len(val)
                return val, total, root_keys
        # Dict but no array inside — treat as single object
        return [data], 1, root_keys
    return [], 0, []


results = {}
for name, ep in ENDPOINTS:
    try:
        resp = requests.get(f"{BASE}{ep}", headers=H, timeout=20)
        raw = resp.json()
        items, total, root_keys = extract_items(raw)
        first = items[0] if items else {}
        second = items[1] if len(items) > 1 else {}
        fields = list(first.keys()) if isinstance(first, dict) else []

        results[name] = {
            "status": resp.status_code,
            "total_seen": total,
            "root_keys": root_keys,
            "fields": fields,
            "sample_1": first,
            "sample_2": second,
        }

        SEP = "=" * 65
        print(f"\n{SEP}")
        print(f"{'✅' if resp.status_code == 200 else '⚠️ '} {name}  —  HTTP {resp.status_code}  —  {total} registros")
        if root_keys:
            print(f"   Root keys del dict: {root_keys}")
        print(f"   Campos: {fields}")
        if first:
            sample_str = json.dumps(first, ensure_ascii=False, indent=2, default=str)
            # Mostrar hasta 600 chars
            print(f"   Muestra #1:\n{sample_str[:700]}" + ("..." if len(sample_str) > 700 else ""))
        if second:
            sample_str2 = json.dumps(second, ensure_ascii=False, indent=2, default=str)
            print(f"   Muestra #2:\n{sample_str2[:400]}" + ("..." if len(sample_str2) > 400 else ""))

    except Exception as exc:
        print(f"\n❌ {name}: {exc}")
        results[name] = {"status": "ERROR", "error": str(exc)}

# ── Guardar JSON completo ──────────────────────────────────────────────────
import os
out_dir = os.path.dirname(os.path.abspath(__file__))
out_path = os.path.join(out_dir, "api_audit_result.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2, default=str)

print(f"\n\n{'=' * 65}")
print(f"Audit guardado en: {out_path}")
print(f"Endpoints auditados: {len(results)}")
ok = sum(1 for v in results.values() if v.get("status") == 200)
print(f"OK 200: {ok}   ERROR: {len(results) - ok}")
