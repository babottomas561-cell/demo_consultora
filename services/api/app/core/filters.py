from datetime import date, timedelta
from typing import Any

from fastapi import Query
from pydantic import BaseModel, Field, field_validator


def _default_desde() -> date:
    return date.today() - timedelta(days=365)


def _default_hasta() -> date:
    return date.today()


class GlobalFilters(BaseModel):
    desde: date = Field(default_factory=_default_desde)
    hasta: date = Field(default_factory=_default_hasta)
    comparar_anterior: bool = False
    cod_empresa: list[int] | None = None
    tag: list[str] | None = None
    punto_de_venta: list[int] | None = None
    cod_vendedor: list[int] | None = None
    cod_rubro: list[int] | None = None
    cod_subrubro: list[int] | None = None
    tipo_comprobante: list[str] | None = None
    condicion_venta: list[int] | None = None
    cod_cliente: list[int] | None = None
    cod_articulo: list[int] | None = None
    cod_deposito: list[int] | None = None
    incluir_anuladas: bool = False

    @field_validator(
        "cod_empresa",
        "tag",
        "punto_de_venta",
        "cod_vendedor",
        "cod_rubro",
        "cod_subrubro",
        "tipo_comprobante",
        "condicion_venta",
        "cod_cliente",
        "cod_articulo",
        "cod_deposito",
        mode="before",
    )
    @classmethod
    def split_comma_values(cls, value: Any):
        if value is None or value == "":
            return None
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, list):
            expanded = []
            for item in value:
                if isinstance(item, str) and "," in item:
                    expanded.extend(part.strip() for part in item.split(",") if part.strip())
                elif item not in (None, ""):
                    expanded.append(item)
            return expanded or None
        return value

    @property
    def hasta_exclusive(self) -> date:
        return self.hasta + timedelta(days=1)

    def sql_params(self) -> dict[str, Any]:
        return {
            "desde": self.desde,
            "hasta": self.hasta_exclusive,
            "cod_empresa": self.cod_empresa,
            "tag": self.tag,
            "punto_de_venta": self.punto_de_venta,
            "cod_vendedor": self.cod_vendedor,
            "cod_rubro": self.cod_rubro,
            "cod_subrubro": self.cod_subrubro,
            "tipo_comprobante": self.tipo_comprobante,
            "condicion_venta": self.condicion_venta,
            "cod_cliente": self.cod_cliente,
            "cod_cliente_text": [str(item) for item in self.cod_cliente or []],
            "cod_articulo": self.cod_articulo,
            "cod_articulo_text": [str(item) for item in self.cod_articulo or []],
            "cod_deposito": self.cod_deposito,
        }


def get_global_filters(
    desde: date | None = None,
    hasta: date | None = None,
    comparar_anterior: bool = False,
    cod_empresa: list[int] | None = Query(default=None),
    tag: list[str] | None = Query(default=None),
    punto_de_venta: list[int] | None = Query(default=None),
    cod_vendedor: list[int] | None = Query(default=None),
    cod_rubro: list[int] | None = Query(default=None),
    cod_subrubro: list[int] | None = Query(default=None),
    tipo_comprobante: list[str] | None = Query(default=None),
    condicion_venta: list[int] | None = Query(default=None),
    cod_cliente: list[int] | None = Query(default=None),
    cod_articulo: list[int] | None = Query(default=None),
    cod_deposito: list[int] | None = Query(default=None),
    incluir_anuladas: bool = False,
) -> GlobalFilters:
    return GlobalFilters(
        desde=desde or _default_desde(),
        hasta=hasta or _default_hasta(),
        comparar_anterior=comparar_anterior,
        cod_empresa=cod_empresa,
        tag=tag,
        punto_de_venta=punto_de_venta,
        cod_vendedor=cod_vendedor,
        cod_rubro=cod_rubro,
        cod_subrubro=cod_subrubro,
        tipo_comprobante=tipo_comprobante,
        condicion_venta=condicion_venta,
        cod_cliente=cod_cliente,
        cod_articulo=cod_articulo,
        cod_deposito=cod_deposito,
        incluir_anuladas=incluir_anuladas,
    )


def apply_filters(query, filters: GlobalFilters, column_map: dict[str, Any]):
    fecha_col = column_map.get("fecha")
    if fecha_col is not None:
        query = query.where(fecha_col >= filters.desde).where(fecha_col < filters.hasta_exclusive)

    filter_values = {
        "cod_empresa": filters.cod_empresa,
        "tag": filters.tag,
        "punto_de_venta": filters.punto_de_venta,
        "cod_vendedor": filters.cod_vendedor,
        "cod_rubro": filters.cod_rubro,
        "cod_subrubro": filters.cod_subrubro,
        "tipo_comprobante": filters.tipo_comprobante,
        "condicion_venta": filters.condicion_venta,
        "cod_cliente": filters.cod_cliente,
        "cod_articulo": filters.cod_articulo,
        "cod_deposito": filters.cod_deposito,
    }
    for key, value in filter_values.items():
        col = column_map.get(key)
        if col is not None and value:
            query = query.where(col.in_(value))

    anulada_col = column_map.get("anulada")
    if anulada_col is not None and not filters.incluir_anuladas:
        query = query.where(anulada_col != "S")

    return query


TEXT_FILTER_COLUMNS = {
    "ventas": {
        "cod_empresa": "cod_empresa",
        "tag": "tag",
        "punto_de_venta": "punto_de_venta",
        "cod_vendedor": "cod_vendedor",
        "cod_rubro": "cod_rubro",
        "cod_subrubro": "cod_subrubro",
        "tipo_comprobante": "tipo_comprobante",
        "condicion_venta": "condicion_venta_tipo",
        "cod_deposito": "cod_deposito",
        "anulada": "anulada",
    },
    "stock": {
        "cod_articulo": "cod_articulo",
        "cod_deposito": "cod_deposito",
    },
    "compras": {
        "cod_empresa": "cod_empresa",
        "cod_deposito": "cod_deposito",
        "anulada": "anulada",
    },
    "presupuestos": {
        "cod_cliente": "cod_cliente",
        "cod_vendedor": "cod_vendedor",
    },
    "recibos": {
        "cod_cliente": "cod_cliente",
    },
}


def text_filter_clause(table_name: str, filters: GlobalFilters, date_col: str = "fecha") -> str:
    clauses = [f"{date_col} >= :desde", f"{date_col} < :hasta"]
    columns = TEXT_FILTER_COLUMNS.get(table_name, {})

    for key, column_name in columns.items():
        if key == "anulada":
            continue
        if getattr(filters, key, None):
            clauses.append(f"{column_name} = ANY(:{key})")

    if "anulada" in columns and not filters.incluir_anuladas:
        clauses.append(f"{columns['anulada']} <> 'S'")

    if table_name == "ventas":
        if filters.cod_cliente:
            clauses.append("cliente_id = ANY(:cod_cliente_text)")
        if filters.cod_articulo:
            clauses.append("producto_id = ANY(:cod_articulo_text)")
    elif table_name == "compras":
        if filters.cod_cliente:
            clauses.append("proveedor_id = ANY(:cod_cliente_text)")
        if filters.cod_articulo:
            clauses.append("producto_id = ANY(:cod_articulo_text)")

    return " AND ".join(clauses)
