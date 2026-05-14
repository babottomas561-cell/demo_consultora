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


def test_infomanager_connector_maps_customer_documents_and_payments(monkeypatch):
    connector = InfomanagerConnector("client", "secret", "https://example.test")

    def fake_fetch(endpoint, params=None, max_pages=500):
        if endpoint == "/api/v1/reportes/comprob_pendientes_clientes":
            return [
                {
                    "id": 134667,
                    "cod_cliente": 7354,
                    "nombre": "Cliente Real",
                    "tipo_comprobante": "FA",
                    "numero": "81881",
                    "punto_de_venta": "2",
                    "fecha_factura": "2026-05-02",
                    "importe_factura": 1000,
                    "importe_pagado": 250,
                    "saldo": 750,
                    "cod_vendedor": 7,
                    "detalle": "1 BULTO",
                }
            ]
        if endpoint == "/api/v1/reportes/facturas_con_recibos":
            return [
                {
                    "fa_id": 134667,
                    "fa_fecha": "2026-05-02",
                    "fa_total": 1000,
                    "imp_pag_moneda_local": 600,
                    "importe": 600,
                    "cod_cliente": 7354,
                    "tipo_comp": "FA",
                    "fa_nro": 81881,
                    "fa_pto_vta": 2,
                    "rc_id": 90,
                    "rc_fecha": "2026-05-04",
                    "cond_pago": "EF",
                }
            ]
        return []

    monkeypatch.setattr(connector, "fetch_paginated", fake_fetch)

    docs, payments = connector.sync_comprobantes_clientes(date(2026, 5, 1), date(2026, 5, 10))

    assert docs["134667"]["cliente_id"] == "7354"
    assert docs["134667"]["importe_total"] == 1000.0
    assert docs["134667"]["importe_pagado"] == 600.0
    assert docs["134667"]["saldo"] == 400.0
    assert docs["134667"]["cod_vendedor"] == 7
    assert payments == [
        {
            "pago_id": "90",
            "comprobante_id": "134667",
            "fecha": "2026-05-04",
            "forma_pago": "EF",
            "importe": 600.0,
            "cod_cliente": 7354,
            "cliente_nombre": "",
        }
    ]


def test_infomanager_connector_maps_provider_documents_and_payments(monkeypatch):
    connector = InfomanagerConnector("client", "secret", "https://example.test")

    monkeypatch.setattr(
        connector,
        "fetch_paginated",
        lambda endpoint, params=None, max_pages=500: [
            {
                "cod_proveedor": 415,
                "nombre": "Proveedor Real",
                "fa_id": 122745,
                "fa_nro": 151173,
                "fa_pto_vta": 28,
                "fa_fecha": "2026-05-02",
                "fa_total": 1000,
                "op_imp_pagado": 250,
                "saldo_fa": 750,
                "nro_ultima_OP": 18,
                "ult_fec_vto": "2026-06-02",
            }
        ],
    )

    docs, payments = connector.sync_comprobantes_proveedores(date(2026, 5, 1), date(2026, 5, 10))

    assert docs == [
        {
            "comprobante_id": "122745",
            "proveedor_id": "415",
            "proveedor_nombre": "Proveedor Real",
            "tipo": "factura",
            "numero": "151173",
            "punto_de_venta": "28",
            "fecha": "2026-05-02",
            "fecha_vencimiento": "2026-06-02",
            "importe_total": 1000.0,
            "importe_pagado": 250.0,
            "saldo": 750.0,
            "detalle": None,
        }
    ]
    assert payments == [
        {
            "pago_id": "18",
            "comprobante_id": "122745",
            "fecha": None,
            "forma_pago": "OP",
            "importe": 250.0,
            "proveedor_id": "415",
            "proveedor_nombre": "Proveedor Real",
        }
    ]


def test_infomanager_connector_builds_seller_commissions_from_collected_documents(monkeypatch):
    connector = InfomanagerConnector("client", "secret", "https://example.test")

    docs = {
        "10": {
            "comprobante_id": "10",
            "cod_vendedor": 7,
            "vendedor_nombre": "Ana",
        }
    }
    payments = [
        {"comprobante_id": "10", "fecha": "2026-05-04", "importe": 1000.0},
        {"comprobante_id": "10", "fecha": "2026-05-12", "importe": 500.0},
    ]

    assert connector.build_comisiones_vendedores(docs, payments, {7: "Ana"}, 0.03) == [
        {
            "cod_vendedor": 7,
            "vendedor_nombre": "Ana",
            "periodo": "2026-05",
            "base_cobrada": 1500.0,
            "porcentaje": 0.03,
            "comision": 45.0,
            "recibos": 2,
        }
    ]


def test_infomanager_report_catalog_marks_supported_and_missing_reports():
    catalog = InfomanagerConnector.report_catalog()

    assert catalog["facturas_clientes"]["endpoint"] == "/api/v1/reportes/facturas"
    assert catalog["compras_por_factura"]["endpoint"] == "/api/v1/compras/compras-por-factura"
    assert catalog["mayor_contable"]["endpoint"] == "/api/v1/planes/mayor"
    assert catalog["cheques"]["supported"] is False
    assert "Swagger" in catalog["iva_balance"]["note"]


def test_infomanager_fetch_report_rows_builds_swagger_params(monkeypatch):
    connector = InfomanagerConnector("client", "secret", "https://example.test")
    calls = []

    def fake_fetch(endpoint, params=None, max_pages=500):
        calls.append((endpoint, params, max_pages))
        return [{"fa_id": 10}]

    monkeypatch.setattr(connector, "fetch_paginated", fake_fetch)

    rows = connector.fetch_report_rows("facturas_clientes", date(2026, 5, 1), date(2026, 5, 10), max_pages=7)

    assert rows == [{"fa_id": 10}]
    assert calls == [
        (
            "/api/v1/reportes/facturas",
            {"tag": "T", "codEmpresa": 0, "fechaDesde": "20260501", "fechaHasta": "20260510"},
            7,
        )
    ]


def test_infomanager_fetch_report_rows_builds_compras_por_factura_params(monkeypatch):
    connector = InfomanagerConnector("client", "secret", "https://example.test")
    calls = []

    monkeypatch.setattr(
        connector,
        "fetch_paginated",
        lambda endpoint, params=None, max_pages=500: calls.append((endpoint, params, max_pages)) or [{"id": 1}],
    )

    connector.fetch_report_rows("compras_por_factura", date(2026, 5, 1), date(2026, 5, 10))

    endpoint, params, _ = calls[0]
    assert endpoint == "/api/v1/compras/compras-por-factura"
    assert params["fecha_desde"] == "2026-05-01"
    assert params["fecha_hasta"] == "2026-05-10"
    assert params["cod_proveedor"] == 0
    assert params["centro_de_costo"] == "T"
