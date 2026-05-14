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


def test_infomanager_connector_maps_supplier_balances_from_facturas_compras(monkeypatch):
    connector = InfomanagerConnector("client", "secret", "https://example.test")

    def fake_fetch(endpoint, params=None, max_pages=500):
        assert endpoint == "/api/v1/reportes/facturas_compras"
        assert max_pages == 1
        assert params == {
            "fechaDesde": "20260501",
            "fechaHasta": "20260510",
            "tag": "T",
            "codEmpresa": 0,
            "codProveedor": 0,
        }
        return [
            {
                "cod_proveedor": 415,
                "nombre": "Proveedor Real",
                "fa_id": 122745,
                "fa_fecha": "2026-05-02",
                "fa_total": 1000,
                "op_imp_pagado": 250,
                "saldo_fa": 750,
                "ult_fec_vto": "2026-06-02",
            }
        ]

    monkeypatch.setattr(connector, "fetch_paginated", fake_fetch)

    saldos = connector.sync_saldos_proveedores(date(2026, 5, 1), date(2026, 5, 10))

    assert saldos == [
        {
            "proveedor_id": "415",
            "proveedor_nombre": "Proveedor Real",
            "comprobante_id": "factura-compra-122745",
            "tipo": "factura",
            "fecha": "2026-05-02",
            "importe": 750.0,
            "saldo_acumulado": 750.0,
            "fecha_vencimiento": "2026-06-02",
        }
    ]


def test_infomanager_connector_maps_recibos_from_facturas_con_recibos(monkeypatch):
    connector = InfomanagerConnector("client", "secret", "https://example.test")

    def fake_fetch(endpoint, params=None, max_pages=500):
        assert endpoint == "/api/v1/reportes/facturas_con_recibos"
        assert max_pages == 1
        assert params == {
            "fechaDesde": "20260501",
            "fechaHasta": "20260510",
            "tag": "T",
            "codEmpresa": 0,
        }
        return [
            {
                "rc_id": 90,
                "rc_fecha": "2026-05-03",
                "cod_cliente": 42,
                "cond_pago": "EF",
                "importe": 100,
                "fa_id": 10,
                "rc_nro": 123,
            },
            {
                "rc_id": 90,
                "rc_fecha": "2026-05-03",
                "cod_cliente": 42,
                "cond_pago": "EF",
                "importe": 25.55,
                "fa_id": 11,
                "rc_nro": 123,
            },
        ]

    monkeypatch.setattr(connector, "fetch_paginated", fake_fetch)

    recibos = connector.sync_recibos(date(2026, 5, 1), date(2026, 5, 10))

    assert recibos == [
        {
            "id": 90,
            "fecha": "2026-05-03",
            "cod_cliente": 42,
            "cliente_nombre": "",
            "forma_pago": "EF",
            "importe": 125.55,
            "factura_id": 10,
            "tarjeta_numero": None,
            "tarjeta_cupon": "123",
        }
    ]


def test_infomanager_connector_maps_depositos(monkeypatch):
    connector = InfomanagerConnector("client", "secret", "https://example.test")

    monkeypatch.setattr(
        connector,
        "fetch_paginated",
        lambda endpoint, params=None, max_pages=500: [{"cod_deposito": 1, "descripcion": "CAMARA"}],
    )

    assert connector.sync_depositos() == [
        {"cod_deposito": 1, "nombre": "CAMARA", "habilitado": True}
    ]
