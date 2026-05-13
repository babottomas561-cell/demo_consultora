from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import requests


DEFAULT_BASE_URL = "https://impedidos.infomanager.com.ar"

_TIPO_COMPROBANTE_MAP = {
    "1": "FA", "2": "ND", "3": "NC",
    "6": "FA", "7": "ND", "8": "NC",
    "11": "FA", "12": "ND", "13": "NC",
    "factura": "FA", "nota de credito": "NC", "nota de debito": "ND",
    "nota credito": "NC", "nota debito": "ND",
    "notacredito": "NC", "notadebito": "ND",
    "fa": "FA", "nc": "NC", "nd": "ND",
    "fac": "FA", "n/c": "NC", "n/d": "ND",
}


def _normalize_tipo_comprobante(raw: Any) -> str:
    if not raw:
        return "FA"
    key = str(raw).strip().lower()
    return _TIPO_COMPROBANTE_MAP.get(key, str(raw).upper()[:2])


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
            f"{self.base_url}/api/v1/auth/login",
            json={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        # API returns token under different keys depending on version
        self.token = data.get("access_token") or data.get("token") or data.get("accessToken")
        if not self.token:
            raise ValueError(f"No token in auth response. Keys: {list(data.keys())}")
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
            for key in ("data", "items", "results", "lComprasItems", "lVentasItems"):
                value = payload.get(key)
                if isinstance(value, list):
                    return value
        return []

    def fetch_paginated(self, endpoint: str, params: dict[str, Any] | None = None, max_pages: int = 500) -> list[dict[str, Any]]:
        self.ensure_token()
        all_items: list[dict[str, Any]] = []
        page = 1
        while page <= max_pages:
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
            # Detect APIs that ignore pagination params (return same data on every page)
            if page > 1 and all_items and items[0] == all_items[0]:
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
                # API returns current stock in "existencia", not "cantidad"
                "cantidad": _as_float(s.get("existencia") or s.get("cantidad")),
                "precio_compra_actual": _as_float(s.get("precio_compra")),
            }
            for s in data
        ]

    def sync_ventas(self, fecha_desde, fecha_hasta) -> list[dict[str, Any]]:
        # Items endpoint lacks header fields (fecha, cod_cliente, etc.) — must join.
        # Headers are indexed by id; items reference them via id_comprobante.
        params = {
            "fechaDesde": fecha_desde.strftime("%Y%m%d"),
            "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
        }
        headers_raw = self.fetch_paginated("/api/v1/ventas", params)
        headers = {
            _as_int(h.get("id")): h
            for h in headers_raw
            if _as_int(h.get("id"))
        }

        items_raw = self.fetch_paginated("/api/v1/ventas/items", params)

        # Valid tipos for the ventas analytics table — the items endpoint returns documents
        # from ALL modules (presupuestos→PR, recibos→RE, interdepósito→IR, etc.).
        # Only FA/NC/ND belong in ventas; the rest would corrupt KPIs.
        _VALID_TIPOS = {"FA", "NC", "ND"}

        ventas: list[dict[str, Any]] = []
        for item in items_raw:
            cab = headers.get(_as_int(item.get("id_comprobante")))
            if not cab:
                continue
            tipo = _normalize_tipo_comprobante(cab.get("tipo_comprobante"))

            # Skip non-sales document types contaminating the items endpoint
            if tipo not in _VALID_TIPOS:
                continue

            # Normalize sign: Infomanager may return negative importe for FA (debit convention).
            # Store all amounts as absolute values; tipo_comprobante carries the semantic sign.
            ventas.append(
                {
                    "fecha": cab.get("fecha"),
                    "cliente_id": str(cab.get("cod_cliente") or 0),
                    "cliente_nombre": cab.get("cliente_nombre") or cab.get("razon_social") or "",
                    "producto_id": str(item.get("cod_articulo") or ""),
                    "producto_nombre": item.get("detalle") or item.get("descripcion") or "",
                    "cantidad": abs(_as_float(item.get("cantidad"))),
                    "precio_unitario": abs(_as_float(item.get("precio"))),
                    "total": abs(_as_float(item.get("importe"))),
                    "tipo_comprobante": tipo,
                    "tipo_factura": cab.get("tipo_factura"),
                    "punto_de_venta": _as_int(cab.get("punto_de_venta")),
                    "cod_vendedor": _as_int(cab.get("cod_vendedor") or item.get("cod_vendedor")),
                    "cod_empresa": _as_int(cab.get("cod_empresa"), 1),
                    "tag": cab.get("tag", "S"),
                    "condicion_venta_tipo": _as_int(cab.get("condicion_venta_tipo"), 1),
                    "neto": abs(_as_float(cab.get("neto"))),
                    "iva_importe": abs(_as_float(cab.get("iva_importe"))),
                    "anulada": cab.get("anulada", "N"),
                    "cod_deposito": _as_int(cab.get("cod_deposito"), 1),
                    "cod_rubro": _as_int(item.get("cod_rubro")) if item.get("cod_rubro") is not None else None,
                    "precio_compra_actual": _as_float(item.get("precio_compra_actual")),
                    "descuento_porc": _as_float(item.get("descuento_porc") or item.get("descuento")),
                }
            )
        return ventas

    def sync_compras(self, fecha_desde, fecha_hasta) -> list[dict[str, Any]]:
        # Items endpoint lacks header fields (fecha, cod_proveedor) — must join.
        params = {
            "fechaDesde": fecha_desde.strftime("%Y%m%d"),
            "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
        }
        headers_raw = self.fetch_paginated("/api/v1/compras", params)
        headers = {
            _as_int(h.get("id")): h
            for h in headers_raw
            if _as_int(h.get("id"))
        }

        items_raw = self.fetch_paginated("/api/v1/compras/items", params)

        compras: list[dict[str, Any]] = []
        for item in items_raw:
            cab = headers.get(_as_int(item.get("id_comprobante")))
            if not cab:
                continue
            compras.append(
                {
                    "fecha": cab.get("fecha"),
                    "proveedor_id": str(cab.get("cod_proveedor") or 0),
                    "proveedor_nombre": cab.get("proveedor") or cab.get("proveedor_nombre") or "",
                    "producto_id": str(item.get("cod_articulo") or ""),
                    "producto_nombre": item.get("detalle") or item.get("descripcion") or "",
                    "cantidad": _as_float(item.get("cantidad")),
                    "precio_unitario": _as_float(item.get("precio")),
                    "total": _as_float(item.get("importe")),
                }
            )
        return compras

    def sync_saldos_clientes(self) -> list[dict[str, Any]]:
        # Returns one summary row per client: {cod_cliente, nombre, tot_saldo, tot_entrada, tot_salida, dias_deuda}
        data = self.fetch_paginated(
            "/api/v1/reportes/saldos_clientes",
            {"TAG": "T", "codcliente": 0, "codEmpresa": 0},
        )
        results = []
        for row in data:
            cod_cliente = str(row.get("cod_cliente") or 0)
            tot_saldo = _as_float(row.get("tot_saldo"))
            results.append({
                "cliente_id": cod_cliente,
                "cliente_nombre": row.get("nombre") or f"Cliente {cod_cliente}",
                "comprobante_id": f"saldo-{cod_cliente}",
                "tipo": "saldo",
                "fecha": row.get("fecha") or None,
                "importe": tot_saldo,
                "saldo_acumulado": tot_saldo,
                "fecha_vencimiento": None,
            })
        return results

    def sync_saldos_proveedores(self) -> list[dict[str, Any]]:
        # Infomanager v2 API has no saldos_proveedores report endpoint.
        # Proveedores balances must be derived from compras data.
        return []

    def sync_presupuestos(self, fecha_desde, fecha_hasta) -> list[dict[str, Any]]:
        # API has /confirmados and /no_confirmados — no base /presupuestos endpoint.
        # Confirmed ones return {"venta": {...}} since they converted to sales.
        params = {
            "fechaDesde": fecha_desde.strftime("%Y%m%d"),
            "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
        }
        confirmados = self.fetch_paginated("/api/v1/presupuestos/confirmados", params)
        no_confirmados = self.fetch_paginated("/api/v1/presupuestos/no_confirmados", params)

        presupuestos: list[dict[str, Any]] = []

        def _map_presupuesto(p: dict, confirmado: bool) -> dict | None:
            # Both endpoints return {"venta": {...}} — no "presupuesto" key, no "total" field
            cab = p.get("venta") or p
            pid = _as_int(cab.get("id") or cab.get("numero") or cab.get("nro_comprobante"))
            if not pid:
                return None
            return {
                "id": pid,
                "fecha": cab.get("fecha"),
                "cod_cliente": _as_int(cab.get("cod_cliente")),
                "cliente_nombre": cab.get("cliente") or cab.get("cliente_nombre") or cab.get("razon_social"),
                "cod_vendedor": _as_int(cab.get("cod_vendedor")),
                "total": _as_float(cab.get("total") or cab.get("importe")),
                "confirmado": confirmado,
                "fecha_conversion": cab.get("fecha_conversion") or (cab.get("fecha") if confirmado else None),
                "venta_id": _as_int(cab.get("venta_id") or (cab.get("id") if confirmado else None)) or None,
            }

        for p in confirmados:
            row = _map_presupuesto(p, True)
            if row:
                presupuestos.append(row)

        for p in no_confirmados:
            row = _map_presupuesto(p, False)
            if row:
                presupuestos.append(row)

        return presupuestos

    def sync_recibos(self, fecha_desde, fecha_hasta) -> list[dict[str, Any]]:
        data = self.fetch_paginated(
            "/api/v1/recibo",
            {
                "fechaDesde": fecha_desde.strftime("%Y%m%d"),
                "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
            },
        )
        recibos: list[dict[str, Any]] = []
        for r in data:
            recibo_id = _as_int(r.get("id") or r.get("numero"))
            if not recibo_id:
                continue
            recibos.append(
                {
                    "id": recibo_id,
                    "fecha": r.get("fecha"),
                    "cod_cliente": _as_int(r.get("cod_cliente")),
                    "cliente_nombre": r.get("cliente_nombre") or r.get("razon_social") or "",
                    "forma_pago": r.get("forma_pago") or "efectivo",
                    "importe": _as_float(r.get("importe")),
                    "factura_id": _as_int(r.get("factura_id")) or None,
                    "tarjeta_numero": r.get("tarjeta_numero"),
                    "tarjeta_cupon": r.get("tarjeta_cupon"),
                }
            )
        return recibos
