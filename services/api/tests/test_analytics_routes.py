import os
import sys


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import date

from app.api.v1.analytics import resolve_dates
from app.main import app


def test_analytics_routes_are_registered():
    expected_paths = {
        "/api/v1/analytics/ventas/resumen",
        "/api/v1/analytics/compras/resumen",
        "/api/v1/analytics/resultado/resumen",
        "/api/v1/analytics/stock/resumen",
        "/api/v1/analytics/vendedores/resumen",
        "/api/v1/analytics/clientes/resumen",
        "/api/v1/analytics/proveedores/resumen",
        "/api/v1/analytics/caja/resumen",
        "/api/v1/analytics/clientes/{cliente_id}/comprobantes",
        "/api/v1/analytics/proveedores/{proveedor_id}/comprobantes",
        "/api/v1/analytics/vendedores/comisiones",
        "/api/v1/analytics/infomanager/reportes",
        "/api/v1/analytics/infomanager/reportes/{report_key}",
    }

    registered_paths = {route.path for route in app.routes}

    assert expected_paths.issubset(registered_paths)


def test_resolve_dates_returns_date_objects_and_exclusive_until():
    desde, hasta = resolve_dates("2025-05-09", "2026-05-09")

    assert desde == date(2025, 5, 9)
    assert hasta == date(2026, 5, 10)
    assert type(desde) is date
    assert type(hasta) is date
