import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[3]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.simulator.main import app


client = TestClient(app)


def login_token() -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"client_id": "demo_client", "client_secret": "demo_secret"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["token_type"] == "bearer"
    assert payload["expires_in"] == 86400
    return payload["access_token"]


def auth_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {login_token()}"}


def test_app_exposes_healthcheck() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_returns_bearer_token() -> None:
    token = login_token()

    assert token.startswith("fake_access_token_")


def test_data_endpoint_without_token_returns_401() -> None:
    response = client.get("/api/v1/clientes")

    assert response.status_code == 401


def test_data_endpoint_with_token_returns_data() -> None:
    response = client.get("/api/v1/empresas", headers=auth_headers())

    assert response.status_code == 200
    assert response.json()["data"][0]["nombre"] == "Distribuidora San Miguel S.A."


def test_ventas_respects_date_range() -> None:
    response = client.get(
        "/api/v1/ventas",
        params={"fechaDesde": "20230101", "fechaHasta": "20230131", "page": 1, "limit": 1000},
        headers=auth_headers(),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] > 0
    for row in payload["data"]:
        assert "2023-01-01" <= row["venta"]["fecha"] <= "2023-01-31"


def test_pagination_returns_requested_window() -> None:
    first_page = client.get(
        "/api/v1/clientes",
        params={"page": 1, "limit": 5},
        headers=auth_headers(),
    )
    second_page = client.get(
        "/api/v1/clientes",
        params={"page": 2, "limit": 5},
        headers=auth_headers(),
    )

    assert first_page.status_code == 200
    assert second_page.status_code == 200
    assert first_page.json()["limit"] == 5
    assert len(first_page.json()["data"]) == 5
    assert first_page.json()["data"][0]["cod_cliente"] != second_page.json()["data"][0]["cod_cliente"]


def test_page_zero_limit_zero_returns_total_only() -> None:
    response = client.get(
        "/api/v1/ventas/items",
        params={"fechaDesde": "20230101", "fechaHasta": "20231231", "page": 0, "limit": 0},
        headers=auth_headers(),
    )

    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {"total"}
    assert payload["total"] > 0
