#!/usr/bin/env python3
"""
Script para testear la conexión con Infomanager y ver el esquema real de respuestas.

Uso:
    python scripts/test_infomanager_connector.py \
        --base-url https://impedidos.infomanager.com.ar \
        --client-id ck_test_imp_02 \
        --client-secret kn7Zj3298n7sU4TLR
"""
import argparse
import json
import sys
import os
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "worker"))

import requests


def fetch_raw(base_url: str, token: str, endpoint: str, params: dict = None):
    resp = requests.get(
        f"{base_url}{endpoint}",
        headers={"Authorization": f"Bearer {token}"},
        params=params or {},
        timeout=60,
    )
    print(f"  Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"  Error body: {resp.text[:500]}")
        return None
    return resp.json()


def show_sample(data, label: str):
    if data is None:
        return
    if isinstance(data, list):
        print(f"  Total items: {len(data)}")
        if data:
            print(f"  Primer registro ({label}):")
            print(json.dumps(data[0], indent=4, ensure_ascii=False, default=str))
    elif isinstance(data, dict):
        print(f"  Respuesta ({label}):")
        # Try to find a list inside
        for key, val in data.items():
            if isinstance(val, list) and val:
                print(f"  Campo '{key}' tiene {len(val)} items. Primer item:")
                print(json.dumps(val[0], indent=4, ensure_ascii=False, default=str))
                return
        print(json.dumps(data, indent=4, ensure_ascii=False, default=str))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="https://impedidos.infomanager.com.ar")
    parser.add_argument("--client-id", required=True)
    parser.add_argument("--client-secret", required=True)
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    print(f"\nConectando a {base}\n")

    # ── 1. Auth ────────────────────────────────────────────────────────────────
    print("═" * 60)
    print("1. AUTH  POST /api/v1/auth/login")
    print("═" * 60)
    resp = requests.post(
        f"{base}/api/v1/auth/login",
        json={"client_id": args.client_id, "client_secret": args.client_secret},
        timeout=30,
    )
    print(f"  Status: {resp.status_code}")
    if resp.status_code != 200:
        print(f"  ERROR: {resp.text[:500]}")
        sys.exit(1)

    auth_data = resp.json()
    print(f"  Respuesta completa de auth:")
    print(json.dumps(auth_data, indent=4, ensure_ascii=False))

    # Detect token field
    token = (
        auth_data.get("access_token")
        or auth_data.get("token")
        or auth_data.get("accessToken")
        or auth_data.get("jwt")
    )
    if not token:
        print(f"\n  ERROR: No se encontró el token. Campos disponibles: {list(auth_data.keys())}")
        sys.exit(1)
    print(f"\n  Token: {token[:30]}...")

    # Wide range to catch data from test DB (Nov 2025 - present)
    desde = (date.today() - timedelta(days=365)).strftime("%Y%m%d")
    hasta = date.today().strftime("%Y%m%d")
    pagination = {"page": 1, "limit": 2}

    endpoints = [
        ("Vendedores",              "/api/v1/vendedores",                    pagination),
        ("Artículos",               "/api/v1/articulos",                     pagination),
        ("Stock",                   "/api/v1/articulos/stock",               pagination),
        ("Ventas (headers)",        "/api/v1/ventas",                        {"fechaDesde": desde, "fechaHasta": hasta, **pagination}),
        ("Ventas items",            "/api/v1/ventas/items",                  {"fechaDesde": desde, "fechaHasta": hasta, **pagination}),
        ("Compras (headers)",       "/api/v1/compras",                       {"fechaDesde": desde, "fechaHasta": hasta, **pagination}),
        ("Compras items",           "/api/v1/compras/items",                 {"fechaDesde": desde, "fechaHasta": hasta, **pagination}),
        ("Saldos clientes",         "/api/v1/reportes/saldos_clientes",      {"TAG": "T", "codcliente": 0, "codEmpresa": 0, **pagination}),
        ("Clientes",                "/api/v1/clientes",                      pagination),
        ("Proveedores",             "/api/v1/proveedores",                   pagination),
        ("Presupuestos confirmados","/api/v1/presupuestos/confirmados",      {"fechaDesde": desde, "fechaHasta": hasta, **pagination}),
        ("Presupuestos no confirm.", "/api/v1/presupuestos/no_confirmados",  {"fechaDesde": desde, "fechaHasta": hasta, **pagination}),
    ]

    for label, endpoint, params in endpoints:
        print(f"\n{'═' * 60}")
        print(f"  {label.upper()}  GET {endpoint}")
        print(f"{'═' * 60}")
        data = fetch_raw(base, token, endpoint, params)
        show_sample(data, label)

    print("\n\nTest completado.\n")


if __name__ == "__main__":
    main()
