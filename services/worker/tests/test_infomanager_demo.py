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
    }
    assert datos["ventas"]
    assert datos["compras"]
    assert datos["cta_cte_clientes"]
    assert datos["cta_cte_proveedores"]
    assert datos["movimientos_caja"]

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
