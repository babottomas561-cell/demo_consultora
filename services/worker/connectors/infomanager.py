from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import requests


DEFAULT_BASE_URL = "https://impedidos.infomanager.com.ar"

INFOMANAGER_REPORT_CATALOG: dict[str, dict[str, Any]] = {
    "clientes": {
        "name": "Listado de clientes",
        "group": "clientes",
        "endpoint": "/api/v1/clientes",
        "params": {},
        "date_format": None,
        "supported": True,
    },
    "proveedores": {
        "name": "Listado de proveedores",
        "group": "proveedores",
        "endpoint": "/api/v1/proveedores",
        "params": {},
        "date_format": None,
        "supported": True,
    },
    "vendedores": {
        "name": "Listado de vendedores",
        "group": "vendedores",
        "endpoint": "/api/v1/vendedores",
        "params": {},
        "date_format": None,
        "supported": True,
    },
    "articulos": {
        "name": "Listado de articulos",
        "group": "stock",
        "endpoint": "/api/v1/articulos",
        "params": {},
        "date_format": None,
        "supported": True,
    },
    "saldos_clientes": {
        "name": "Saldos de cuentas corrientes",
        "group": "clientes",
        "endpoint": "/api/v1/reportes/saldos_clientes",
        "params": {"tag": "T", "codCliente": 0, "codEmpresa": 0},
        "date_format": None,
        "supported": True,
    },
    "comprobantes_pendientes_clientes": {
        "name": "Comprobantes pendientes de clientes",
        "group": "clientes",
        "endpoint": "/api/v1/reportes/comprob_pendientes_clientes",
        "params": {"tag": "T", "codCliente": 0, "codEmpresa": 0},
        "date_format": None,
        "supported": True,
    },
    "facturas_clientes": {
        "name": "Listado de facturas",
        "group": "clientes",
        "endpoint": "/api/v1/reportes/facturas",
        "params": {"tag": "T", "codEmpresa": 0},
        "date_format": "compact",
        "supported": True,
    },
    "facturas_con_recibos": {
        "name": "Facturas con recibos",
        "group": "clientes",
        "endpoint": "/api/v1/reportes/facturas_con_recibos",
        "params": {"tag": "T", "codEmpresa": 0},
        "date_format": "compact",
        "supported": True,
    },
    "facturas_compras": {
        "name": "Listado de facturas pendientes de proveedores",
        "group": "proveedores",
        "endpoint": "/api/v1/reportes/facturas_compras",
        "params": {"tag": "T", "codEmpresa": 0, "codProveedor": 0},
        "date_format": "compact",
        "supported": True,
    },
    "compras_por_factura": {
        "name": "Analisis de compra por factura",
        "group": "compras",
        "endpoint": "/api/v1/compras/compras-por-factura",
        "params": {
            "cod_proveedor": 0,
            "cod_articulo": 0,
            "cod_rubro": 0,
            "cod_subrubro": 0,
            "cod_unidad_negocio": 0,
            "centro_de_costo": "T",
            "usuario": "admin",
        },
        "date_format": "iso_underscore",
        "supported": True,
    },
    "mayor_contable": {
        "name": "Libro mayor",
        "group": "contabilidad",
        "endpoint": "/api/v1/planes/mayor",
        "params": {"tag": "T", "saldoAnterior": "S", "codEmpresa": 0, "codCuenta": 0},
        "date_format": "compact",
        "supported": True,
    },
    "planes": {
        "name": "Plan de cuentas",
        "group": "contabilidad",
        "endpoint": "/api/v1/planes",
        "params": {},
        "date_format": None,
        "supported": True,
    },
    "stock_existencias": {
        "name": "Existencias de stock",
        "group": "stock",
        "endpoint": "/api/v1/articulos/stock",
        "params": {},
        "date_format": None,
        "supported": True,
    },
    "ventas": {
        "name": "Ventas",
        "group": "clientes",
        "endpoint": "/api/v1/ventas",
        "params": {},
        "date_format": "compact",
        "supported": True,
    },
    "ventas_items": {
        "name": "Analisis de compra/ventas por articulo",
        "group": "clientes",
        "endpoint": "/api/v1/ventas/items",
        "params": {},
        "date_format": "compact",
        "supported": True,
    },
    "compras": {
        "name": "Compras",
        "group": "compras",
        "endpoint": "/api/v1/compras",
        "params": {},
        "date_format": "compact",
        "supported": True,
    },
    "compras_items": {
        "name": "Compras por articulo",
        "group": "compras",
        "endpoint": "/api/v1/compras/items",
        "params": {},
        "date_format": "compact",
        "supported": True,
    },
    "interdeposito": {
        "name": "Movimientos de stock entre depositos",
        "group": "stock",
        "endpoint": "/api/v1/interdeposito",
        "params": {},
        "date_format": "compact",
        "supported": True,
    },
    "disponible_por_cliente": {
        "name": "Disponible por cliente",
        "group": "caja",
        "endpoint": "/api/v1/reportes/disponible_por_cliente",
        "params": {"codCliente": 0},
        "date_format": None,
        "supported": True,
    },
    "comprobantes_relacion": {
        "name": "Comprobantes relacion",
        "group": "comprobantes",
        "endpoint": "/api/v1/comprobantes-relacion",
        "params": {},
        "date_format": None,
        "supported": True,
    },
    "comprobantes_destino": {
        "name": "Comprobantes destino",
        "group": "comprobantes",
        "endpoint": "/api/v1/comprobantes-destino",
        "params": {},
        "date_format": None,
        "supported": True,
    },
    "clientes_por_vendedor": {
        "name": "Clientes por vendedor",
        "group": "vendedores",
        "endpoint": None,
        "supported": False,
        "note": "Derivable cruzando /api/v1/clientes y /api/v1/vendedores; Swagger no publica un reporte dedicado.",
    },
    "comisiones_por_recibos": {
        "name": "Comisiones por recibos",
        "group": "vendedores",
        "endpoint": None,
        "supported": False,
        "note": "Derivable con facturas_con_recibos; Swagger no publica un reporte dedicado.",
    },
    "anticipos_clientes": {
        "name": "Anticipos emitidos vs cancelados de clientes",
        "group": "clientes",
        "endpoint": None,
        "supported": False,
        "note": "Swagger v1 no publica un endpoint de anticipos de clientes.",
    },
    "remitos_cliente": {
        "name": "Remitos de clientes",
        "group": "clientes",
        "endpoint": None,
        "supported": False,
        "note": "Swagger v1 solo publica creacion/consulta individual de remitos, no un listado exportable por periodo.",
    },
    "saldos_proveedores_clientes": {
        "name": "Saldos de proveedores-clientes",
        "group": "proveedores",
        "endpoint": None,
        "supported": False,
        "note": "Swagger v1 no publica el reporte consolidado proveedor-cliente.",
    },
    "conciliacion_proveedor_cliente": {
        "name": "Conciliacion proveedor-cliente",
        "group": "proveedores",
        "endpoint": None,
        "supported": False,
        "note": "Swagger v1 no publica el reporte de conciliacion proveedor-cliente.",
    },
    "anticipos_proveedores": {
        "name": "Anticipos emitidos vs cancelados de proveedores",
        "group": "proveedores",
        "endpoint": None,
        "supported": False,
        "note": "Swagger v1 no publica un endpoint de anticipos de proveedores.",
    },
    "saldos_proveedores_por_cuenta": {
        "name": "Saldos de proveedores por cuenta contable",
        "group": "proveedores",
        "endpoint": None,
        "supported": False,
        "note": "Swagger v1 no publica el saldo de proveedores por cuenta contable.",
    },
    "movimientos_por_articulo": {
        "name": "Movimientos por articulo",
        "group": "stock",
        "endpoint": None,
        "supported": False,
        "note": "Swagger v1 no publica un historial global de movimientos por articulo.",
    },
    "proyeccion_stock": {
        "name": "Proyeccion de stock",
        "group": "stock",
        "endpoint": None,
        "supported": False,
        "note": "Swagger v1 no publica un reporte de proyeccion de stock.",
    },
    "cheques": {
        "name": "Cheques / disponibilidades / cash flow",
        "group": "caja",
        "endpoint": None,
        "supported": False,
        "note": "No hay endpoints de cheques, disponibilidades o cash flow en Swagger v1.",
    },
    "iva_balance": {
        "name": "IVA, balances y estado de resultados",
        "group": "contabilidad",
        "endpoint": None,
        "supported": False,
        "note": "Swagger v1 solo publica plan de cuentas y mayor; no publica IVA compras/ventas ni balances cerrados.",
    },
}

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


