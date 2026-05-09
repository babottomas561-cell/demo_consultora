import datetime
import math
import os
import sys


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from connectors.infomanager_demo import InfomanagerDemoConector


def test_infomanager_demo_keeps_sales_generation_compatibility():
    connector = InfomanagerDemoConector()
    desde = datetime.datetime(2025, 1, 1)
    hasta = datetime.datetime(2025, 1, 15)

    ventas = connector.generar_ventas_periodo(desde, hasta)
    datos = connector.generar_datos_periodo(desde, hasta)
    ventas_ahora = connector.generar_ventas_ahora(3)

    assert len(ventas) == len(datos["ventas"])
    assert len(ventas) > 0
    assert len(ventas_ahora) == 3


def test_infomanager_demo_generates_coherent_analytics_data():
    connector = InfomanagerDemoConector()
    desde = datetime.datetime(2025, 1, 1)
    hasta = datetime.datetime(2025, 3, 31, 23)

    datos = connector.generar_datos_periodo(desde, hasta)

    assert set(datos) == {
        "ventas",
        "compras",
        "cta_cte_clientes",
        "cta_cte_proveedores",
        "movimientos_caja",
        "vendedores",
        "puntos_de_venta",
        "depositos",
        "rubros",
        "subrubros",
        "presupuestos",
        "recibos",
        "stock",
    }
    assert datos["ventas"]
    assert datos["compras"]
    assert datos["cta_cte_clientes"]
    assert datos["cta_cte_proveedores"]
    assert datos["movimientos_caja"]
    assert len(datos["vendedores"]) == 5
    assert len(datos["puntos_de_venta"]) == 3
    assert len(datos["depositos"]) == 2
    assert len(datos["rubros"]) == 8
    assert len(datos["subrubros"]) == 14
    assert len(datos["presupuestos"]) == 200
    assert len(datos["stock"]) == 28
    assert all(row["cantidad"] >= 0 for row in datos["stock"])

    venta = datos["ventas"][0]
    assert getattr(venta, "tipo_comprobante") in {"FA", "NC", "ND"}
    assert getattr(venta, "cod_vendedor") in {1, 2, 3, 4, 5}
    assert getattr(venta, "punto_de_venta") in {1, 2, 3}
    assert getattr(venta, "cod_deposito") in {1, 2}
    assert getattr(venta, "precio_compra_actual") > 0

    ventas_total = sum(v.total for v in datos["ventas"])
    facturas_clientes = sum(
        row["importe"]
        for row in datos["cta_cte_clientes"]
        if row["tipo"] == "factura"
    )
    compras_total = sum(row["total"] for row in datos["compras"])
    facturas_proveedores = sum(
        row["importe"]
        for row in datos["cta_cte_proveedores"]
        if row["tipo"] == "factura"
    )
    recibos_clientes = sum(
        row["importe"]
        for row in datos["cta_cte_clientes"]
        if row["tipo"] == "recibo"
    )
    cobros_caja = sum(
        row["importe"]
        for row in datos["movimientos_caja"]
        if row["tipo"] == "cobro"
    )

    assert math.isclose(ventas_total, facturas_clientes, rel_tol=0.0001)
    assert math.isclose(compras_total, facturas_proveedores, rel_tol=0.0001)
    assert math.isclose(cobros_caja, abs(recibos_clientes), rel_tol=0.0001)
