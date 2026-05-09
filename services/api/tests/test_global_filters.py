import os
import sys
from datetime import date


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.filters import GlobalFilters, text_filter_clause


def test_global_filters_parse_comma_values_and_exclusive_until():
    filters = GlobalFilters(
        desde="2025-05-01",
        hasta="2025-05-31",
        cod_vendedor="1,2",
        tipo_comprobante=["FA", "NC"],
    )

    assert filters.desde == date(2025, 5, 1)
    assert filters.hasta_exclusive == date(2025, 6, 1)
    assert filters.cod_vendedor == [1, 2]
    assert filters.tipo_comprobante == ["FA", "NC"]


def test_text_filter_clause_adds_supported_venta_filters():
    filters = GlobalFilters(
        desde="2025-05-01",
        hasta="2025-05-31",
        cod_vendedor=[3],
        cod_rubro=[1],
        incluir_anuladas=False,
    )

    clause = text_filter_clause("ventas", filters)

    assert "fecha >= :desde" in clause
    assert "fecha < :hasta" in clause
    assert "cod_vendedor = ANY(:cod_vendedor)" in clause
    assert "cod_rubro = ANY(:cod_rubro)" in clause
    assert "anulada <> 'S'" in clause
