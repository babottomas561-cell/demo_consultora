import os
import sys
from datetime import date


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from connectors.infomanager import InfomanagerConnector


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def test_infomanager_connector_authenticates_and_fetches_paginated_data(monkeypatch):
    calls = []

    def fake_post(url, json, timeout):
        calls.append(("post", url, json, timeout))
        return FakeResponse({"access_token": "token-123"})

    def fake_get(url, headers, params, timeout):
        calls.append(("get", url, headers, params, timeout))
        page = params["page"]
        payload = [{"cod_vendedor": "1", "nombre": "Ana", "inactivo": "N"}] if page == 1 else []
        return FakeResponse(payload)

    monkeypatch.setattr("connectors.infomanager.requests.post", fake_post)
    monkeypatch.setattr("connectors.infomanager.requests.get", fake_get)

    connector = InfomanagerConnector("client", "secret", "https://example.test")
    vendedores = connector.sync_vendedores()

    assert vendedores == [{"cod_vendedor": 1, "nombre": "Ana", "habilitado": True}]
    assert calls[0] == (
        "post",
        "https://example.test/api/v1/auth/login",
        {"client_id": "client", "client_secret": "secret"},
        30,
    )
    assert calls[1][0] == "get"
    assert calls[1][2] == {"Authorization": "Bearer token-123"}
    assert calls[1][3] == {"page": 1, "limit": 100}


def test_infomanager_connector_maps_ventas_items_to_tenant_rows(monkeypatch):
    header_payload = [
        {
            "id": "10",
            "fecha": "2026-05-09T10:00:00",
            "cod_cliente": 42,
            "tipo_comprobante": "FA",
            "tipo_factura": "A",
            "punto_de_venta": 3,
            "cod_vendedor": 7,
            "cod_empresa": 1,
            "tag": "S",
            "condicion_venta_tipo": 2,
            "neto": -100,
            "iva_importe": -21,
            "anulada": "N",
            "cod_deposito": 5,
        }
    ]
    item_payload = [
        {
            "id_comprobante": "10",
            "cod_articulo": "1001",
            "detalle": "Producto",
            "cantidad": -2,
            "precio": -60.5,
            "importe": -121,
            "cod_rubro": 9,
            "precio_compra_actual": 40,
            "descuento_porc": 5,
        },
        {
            "id_comprobante": "999",
            "cod_articulo": "1002",
            "detalle": "Sin cabecera",
            "cantidad": 1,
            "precio": 1,
            "importe": 1,
        },
    ]

    connector = InfomanagerConnector("client", "secret", "https://example.test")

    def fake_fetch(endpoint, params=None):
        if endpoint == "/api/v1/ventas":
            return header_payload
        if endpoint == "/api/v1/ventas/items":
            return item_payload
        return []

    monkeypatch.setattr(connector, "fetch_paginated", fake_fetch)

    ventas = connector.sync_ventas(date(2026, 5, 1), date(2026, 5, 10))

    assert ventas == [
        {
            "fecha": "2026-05-09T10:00:00",
            "cliente_id": "42",
            "cliente_nombre": "",
            "producto_id": "1001",
            "producto_nombre": "Producto",
            "cantidad": 2.0,
            "precio_unitario": 60.5,
            "total": 121.0,
            "tipo_comprobante": "FA",
            "tipo_factura": "A",
            "punto_de_venta": 3,
            "cod_vendedor": 7,
            "cod_empresa": 1,
            "tag": "S",
            "condicion_venta_tipo": 2,
            "neto": 100.0,
            "iva_importe": 21.0,
            "anulada": "N",
            "cod_deposito": 5,
            "cod_rubro": 9,
            "precio_compra_actual": 40.0,
            "descuento_porc": 5.0,
        }
    ]
