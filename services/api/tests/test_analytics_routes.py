import os
import sys


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app


def test_analytics_routes_are_registered():
    expected_paths = {
        "/api/v1/analytics/ventas/resumen",
        "/api/v1/analytics/compras/resumen",
        "/api/v1/analytics/resultado/resumen",
        "/api/v1/analytics/clientes/resumen",
        "/api/v1/analytics/proveedores/resumen",
        "/api/v1/analytics/caja/resumen",
    }

    registered_paths = {route.path for route in app.routes}

    assert expected_paths.issubset(registered_paths)
