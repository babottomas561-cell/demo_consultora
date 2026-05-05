from __future__ import annotations

from datetime import date
from typing import Any


def _to_int(value: Any, default: int | None = None) -> int | None:
    if value in (None, ""):
        return default
    return int(value)


def _to_float(value: Any, default: float = 0.0) -> float:
    if value in (None, ""):
        return default
    return float(value)


def _to_date(value: Any) -> date | None:
    if not value:
        return None
    return date.fromisoformat(str(value))


def adapt_customer(row: dict[str, Any], data_source_id: int) -> dict[str, Any]:
    return {
        "source_id": data_source_id,
        "cod_cliente": _to_int(row.get("cod_cliente"), 0),
        "nombre": row.get("nombre") or "",
        "razon_social": row.get("razon_social"),
        "categoria_iva": row.get("categoria_iva"),
        "cuit": row.get("cuit"),
        "email": row.get("email"),
        "cod_vendedor": _to_int(row.get("cod_vendedor")),
        "lista_precio": _to_int(row.get("lista_precio")),
        "domicilio": row.get("domicilio"),
        "telefonos": row.get("telefonos"),
        "condicion_venta": _to_int(row.get("condicion_venta")),
        "fecha_alta": _to_date(row.get("fecha_alta")),
        "raw": row,
    }


def adapt_product(row: dict[str, Any], data_source_id: int) -> dict[str, Any]:
    return {
        "source_id": data_source_id,
        "cod_articulo": _to_int(row.get("cod_articulo"), 0),
        "descripcion": row.get("descripcion") or "",
        "descripcion_corta": row.get("descripcion_corta"),
        "cod_rubro": _to_int(row.get("cod_rubro")),
        "cod_subrubro": _to_int(row.get("cod_subrubro")),
        "cod_barra": row.get("cod_barra"),
        "iva": _to_float(row.get("iva")),
        "moneda": row.get("moneda"),
        "precio_compra": _to_float(row.get("precio_compra")),
        "precio_venta": _to_float(row.get("precio_venta")),
        "habilitado": str(row.get("habilitado", "1")),
        "raw": row,
    }


def adapt_sale(entry: dict[str, Any], data_source_id: int) -> dict[str, Any]:
    row = entry.get("venta", entry)
    return {
        "source_id": data_source_id,
        "source_sale_id": _to_int(row.get("id"), 0),
        "fecha": _to_date(row.get("fecha")),
        "tipo_comprobante": row.get("tipo_comprobante"),
        "tipo_factura": row.get("tipo_factura"),
        "numero": _to_int(row.get("numero")),
        "punto_de_venta": _to_int(row.get("punto_de_venta")),
        "total": _to_float(row.get("total")),
        "neto": _to_float(row.get("neto")),
        "iva_importe": _to_float(row.get("iva_importe")),
        "cod_cliente": _to_int(row.get("cod_cliente")),
        "cod_vendedor": _to_int(row.get("cod_vendedor")),
        "cod_empresa": _to_int(row.get("cod_empresa"), 1),
        "moneda": row.get("moneda"),
        "cotizacion": _to_float(row.get("cotizacion"), 1.0),
        "anulada": row.get("anulada", "N"),
        "raw": row,
    }


def adapt_sale_item(row: dict[str, Any], data_source_id: int) -> dict[str, Any]:
    return {
        "source_id": data_source_id,
        "source_item_id": _to_int(row.get("id"), 0),
        "source_sale_id": _to_int(row.get("id_comprobante"), 0),
        "fecha": _to_date(row.get("fecha")),
        "cod_cliente": _to_int(row.get("cod_cliente")),
        "cod_vendedor": _to_int(row.get("cod_vendedor")),
        "cod_empresa": _to_int(row.get("cod_empresa"), 1),
        "cod_articulo": _to_int(row.get("cod_articulo")),
        "detalle": row.get("detalle"),
        "cantidad": _to_float(row.get("cantidad")),
        "precio": _to_float(row.get("precio")),
        "precio_con_iva": _to_float(row.get("precio_con_iva")),
        "precio_compra_actual": _to_float(row.get("precio_compra_actual")),
        "iva_por": _to_float(row.get("iva_por")),
        "importe": _to_float(row.get("importe")),
        "cod_barra": row.get("cod_barra"),
        "raw": row,
    }
