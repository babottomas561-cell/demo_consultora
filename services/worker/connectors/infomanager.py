from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import requests


DEFAULT_BASE_URL = "https://impedidos.infomanager.com.ar"


def _as_int(value: Any, default: int = 0) -> int:
    if value in (None, ""):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _as_float(value: Any, default: float = 0.0) -> float:
    if value in (None, ""):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class InfomanagerConnector:
    def __init__(self, client_id: str, client_secret: str, base_url: str | None = None):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self.token: str | None = None
        self.token_expires: datetime | None = None

    def authenticate(self) -> None:
        response = requests.post(
            f"{self.base_url}/api/v1/auth",
            json={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        self.token = data["access_token"]
        self.token_expires = datetime.now(timezone.utc) + timedelta(hours=23)

    def ensure_token(self) -> None:
        if not self.token or not self.token_expires or datetime.now(timezone.utc) > self.token_expires:
            self.authenticate()

    def headers(self) -> dict[str, str]:
        self.ensure_token()
        return {"Authorization": f"Bearer {self.token}"}

    @staticmethod
    def _extract_items(payload: Any) -> list[dict[str, Any]]:
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("data", "items", "results"):
                value = payload.get(key)
                if isinstance(value, list):
                    return value
        return []

    def fetch_paginated(self, endpoint: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        self.ensure_token()
        all_items: list[dict[str, Any]] = []
        page = 1
        while True:
            request_params = {**(params or {}), "page": page, "limit": 100}
            resp = requests.get(
                f"{self.base_url}{endpoint}",
                headers=self.headers(),
                params=request_params,
                timeout=60,
            )
            resp.raise_for_status()
            items = self._extract_items(resp.json())
            if not items:
                break
            all_items.extend(items)
            if len(items) < 100:
                break
            page += 1
        return all_items

    def sync_vendedores(self) -> list[dict[str, Any]]:
        data = self.fetch_paginated("/api/v1/vendedores")
        return [
            {
                "cod_vendedor": _as_int(v.get("cod_vendedor")),
                "nombre": v.get("nombre") or f"Vendedor {v.get('cod_vendedor')}",
                "habilitado": v.get("inactivo", "N") != "S",
            }
            for v in data
        ]

    def sync_clientes(self) -> list[dict[str, Any]]:
        return []

    def sync_articulos(self) -> tuple[list[dict[str, Any]], dict[int, str], dict[int, dict[str, Any]]]:
        data = self.fetch_paginated("/api/v1/articulos")
        articulos: list[dict[str, Any]] = []
        rubros: dict[int, str] = {}
        subrubros: dict[int, dict[str, Any]] = {}
        for a in data:
            cod_rubro = _as_int(a.get("cod_rubro"))
            cod_subrubro = _as_int(a.get("cod_subrubro"))
            articulos.append(
                {
                    "cod_articulo": str(a.get("cod_articulo", "")),
                    "descripcion": a.get("descripcion") or a.get("detalle") or "",
                    "cod_rubro": cod_rubro,
                    "cod_subrubro": cod_subrubro,
                    "precio_compra": _as_float(a.get("precio_compra")),
                    "precio_venta": _as_float(a.get("precio_venta")),
                    "iva": _as_float(a.get("iva"), 21.0),
                    "habilitado": str(a.get("habilitado", "1")) == "1",
                }
            )
            if cod_rubro:
                rubros[cod_rubro] = a.get("rubro") or a.get("nombre_rubro") or f"Rubro {cod_rubro}"
            if cod_subrubro:
                subrubros[cod_subrubro] = {
                    "cod_subrubro": cod_subrubro,
                    "cod_rubro": cod_rubro or None,
                    "nombre": a.get("subrubro") or a.get("nombre_subrubro") or f"Subrubro {cod_subrubro}",
                }
        return articulos, rubros, subrubros

    def sync_stock(self) -> list[dict[str, Any]]:
        data = self.fetch_paginated("/api/v1/articulos/stock")
        return [
            {
                "cod_articulo": _as_int(s.get("cod_articulo")),
                "cod_deposito": _as_int(s.get("cod_deposito"), 1),
                "cantidad": _as_float(s.get("cantidad")),
                "precio_compra_actual": _as_float(s.get("precio_compra")),
            }
            for s in data
        ]

    def sync_ventas(self, fecha_desde, fecha_hasta) -> list[dict[str, Any]]:
        data = self.fetch_paginated(
            "/api/v1/ventas",
            {
                "fechaDesde": fecha_desde.strftime("%Y%m%d"),
                "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
            },
        )
        ventas: list[dict[str, Any]] = []
        for v in data:
            cab = v.get("venta", v)
            items = v.get("items", [])
            for item in items:
                ventas.append(
                    {
                        "fecha": cab["fecha"],
                        "cliente_id": str(cab.get("cod_cliente", 0)),
                        "cliente_nombre": cab.get("cliente_nombre") or cab.get("razon_social") or "",
                        "producto_id": str(item.get("cod_articulo", "")),
                        "producto_nombre": item.get("detalle") or item.get("descripcion") or "",
                        "cantidad": _as_float(item.get("cantidad")),
                        "precio_unitario": _as_float(item.get("precio")),
                        "total": _as_float(item.get("importe")),
                        "tipo_comprobante": cab.get("tipo_comprobante", "FA"),
                        "tipo_factura": cab.get("tipo_factura"),
                        "punto_de_venta": _as_int(cab.get("punto_de_venta")),
                        "cod_vendedor": _as_int(cab.get("cod_vendedor")),
                        "cod_empresa": _as_int(cab.get("cod_empresa"), 1),
                        "tag": cab.get("tag", "S"),
                        "condicion_venta_tipo": _as_int(cab.get("condicion_venta_tipo"), 1),
                        "neto": _as_float(cab.get("neto")),
                        "iva_importe": _as_float(cab.get("iva_importe")),
                        "anulada": cab.get("anulada", "N"),
                        "cod_deposito": _as_int(cab.get("cod_deposito"), 1),
                        "cod_rubro": _as_int(item.get("cod_rubro")) if "cod_rubro" in item else None,
                        "precio_compra_actual": _as_float(item.get("precio_compra_actual")),
                        "descuento_porc": _as_float(item.get("descuento_porc")),
                    }
                )
        return ventas

    def sync_compras(self, fecha_desde, fecha_hasta) -> list[dict[str, Any]]:
        data = self.fetch_paginated(
            "/api/v1/compras",
            {
                "fechaDesde": fecha_desde.strftime("%Y%m%d"),
                "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
            },
        )
        compras: list[dict[str, Any]] = []
        for c in data:
            cab = c.get("compra", c)
            items = c.get("items", [])
            for item in items:
                compras.append(
                    {
                        "fecha": cab["fecha"],
                        "proveedor_id": str(cab.get("cod_proveedor", 0)),
                        "proveedor_nombre": cab.get("proveedor_nombre") or cab.get("razon_social") or "",
                        "producto_id": str(item.get("cod_articulo", "")),
                        "producto_nombre": item.get("detalle") or item.get("descripcion") or "",
                        "cantidad": _as_float(item.get("cantidad")),
                        "precio_unitario": _as_float(item.get("precio")),
                        "total": _as_float(item.get("importe")),
                    }
                )
        return compras

    def sync_saldos_clientes(self) -> list[dict[str, Any]]:
        data = self.fetch_paginated(
            "/api/v1/reportes/saldos_clientes",
            {"TAG": "T", "codcliente": 0, "codEmpresa": 0},
        )
        return data

    def sync_saldos_proveedores(self) -> list[dict[str, Any]]:
        data = self.fetch_paginated(
            "/api/v1/reportes/saldos_proveedores",
            {"TAG": "T", "codProveedor": 0, "codEmpresa": 0},
        )
        return data

    def sync_presupuestos(self, fecha_desde, fecha_hasta) -> list[dict[str, Any]]:
        data = self.fetch_paginated(
            "/api/v1/presupuestos",
            {
                "fechaDesde": fecha_desde.strftime("%Y%m%d"),
                "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
            },
        )
        presupuestos: list[dict[str, Any]] = []
        for p in data:
            cab = p.get("presupuesto", p)
            presupuestos.append(
                {
                    "id": _as_int(cab.get("id") or cab.get("numero") or cab.get("nro_comprobante")),
                    "fecha": cab.get("fecha"),
                    "cod_cliente": _as_int(cab.get("cod_cliente")),
                    "cliente_nombre": cab.get("cliente_nombre") or cab.get("razon_social"),
                    "cod_vendedor": _as_int(cab.get("cod_vendedor")),
                    "total": _as_float(cab.get("total") or cab.get("importe")),
                    "confirmado": str(cab.get("confirmado", "N")) in {"S", "1", "true", "True"},
                    "fecha_conversion": cab.get("fecha_conversion"),
                    "venta_id": _as_int(cab.get("venta_id")) or None,
                }
            )
        return [p for p in presupuestos if p["id"]]