def _first_present(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return value
    return None


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

    @staticmethod
    def report_catalog() -> dict[str, dict[str, Any]]:
        return INFOMANAGER_REPORT_CATALOG

    def fetch_report_rows(self, report_key: str, fecha_desde, fecha_hasta, max_pages: int = 500) -> list[dict[str, Any]]:
        report = INFOMANAGER_REPORT_CATALOG.get(report_key)
        if not report:
            raise KeyError(f"Unknown Infomanager report: {report_key}")
        if not report.get("supported") or not report.get("endpoint"):
            return []

        params = dict(report.get("params") or {})
        date_format = report.get("date_format")
        if date_format == "compact":
            params.update({
                "fechaDesde": fecha_desde.strftime("%Y%m%d"),
                "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
            })
        elif date_format == "iso_underscore":
            params.update({
                "fecha_desde": fecha_desde.isoformat(),
                "fecha_hasta": fecha_hasta.isoformat(),
            })

        return self.fetch_paginated(report["endpoint"], params, max_pages=max_pages)

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
        """Fetch client master data from /api/v1/clientes."""
        data = self.fetch_paginated("/api/v1/clientes")
        return [
            {
                "cod_cliente": str(c.get("cod_cliente") or c.get("id") or 0),
                "nombre": c.get("nombre") or c.get("razon_social") or f"Cliente {c.get('cod_cliente')}",
                "razon_social": c.get("razon_social") or c.get("nombre") or "",
                "cuit": c.get("cuit") or "",
                "email": c.get("mail") or c.get("email") or "",
                "cod_vendedor": _as_int(c.get("cod_vendedor")),
                "habilitado": str(c.get("habilitado", "1")) not in ("0", "false", "False", "N"),
            }
            for c in data
        ]

    def sync_proveedores(self) -> list[dict[str, Any]]:
        """Fetch provider master data from /api/v1/proveedores."""
        data = self.fetch_paginated("/api/v1/proveedores")
        return [
            {
                "cod_proveedor": str(p.get("cod_proveedor") or p.get("id") or 0),
                "nombre": p.get("nombre") or p.get("razon_social") or f"Proveedor {p.get('cod_proveedor')}",
                "razon_social": p.get("razon_social") or p.get("nombre") or "",
                "cuit": p.get("cuit") or "",
                "email": p.get("email") or "",
                "habilitado": str(p.get("habilitado", "1")) not in ("0", "false", "False", "N"),
            }
            for p in data
        ]

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
                # Real API field is "pto_de_reposicion"; keep legacy names as fallback
                "stock_minimo": _as_float(_first_present(s, "pto_de_reposicion", "stock_minimo", "stock_min", "punto_pedido")),
            }
            for s in data
        ]

    def sync_depositos(self) -> list[dict[str, Any]]:
        data = self.fetch_paginated("/api/v1/depositos", max_pages=1)
        return [
            {
                "cod_deposito": _as_int(d.get("cod_deposito")),
                "nombre": d.get("descripcion") or d.get("nombre") or f"Deposito {d.get('cod_deposito')}",
                "habilitado": str(d.get("habilitado", "1")) not in ("0", "false", "False", "N"),
            }
            for d in data
            if _as_int(d.get("cod_deposito"))
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
            # API returns importe=0 in compras items; real total is cantidad × precio_con_iva.
            _qty = abs(_as_float(item.get("cantidad")))
            _pcu = abs(_as_float(item.get("precio_con_iva")) or _as_float(item.get("precio")))
            item_total = abs(_as_float(item.get("importe"))) or (_qty * _pcu)
            header_total = abs(_as_float(_first_present(
                cab, "total", "importe", "importe_total", "total_comprobante", "fa_total"
            )))
            ratio = (item_total / header_total) if header_total else 0
            item_neto_raw = _first_present(item, "neto", "importe_neto")
            item_iva_raw = _first_present(item, "iva_importe", "importe_iva")
            header_neto_raw = _first_present(cab, "neto", "importe_neto")
            header_iva_raw = _first_present(cab, "iva_importe", "importe_iva")
            item_neto = abs(_as_float(item_neto_raw)) if item_neto_raw is not None else None
            item_iva = abs(_as_float(item_iva_raw)) if item_iva_raw is not None else None
            header_neto = abs(_as_float(header_neto_raw)) if header_neto_raw is not None else None
            header_iva = abs(_as_float(header_iva_raw)) if header_iva_raw is not None else None
            if item_neto is None and header_neto is not None and ratio:
                item_neto = header_neto * ratio
            if item_iva is None and header_iva is not None and ratio:
                item_iva = header_iva * ratio
            if item_neto is None and item_iva is not None:
                item_neto = max(item_total - item_iva, 0)
            if item_iva is None and item_neto is not None:
                item_iva = max(item_total - item_neto, 0)

            tipo_raw = _first_present(cab, "tipo_comprobante", "tipo_comp", "tipo")
            tipo = _normalize_tipo_comprobante(tipo_raw) if tipo_raw else "FC"
            compras.append(
                {
                    "fecha": cab.get("fecha"),
                    "proveedor_id": str(cab.get("cod_proveedor") or 0),
                    "proveedor_nombre": _first_present(
                        cab,
                        "proveedor",
                        "proveedor_nombre",
                        "nombre_proveedor",
                        "razon_social",
                    ) or "",
                    "producto_id": str(item.get("cod_articulo") or ""),
                    "producto_nombre": item.get("detalle") or item.get("descripcion") or "",
                    "cantidad": abs(_as_float(item.get("cantidad"))),
                    "precio_unitario": abs(_as_float(item.get("precio"))),
                    "total": item_total,
                    "tipo_comprobante": tipo,
                    "tipo_factura": cab.get("tipo_factura"),
                    "punto_de_venta": _as_int(cab.get("punto_de_venta")),
                    "cod_empresa": _as_int(cab.get("cod_empresa"), 1),
                    "neto": item_neto,
                    "iva_importe": item_iva,
                    "anulada": cab.get("anulada", "N"),
                    "cod_deposito": _as_int(cab.get("cod_deposito"), 1),
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

    def sync_saldos_proveedores(self, fecha_desde, fecha_hasta) -> list[dict[str, Any]]:
        data = self.fetch_paginated(
            "/api/v1/reportes/facturas_compras",
            {
                "fechaDesde": fecha_desde.strftime("%Y%m%d"),
                "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
                "tag": "T",
                "codEmpresa": 0,
                "codProveedor": 0,
            },
            max_pages=1,
        )
        saldos: list[dict[str, Any]] = []
        for index, row in enumerate(data):
            proveedor_id = str(row.get("cod_proveedor") or 0)
            factura_id = row.get("fa_id") or row.get("id") or index
            saldo = _as_float(row.get("saldo_fa"))
            total = _as_float(row.get("fa_total"))
            pagado = _as_float(row.get("op_imp_pagado"))
            saldos.append(
                {
                    "proveedor_id": proveedor_id,
                    "proveedor_nombre": row.get("nombre") or row.get("proveedor_nombre") or f"Proveedor {proveedor_id}",
                    "comprobante_id": f"factura-compra-{factura_id}",
                    "tipo": "factura",
                    "fecha": row.get("fa_fecha"),
                    "importe": saldo if row.get("saldo_fa") is not None else total - pagado,
                    "saldo_acumulado": saldo if row.get("saldo_fa") is not None else total - pagado,
                    "fecha_vencimiento": row.get("ult_fec_vto") or row.get("primer_fec_vto"),
                }
            )
        return saldos

    def sync_comprobantes_clientes(self, fecha_desde, fecha_hasta) -> tuple[dict[str, dict[str, Any]], list[dict[str, Any]]]:
        pendientes = self.fetch_paginated(
            "/api/v1/reportes/comprob_pendientes_clientes",
            {"tag": "T", "codCliente": 0, "codEmpresa": 0},
            max_pages=1,
        )
        docs: dict[str, dict[str, Any]] = {}
        for row in pendientes:
            comprobante_id = str(row.get("id") or row.get("fa_id") or row.get("numero") or "")
            if not comprobante_id:
                continue
            importe_total = _as_float(row.get("importe_factura") or row.get("fa_total"))
            importe_pagado = _as_float(row.get("importe_pagado") or row.get("imp_pag_moneda_local"))
            saldo = _as_float(row.get("saldo"), importe_total - importe_pagado)
            docs[comprobante_id] = {
                "comprobante_id": comprobante_id,
                "cliente_id": str(row.get("cod_cliente") or row.get("cliente_id") or 0),
                "cliente_nombre": row.get("nombre") or row.get("cliente_nombre") or row.get("razon_social") or "",
                "tipo": _normalize_tipo_comprobante(row.get("tipo_comprobante") or row.get("tipo_comp")),
                "numero": str(row.get("numero") or row.get("fa_nro") or ""),
                "punto_de_venta": str(row.get("punto_de_venta") or row.get("fa_pto_vta") or ""),
                "fecha": row.get("fecha_factura") or row.get("fa_fecha"),
                "fecha_vencimiento": row.get("fecha_vencimiento") or row.get("ult_fec_vto") or row.get("primer_fec_vto"),
                "importe_total": importe_total,
                "importe_pagado": importe_pagado,
                "saldo": saldo,
                "cod_vendedor": _as_int(row.get("cod_vendedor")) or None,
                "detalle": row.get("detalle"),
            }

        recibos = self.fetch_paginated(
            "/api/v1/reportes/facturas_con_recibos",
            {
                "fechaDesde": fecha_desde.strftime("%Y%m%d"),
                "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
                "tag": "T",
                "codEmpresa": 0,
            },
            max_pages=1,
        )
        pagos: list[dict[str, Any]] = []
        pagos_por_doc: dict[str, float] = {}
        for row in recibos:
            comprobante_id = str(row.get("fa_id") or row.get("id") or "")
            pago_id = str(row.get("rc_id") or row.get("pago_id") or "")
            if not comprobante_id or not pago_id:
                continue
            importe_pago = _as_float(row.get("importe") or row.get("imp_pag_moneda_local"))
            pagos_por_doc[comprobante_id] = pagos_por_doc.get(comprobante_id, 0.0) + importe_pago
            pagos.append(
                {
                    "pago_id": pago_id,
                    "comprobante_id": comprobante_id,
                    "fecha": row.get("rc_fecha") or row.get("fecha"),
                    "forma_pago": row.get("cond_pago") or row.get("forma_pago") or "efectivo",
                    "importe": importe_pago,
                    "cod_cliente": _as_int(row.get("cod_cliente")),
                    "cliente_nombre": row.get("cliente_nombre") or row.get("razon_social") or "",
                }
            )
            if comprobante_id not in docs:
                importe_total = _as_float(row.get("fa_total") or row.get("fa_total_moneda_local"))
                docs[comprobante_id] = {
                    "comprobante_id": comprobante_id,
                    "cliente_id": str(row.get("cod_cliente") or 0),
                    "cliente_nombre": row.get("cliente_nombre") or row.get("razon_social") or "",
                    "tipo": _normalize_tipo_comprobante(row.get("tipo_comp") or row.get("tipo_comprobante")),
                    "numero": str(row.get("fa_nro") or ""),
                    "punto_de_venta": str(row.get("fa_pto_vta") or ""),
                    "fecha": row.get("fa_fecha"),
                    "fecha_vencimiento": row.get("ult_fec_vto") or row.get("primer_fec_vto"),
                    "importe_total": importe_total,
                    "importe_pagado": 0.0,
                    "saldo": importe_total,
                    "cod_vendedor": None,
                    "detalle": None,
                }

        for comprobante_id, pago_total in pagos_por_doc.items():
            doc = docs.get(comprobante_id)
            if not doc:
                continue
            doc["importe_pagado"] = max(_as_float(doc.get("importe_pagado")), round(pago_total, 2))
            doc["saldo"] = round(max(_as_float(doc.get("importe_total")) - _as_float(doc.get("importe_pagado")), 0.0), 2)

        return docs, pagos

    def sync_comprobantes_proveedores(self, fecha_desde, fecha_hasta) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        data = self.fetch_paginated(
            "/api/v1/reportes/facturas_compras",
            {
                "fechaDesde": fecha_desde.strftime("%Y%m%d"),
                "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
                "tag": "T",
                "codEmpresa": 0,
                "codProveedor": 0,
            },
            max_pages=1,
        )
        docs: list[dict[str, Any]] = []
        pagos: list[dict[str, Any]] = []
        for row in data:
            comprobante_id = str(row.get("fa_id") or row.get("id") or "")
            if not comprobante_id:
                continue
            proveedor_id = str(row.get("cod_proveedor") or 0)
            proveedor_nombre = row.get("nombre") or row.get("proveedor_nombre") or f"Proveedor {proveedor_id}"
            importe_total = _as_float(row.get("fa_total"))
            importe_pagado = _as_float(row.get("op_imp_pagado"))
            saldo = _as_float(row.get("saldo_fa"), importe_total - importe_pagado)
            docs.append(
                {
                    "comprobante_id": comprobante_id,
                    "proveedor_id": proveedor_id,
                    "proveedor_nombre": proveedor_nombre,
                    "tipo": "factura",
                    "numero": str(row.get("fa_nro") or ""),
                    "punto_de_venta": str(row.get("fa_pto_vta") or ""),
                    "fecha": row.get("fa_fecha"),
                    "fecha_vencimiento": row.get("ult_fec_vto") or row.get("primer_fec_vto"),
                    "importe_total": importe_total,
                    "importe_pagado": importe_pagado,
                    "saldo": saldo,
                    "detalle": row.get("detalle"),
                }
            )
            if importe_pagado > 0:
                pagos.append(
                    {
                        "pago_id": str(row.get("nro_ultima_OP") or f"op-{comprobante_id}"),
                        "comprobante_id": comprobante_id,
                        "fecha": row.get("op_fecha"),
                        "forma_pago": "OP",
                        "importe": importe_pagado,
                        "proveedor_id": proveedor_id,
                        "proveedor_nombre": proveedor_nombre,
                    }
                )
        return docs, pagos

    def build_comisiones_vendedores(
        self,
        comprobantes_clientes: dict[str, dict[str, Any]],
        pagos_clientes: list[dict[str, Any]],
        vendedor_lookup: dict[int, str],
        porcentaje: float = 0.03,
    ) -> list[dict[str, Any]]:
        grouped: dict[tuple[int, str], dict[str, Any]] = {}
        for pago in pagos_clientes:
            doc = comprobantes_clientes.get(str(pago.get("comprobante_id")))
            if not doc or not doc.get("cod_vendedor"):
                continue
            fecha = str(pago.get("fecha") or "")
            if len(fecha) < 7:
                continue
            cod_vendedor = _as_int(doc.get("cod_vendedor"))
            periodo = fecha[:7]
            key = (cod_vendedor, periodo)
            if key not in grouped:
                grouped[key] = {
                    "cod_vendedor": cod_vendedor,
                    "vendedor_nombre": vendedor_lookup.get(cod_vendedor) or doc.get("vendedor_nombre") or f"Vendedor {cod_vendedor}",
                    "periodo": periodo,
                    "base_cobrada": 0.0,
                    "porcentaje": porcentaje,
                    "comision": 0.0,
                    "recibos": 0,
                }
            grouped[key]["base_cobrada"] += _as_float(pago.get("importe"))
            grouped[key]["recibos"] += 1

        result = []
        for row in grouped.values():
            row["base_cobrada"] = round(row["base_cobrada"], 2)
            row["comision"] = round(row["base_cobrada"] * porcentaje, 2)
            result.append(row)
        return sorted(result, key=lambda item: (item["periodo"], item["cod_vendedor"]))

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

    # ── New specific-report methods ─────────────────────────────────────────

    def obtener_empresas(self) -> list[dict[str, Any]]:
        return self.fetch_paginated("/api/v1/empresas", max_pages=1)

    def obtener_depositos(self) -> list[dict[str, Any]]:
        return self.fetch_paginated("/api/v1/depositos", max_pages=1)

    def obtener_vendedores(self) -> list[dict[str, Any]]:
        return self.fetch_paginated("/api/v1/vendedores", max_pages=1)

    def obtener_listas_precios(self) -> list[dict[str, Any]]:
        return self.fetch_paginated("/api/v1/listaprecios/cabeceras/all", max_pages=1)

    def obtener_items_lista_precios(self, cod_lista: int, desde, hasta) -> list[dict[str, Any]]:
        params = {
            "codLista": cod_lista,
            "fechaDesde": desde.strftime("%Y%m%d"),
            "fechaHasta": hasta.strftime("%Y%m%d"),
        }
        return self.fetch_paginated("/api/v1/reportes/lista_precio_por_codigo", params, max_pages=50)

    def obtener_facturas_venta(self, desde, hasta, cod_empresa: int = 0) -> list[dict[str, Any]]:
        params = {
            "fechaDesde": desde.strftime("%Y%m%d"),
            "fechaHasta": hasta.strftime("%Y%m%d"),
            "tag": "T",
            "codEmpresa": cod_empresa,
        }
        return self.fetch_paginated("/api/v1/reportes/facturas", params, max_pages=200)

    def obtener_facturas_compra(self, desde, hasta, cod_empresa: int = 0) -> list[dict[str, Any]]:
        params = {
            "fechaDesde": desde.strftime("%Y%m%d"),
            "fechaHasta": hasta.strftime("%Y%m%d"),
            "tag": "T",
            "codEmpresa": cod_empresa,
            "codProveedor": 0,
        }
        return self.fetch_paginated("/api/v1/reportes/facturas_compras", params, max_pages=200)

    def obtener_facturas_con_recibos(self, desde, hasta, cod_empresa: int = 0) -> list[dict[str, Any]]:
        params = {
            "fechaDesde": desde.strftime("%Y%m%d"),
            "fechaHasta": hasta.strftime("%Y%m%d"),
            "tag": "T",
            "codEmpresa": cod_empresa,
        }
        return self.fetch_paginated("/api/v1/reportes/facturas_con_recibos", params, max_pages=200)

    def obtener_saldos_clientes(self, cod_empresa: int = 0) -> list[dict[str, Any]]:
        params = {"TAG": "T", "codCliente": 0, "codEmpresa": cod_empresa}
        return self.fetch_paginated("/api/v1/reportes/saldos_clientes", params, max_pages=200)

    def obtener_comprobantes_pendientes(self, cod_empresa: int = 0) -> list[dict[str, Any]]:
        params = {"tag": "T", "codCliente": 0, "codEmpresa": cod_empresa}
        return self.fetch_paginated("/api/v1/reportes/comprob_pendientes_clientes", params, max_pages=200)

    def obtener_disponible_cliente(self, cod_cliente: int) -> dict[str, Any]:
        params = {"codCliente": cod_cliente}
        rows = self.fetch_paginated("/api/v1/reportes/disponible_por_cliente", params, max_pages=1)
        return rows[0] if rows else {}

    def obtener_stock_disponible(self) -> list[dict[str, Any]]:
        return self.fetch_paginated("/api/v1/articulos/stock", max_pages=50)

    def obtener_movimientos_stock(self, cod_articulo: int, cod_deposito: int, desde, hasta) -> list[dict[str, Any]]:
        self.ensure_token()
        params = {
            "cod_articulo": cod_articulo,
            "cod_deposito": cod_deposito,
            "fecha_desde": desde.isoformat(),
            "fecha_hasta": hasta.isoformat(),
        }
        all_items: list[dict[str, Any]] = []
        page = 1
        while page <= 500:
            request_params = {**params, "page": page, "limit": 100}
            resp = requests.get(
                f"{self.base_url}/api/v1/articulos/movimientos-por-articulo",
                headers=self.headers(),
                params=request_params,
                timeout=60,
            )
            if resp.status_code == 404:
                break
            resp.raise_for_status()
            items = self._extract_items(resp.json())
            if not items:
                break
            all_items.extend(items)
            if len(items) < 100:
                break
            page += 1
        return all_items

    def obtener_interdepositos(self, desde, hasta) -> list[dict[str, Any]]:
        params = {
            "fechaDesde": desde.strftime("%Y%m%d"),
            "fechaHasta": hasta.strftime("%Y%m%d"),
        }
        return self.fetch_paginated("/api/v1/interdeposito", params, max_pages=200)

    def obtener_movimientos_contables(self, desde, hasta, cod_cuenta: str, cod_empresa: int, tag: str = "T") -> list[dict[str, Any]]:
        params = {
            "fechaDesde": desde.strftime("%Y%m%d"),
            "fechaHasta": hasta.strftime("%Y%m%d"),
            "tag": tag,
            "saldoAnterior": "N",
            "codEmpresa": cod_empresa,
            "codCuenta": cod_cuenta,
        }
        return self.fetch_paginated("/api/v1/planes/mayor", params, max_pages=200)

    def obtener_presupuestos_confirmados(self) -> list[dict[str, Any]]:
        raw = self.fetch_paginated("/api/v1/presupuestos/confirmados", max_pages=100)
        return [r.get("venta") or r for r in raw]

    def obtener_presupuestos_no_confirmados(self) -> list[dict[str, Any]]:
        raw = self.fetch_paginated("/api/v1/presupuestos/no_confirmados", max_pages=100)
        return [r.get("venta") or r for r in raw]

    # ── End new methods ──────────────────────────────────────────────────────

    def sync_recibos(self, fecha_desde, fecha_hasta) -> list[dict[str, Any]]:
        data = self.fetch_paginated(
            "/api/v1/reportes/facturas_con_recibos",
            {
                "fechaDesde": fecha_desde.strftime("%Y%m%d"),
                "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
                "tag": "T",
                "codEmpresa": 0,
            },
            max_pages=1,
        )
        recibos_by_id: dict[int, dict[str, Any]] = {}
        for r in data:
            recibo_id = _as_int(r.get("rc_id") or r.get("id") or r.get("numero"))
            if not recibo_id:
                continue
            importe = _as_float(r.get("importe") or r.get("imp_pag_moneda_local"))
            if recibo_id not in recibos_by_id:
                recibos_by_id[recibo_id] = {
                    "id": recibo_id,
                    "fecha": r.get("rc_fecha") or r.get("fecha"),
                    "cod_cliente": _as_int(r.get("cod_cliente")),
                    "cliente_nombre": r.get("cliente_nombre") or r.get("razon_social") or "",
                    "forma_pago": r.get("cond_pago") or r.get("forma_pago") or "efectivo",
                    "importe": 0.0,
                    "factura_id": _as_int(r.get("fa_id") or r.get("factura_id")) or None,
                    "tarjeta_numero": r.get("tarjeta_numero") or r.get("cheque_numero"),
                    "tarjeta_cupon": r.get("tarjeta_cupon") or (str(r.get("rc_nro")) if r.get("rc_nro") is not None else None),
                }
            recibos_by_id[recibo_id]["importe"] += importe

        recibos = []
        for recibo in recibos_by_id.values():
            recibos.append(
                {
                    **recibo,
                    "importe": round(_as_float(recibo["importe"]), 2),
                }
            )
        return recibos
