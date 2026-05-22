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
            if resp.status_code == 401:
                self.authenticate()
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
                "cod_zona": _as_int(c.get("cod_zona")),
                "lista_precio": _as_int(c.get("lista_precio")),
                "condicion_venta": _as_int(c.get("condicion_venta")),
                "cod_rubro_cliente": _as_int(c.get("cod_rubro_cliente")),
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
                    "precio_compra_dolar": _as_float(a.get("precio_compra_dolar")),
                    "precio_venta": _as_float(a.get("precio_venta")),
                    "precio_venta_dolar": _as_float(a.get("precio_venta_dolar")),
                    "moneda": str(a.get("moneda") or "P").upper(),
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

    def sync_ventas(
        self,
        fecha_desde,
        fecha_hasta,
        articulo_rubro_lookup: dict[str, int] | None = None,
    ) -> list[dict[str, Any]]:
        """Sync sales lines joining headers + items.

        B1 — importe fallback: ventas/items.importe is correct per API docs but can
             be 0 in edge cases; fall back to cantidad × precio.
        B2 — multi-moneda: if header.moneda == 'D', multiply all monetary amounts
             by cotizacion to convert USD → ARS before storing.
        B3 — cod_rubro: ventas/items has NO cod_rubro field. Caller should pass
             articulo_rubro_lookup {cod_articulo_str: cod_rubro} built from the
             articulos master to enrich each line.
        D6 — IVA discriminado: pull importe_iva_10_5 and importe_iva_27 from the
             sales header and store them on each line (proportional split not needed
             — the widget will sum at header level via SUM in SQL).
        """
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

        # Only FA/NC/ND belong in ventas analytics table
        _VALID_TIPOS = {"FA", "NC", "ND"}

        ventas: list[dict[str, Any]] = []
        for item in items_raw:
            cab = headers.get(_as_int(item.get("id_comprobante")))
            if not cab:
                continue
            tipo = _normalize_tipo_comprobante(cab.get("tipo_comprobante"))
            if tipo not in _VALID_TIPOS:
                continue

            # B2 — multi-moneda conversion
            moneda = str(cab.get("moneda") or "P").upper()
            cotizacion = _as_float(cab.get("cotizacion"), 1.0)
            factor = cotizacion if moneda == "D" and cotizacion > 0 else 1.0

            # B1 — importe = precio_con_iva × cantidad (confirmed: item.importe = total WITH IVA)
            _qty = abs(_as_float(item.get("cantidad")))
            _precio_raw = abs(_as_float(item.get("precio")))           # sin IVA
            _pci_raw    = abs(_as_float(item.get("precio_con_iva")))   # con IVA
            _importe_raw = abs(_as_float(item.get("importe")))         # = pci × qty (WITH IVA)

            # total = precio_con_iva × qty. Fallback: precio × qty if importe is missing
            total_ars = (_importe_raw if _importe_raw > 0 else (_qty * (_pci_raw or _precio_raw))) * factor
            precio_unitario_ars = _precio_raw * factor

            # Per-item neto (sin IVA) = precio × qty — NOT the header neto
            # The header.neto is the SUM of all items' neto; storing it per-row causes
            # double-counting in analytics for multi-item invoices.
            neto_ars = _precio_raw * _qty * factor

            # Per-item IVA = precio × iva_por/100 × qty — iva_importe in items is always 0
            _iva_por = _as_float(item.get("iva_por", 0))
            iva_total_ars = _precio_raw * _qty * (_iva_por / 100) * factor

            # D6 — IVA discriminado por alícuota (from header, proportional to item weight)
            # Use header iva_10_5 / iva_27 only for items whose iva_por matches
            iva_10_5_ars = (_precio_raw * _qty * 0.105 * factor) if abs(_iva_por - 10.5) < 0.1 else 0.0
            iva_27_ars   = (_precio_raw * _qty * 0.27  * factor) if abs(_iva_por - 27)  < 0.1 else 0.0

            # B3 — cod_rubro desde lookup de artículos (ventas/items no tiene este campo)
            cod_articulo_str = str(item.get("cod_articulo") or "")
            cod_rubro = (
                (articulo_rubro_lookup or {}).get(cod_articulo_str)
                or (_as_int(item.get("cod_rubro")) if item.get("cod_rubro") is not None else None)
            )

            ventas.append(
                {
                    "fecha": cab.get("fecha"),
                    "cliente_id": str(cab.get("cod_cliente") or 0),
                    "cliente_nombre": cab.get("cliente_nombre") or cab.get("razon_social") or "",
                    "producto_id": cod_articulo_str,
                    "producto_nombre": item.get("detalle") or item.get("descripcion") or "",
                    "cantidad": _qty,
                    "precio_unitario": precio_unitario_ars,
                    "total": total_ars,
                    "tipo_comprobante": tipo,
                    "tipo_factura": cab.get("tipo_factura"),
                    "punto_de_venta": _as_int(cab.get("punto_de_venta")),
                    "cod_vendedor": _as_int(cab.get("cod_vendedor") or item.get("cod_vendedor")),
                    "cod_empresa": _as_int(cab.get("cod_empresa"), 1),
                    "tag": cab.get("tag", "S"),
                    "condicion_venta_tipo": _as_int(cab.get("condicion_venta_tipo"), 1),
                    "neto": neto_ars,
                    "iva_importe": iva_total_ars,
                    "anulada": cab.get("anulada", "N"),
                    "cod_deposito": _as_int(cab.get("cod_deposito"), 1),
                    "cod_rubro": cod_rubro,
                    "cod_lista_precios": _as_int(item.get("cod_lista_precios")) if item.get("cod_lista_precios") is not None else None,
                    "precio_compra_actual": _as_float(item.get("precio_compra_actual")),
                    "descuento_porc": _as_float(item.get("descuento_porc") or item.get("descuento")),
                    # D6 — IVA discriminado
                    "iva_10_5": iva_10_5_ars if iva_10_5_ars > 0 else None,
                    "iva_27": iva_27_ars if iva_27_ars > 0 else None,
                    # B2 — metadata de moneda
                    "moneda": moneda,
                    "cotizacion": cotizacion if moneda == "D" else None,
                }
            )
        return ventas

    def sync_compras(
        self,
        fecha_desde,
        fecha_hasta,
        articulo_rubro_lookup: dict[str, int] | None = None,
    ) -> list[dict[str, Any]]:
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
            # Multi-moneda conversion (same logic as ventas)
            moneda = str(cab.get("moneda") or "P").upper()
            cotizacion = _as_float(cab.get("cotizacion"), 1.0)
            factor = cotizacion if moneda == "D" and cotizacion > 0 else 1.0

            # API returns importe=0 and iva_importe=0 always in compras/items (confirmed bug).
            # Real total = cantidad × precio_con_iva.
            # Real IVA  = precio × (iva_por / 100) × cantidad  when iva_por is present.
            _qty = abs(_as_float(item.get("cantidad")))
            _precio_sin_iva = abs(_as_float(item.get("precio")))
            _pcu = abs(_as_float(item.get("precio_con_iva")) or _precio_sin_iva)
            item_total = _qty * _pcu * factor

            # IVA from iva_por (always present) — most reliable source
            _iva_por = _as_float(item.get("iva_por"))
            if _iva_por > 0 and _precio_sin_iva > 0:
                item_iva = round(_qty * _precio_sin_iva * (_iva_por / 100) * factor, 2)
                item_neto = round(_qty * _precio_sin_iva * factor, 2)
            else:
                # Fallback: derive neto from total - iva using header ratios
                header_total = abs(_as_float(_first_present(
                    cab, "importe_total", "total", "importe"
                ))) * factor  # apply multi-moneda factor to header too
                ratio = (item_total / header_total) if header_total else 0
                header_iva_raw = _first_present(cab, "importe_iva", "iva_importe")
                header_neto_raw = _first_present(cab, "neto", "importe_neto")
                header_iva = abs(_as_float(header_iva_raw)) * factor if header_iva_raw is not None else None
                header_neto = abs(_as_float(header_neto_raw)) * factor if header_neto_raw is not None else None
                item_iva = (header_iva * ratio) if header_iva and ratio else None
                item_neto = (header_neto * ratio) if header_neto and ratio else None
                if item_neto is None and item_iva is not None:
                    item_neto = max(item_total - item_iva, 0)
                if item_iva is None and item_neto is not None:
                    item_iva = max(item_total - item_neto, 0)

            nc_sign = -1 if _normalize_tipo_comprobante(
                _first_present(cab, "tipo_comprobante", "tipo_comp", "tipo") or "FC"
            ) == "NC" else 1
            iva_10_5_ars = (item_neto * 0.105 * nc_sign) if item_neto and abs(_iva_por - 10.5) < 0.1 else 0.0
            iva_27_ars   = (item_neto * 0.27  * nc_sign) if item_neto and abs(_iva_por - 27)  < 0.1 else 0.0

            tipo_raw = _first_present(cab, "tipo_comprobante", "tipo_comp", "tipo")
            tipo = _normalize_tipo_comprobante(tipo_raw) if tipo_raw else "FC"

            # Enrich cod_rubro from artículos master (compras/items has no rubro field)
            cod_articulo_str = str(item.get("cod_articulo") or "")
            cod_rubro = (
                (articulo_rubro_lookup or {}).get(cod_articulo_str)
                or (_as_int(item.get("cod_rubro")) if item.get("cod_rubro") is not None else None)
            )

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
                    "producto_id": cod_articulo_str,
                    "producto_nombre": item.get("detalle") or item.get("descripcion") or "",
                    "cantidad": abs(_as_float(item.get("cantidad"))),
                    "precio_unitario": abs(_as_float(item.get("precio"))) * factor,
                    "total": item_total,
                    "tipo_comprobante": tipo,
                    "tipo_factura": cab.get("tipo_factura"),
                    "punto_de_venta": _as_int(cab.get("punto_de_venta")),
                    "cod_empresa": _as_int(cab.get("cod_empresa"), 1),
                    "neto": item_neto,
                    "iva_importe": item_iva,
                    "anulada": cab.get("anulada", "N"),
                    "cod_deposito": _as_int(cab.get("cod_deposito"), 1),
                    "iva_10_5": iva_10_5_ars if iva_10_5_ars > 0 else None,
                    "iva_27": iva_27_ars if iva_27_ars > 0 else None,
                    "moneda": moneda,
                    "cotizacion": cotizacion if moneda == "D" else None,
                    "cod_rubro": cod_rubro,
                }
            )
        return compras

    def sync_saldos_clientes(self) -> list[dict[str, Any]]:
        """Fetch client balance summary.

        D1/D2 — now includes tot_saldo, color (semáforo de InfoManager) and
                 dias_deuda so the frontend can show cartera total KPI and
                 traffic-light client risk widget.
        """
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
                # D1/D2 — campos nuevos del semáforo
                "tot_saldo": tot_saldo,
                "color": row.get("color") or None,
                "dias_deuda": _as_int(row.get("dias_deuda")) if row.get("dias_deuda") is not None else None,
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
        """Fetch confirmed and pending quotes.

        D5 — now includes origen_sistema to track conversion by channel
             ("App de pedidos" vs "IM4" vs otros).
        """
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
                # D5 — canal de origen
                "origen_sistema": cab.get("origen_sistema") or cab.get("cod_origen_sistema") or None,
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

    def sync_cotizaciones(self, fecha_desde, fecha_hasta) -> list[dict[str, Any]]:
        """Fetch daily exchange rates for USD and EUR."""
        results = []
        for moneda in ("D", "E"):  # D=dólar, E=euro
            try:
                params = {
                    "fechaDesde": fecha_desde.strftime("%Y%m%d"),
                    "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
                    "moneda": moneda,
                }
                rows = self.fetch_paginated("/api/v1/cotizacion", params, max_pages=50)
                for r in rows:
                    fecha = r.get("fecha") or r.get("date")
                    valor = r.get("cotizacion") or r.get("valor") or r.get("value")
                    if fecha and valor:
                        results.append({
                            "fecha": str(fecha)[:10],
                            "moneda": moneda,
                            "valor": float(valor),
                        })
            except Exception:
                pass
        return results

    def sync_puntos_de_venta(self) -> list[dict[str, Any]]:
        data = self.fetch_paginated("/api/v1/puntos-de-venta", max_pages=1)
        return [
            {
                "id": _as_int(p.get("id") or p.get("punto_de_venta") or p.get("cod_punto_venta")),
                "nombre": p.get("nombre") or p.get("descripcion") or f"Pto. Venta {p.get('id')}",
                "cod_empresa": _as_int(p.get("cod_empresa") or p.get("empresa")),
                "habilitado": str(p.get("habilitado", "1")) not in ("0", "false", "False", "N"),
            }
            for p in data
            if _as_int(p.get("id") or p.get("punto_de_venta") or p.get("cod_punto_venta"))
        ]

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
            if resp.status_code == 401:
                self.authenticate()
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

    def sync_saldos_proveedores_full(self, fecha_desde, fecha_hasta) -> list[dict[str, Any]]:
        """Fetch supplier invoice balances from /reportes/facturas_compras.
        This is the only endpoint that returns saldo_fa and op_imp_pagado.
        """
        params = {
            "fechaDesde": fecha_desde.strftime("%Y%m%d"),
            "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
            "tag": "T",
            "codEmpresa": 0,
            "codProveedor": 0,
        }
        rows = self.fetch_paginated("/api/v1/reportes/facturas_compras", params, max_pages=200)
        result = []
        for r in rows:
            fa_id = _as_int(r.get("fa_id") or r.get("id"))
            if not fa_id:
                continue
            result.append({
                "fa_id":           fa_id,
                "fa_fecha":        r.get("fa_fecha"),
                "fa_pto_vta":      _as_int(r.get("fa_pto_vta")),
                "fa_nro":          _as_int(r.get("fa_nro")),
                "fa_cod_empresa":  _as_int(r.get("fa_cod_empresa") or r.get("cod_empresa")),
                "moneda":          r.get("moneda") or "P",
                "cod_proveedor":   _as_int(r.get("cod_proveedor")),
                "nombre":          r.get("nombre") or r.get("proveedor_nombre") or "",
                "fa_total":        _as_float(r.get("fa_total")),
                "op_imp_pagado":   _as_float(r.get("op_imp_pagado")),
                "saldo_fa":        _as_float(r.get("saldo_fa")),
                "nro_ultima_op":   str(r.get("nro_ultima_OP") or r.get("nro_ultima_op") or ""),
                "primer_fec_vto":  r.get("primer_fec_vto"),
                "ult_fec_vto":     r.get("ult_fec_vto"),
                "vto_cant_cuotas": _as_int(r.get("vto_cant_cuotas")),
                "vto_importe":     _as_float(r.get("vto_importe")),
            })
        return result

    def sync_interdepositos(self, fecha_desde, fecha_hasta) -> list[dict[str, Any]]:
        """Fetch inter-deposit movements from /api/v1/interdeposito."""
        params = {
            "fechaDesde": fecha_desde.strftime("%Y%m%d"),
            "fechaHasta": fecha_hasta.strftime("%Y%m%d"),
        }
        rows = self.fetch_paginated("/api/v1/interdeposito", params, max_pages=200)
        result = []
        for r in rows:
            rid = _as_int(r.get("id"))
            if not rid:
                continue
            result.append({
                "id":               rid,
                "fecha":            r.get("fecha"),
                "cod_articulo":     _as_int(r.get("cod_articulo")),
                "descripcion":      r.get("descripcion") or r.get("articulo") or "",
                "cantidad":         _as_float(r.get("cantidad")),
                "precio":           _as_float(r.get("precio")),
                "total":            _as_float(r.get("total") or r.get("importe")),
                "deposito_origen":  _as_int(r.get("cod_deposito_origen") or r.get("deposito_origen") or r.get("cod_deposito")),
                "deposito_destino": _as_int(r.get("cod_deposito_destino") or r.get("deposito_destino")),
                "cod_empresa":      _as_int(r.get("cod_empresa")),
                "estado":           r.get("estado") or r.get("status") or "",
                "observacion":      r.get("observacion") or r.get("obs") or "",
            })
        return result

    # ════════════════════════════════════════════════════════════════════════
    # OPERACIONES DE ESCRITURA (POST / PUT) — según guía funcional de la API
    # ════════════════════════════════════════════════════════════════════════

    def _post(self, endpoint: str, body: dict) -> dict[str, Any]:
        """Generic authenticated POST. Raises ValueError with API message on 4xx."""
        self.ensure_token()
        resp = requests.post(
            f"{self.base_url}{endpoint}",
            headers={**self.headers(), "Content-Type": "application/json"},
            json=body,
            timeout=30,
        )
        if resp.status_code == 401:
            self.authenticate()
            resp = requests.post(
                f"{self.base_url}{endpoint}",
                headers={**self.headers(), "Content-Type": "application/json"},
                json=body,
                timeout=30,
            )
        if not resp.ok:
            try:
                detail = resp.json()
            except Exception:
                detail = resp.text[:300]
            raise ValueError(f"InfoManager {resp.status_code}: {detail}")
        try:
            return resp.json()
        except Exception:
            return {"ok": True, "status": resp.status_code}

    def _put(self, endpoint: str, body: dict) -> dict[str, Any]:
        """Generic authenticated PUT."""
        self.ensure_token()
        resp = requests.put(
            f"{self.base_url}{endpoint}",
            headers={**self.headers(), "Content-Type": "application/json"},
            json=body,
            timeout=30,
        )
        if resp.status_code == 401:
            self.authenticate()
            resp = requests.put(
                f"{self.base_url}{endpoint}",
                headers={**self.headers(), "Content-Type": "application/json"},
                json=body,
                timeout=30,
            )
        if not resp.ok:
            try:
                detail = resp.json()
            except Exception:
                detail = resp.text[:300]
            raise ValueError(f"InfoManager {resp.status_code}: {detail}")
        try:
            return resp.json()
        except Exception:
            return {"ok": True, "status": resp.status_code}

    # ── Clientes ─────────────────────────────────────────────────────────────

    def consultar_afip(self, identificador: str) -> dict[str, Any]:
        """GET /api/v1/clientes/GetDatosArca/{identificador}
        Consulta datos del contribuyente en ARCA/AFIP.
        Solo números, sin guiones. CUIT/CUIL: 11 dígitos, DNI: 7 u 8 dígitos.
        """
        self.ensure_token()
        clean = str(identificador).replace("-", "").replace(" ", "")
        resp = requests.get(
            f"{self.base_url}/api/v1/clientes/GetDatosArca/{clean}",
            headers=self.headers(),
            timeout=20,
        )
        if resp.status_code == 401:
            self.authenticate()
            resp = requests.get(
                f"{self.base_url}/api/v1/clientes/GetDatosArca/{clean}",
                headers=self.headers(),
                timeout=20,
            )
        if resp.status_code == 502:
            raise ValueError("El identificador no existe en AFIP/ARCA")
        if not resp.ok:
            raise ValueError(f"AFIP lookup error {resp.status_code}: {resp.text[:200]}")
        return resp.json()

    def crear_cliente(self, datos: dict) -> dict[str, Any]:
        """POST /api/v1/clientes — Dar de alta un cliente nuevo.
        Campos obligatorios: nombre, categoria_iva, cod_tipo_doc, numero_doc,
        cuit (##-########-#), habilitado (S/N), fecha_alta (AAAA-MM-DD),
        fecha_estado (AAAA-MM-DD), email, cod_vendedor, lista_precio,
        domicilio, condicion_venta (1-4), cod_compatibilidad (único).
        """
        return self._post("/api/v1/clientes", datos)

    def crear_clientes_batch(self, lista: list[dict]) -> list[dict[str, Any]]:
        """POST /api/v1/clientes/batch — Alta masiva de clientes."""
        return self._post("/api/v1/clientes/batch", lista)  # type: ignore[return-value]

    def editar_cliente(self, cod_cliente: int, datos: dict) -> dict[str, Any]:
        """PUT /api/v1/clientes/{cod_cliente}
        Campos editables: nombre, categoria_iva, cod_tipo_doc, numero_doc, cuit, cod_cuenta.
        """
        return self._put(f"/api/v1/clientes/{cod_cliente}", datos)

    def cambiar_estado_cliente(self, cod_cliente: int, habilitado: str, fecha_estado: str) -> dict[str, Any]:
        """PUT /api/v1/clientes/estado/{cod_cliente}
        habilitado: 'S' (activo) o 'N' (inactivo).
        fecha_estado: AAAA-MM-DD.
        """
        return self._put(f"/api/v1/clientes/estado/{cod_cliente}", {
            "habilitado": habilitado,
            "fecha_estado": fecha_estado,
        })

    def obtener_cliente_detallado(self, cod_cliente: int) -> dict[str, Any]:
        """GET /api/v1/clientes/detallado/{cod_cliente}
        Datos completos: domicilio, observaciones, crédito, vendedor, lista de precios.
        """
        self.ensure_token()
        resp = requests.get(
            f"{self.base_url}/api/v1/clientes/detallado/{cod_cliente}",
            headers=self.headers(),
            timeout=15,
        )
        if resp.ok and resp.content:
            return resp.json()
        return {}

    # ── Ventas ────────────────────────────────────────────────────────────────

    def crear_venta(self, cabecera: dict, items: list[dict]) -> dict[str, Any]:
        """POST /api/v1/ventas — Registrar una factura de venta.

        Cabecera mínima obligatoria (según guía):
          fecha (AAAA-MM-DD), tipo_comprobante (FA/NC/ND/PR/RE),
          tipo_factura (A/B/C/E/M), numero (0=auto), punto_de_venta,
          moneda (P/D), cotizacion (1 para pesos), id_destino (2/3/11),
          cod_cliente, cod_empresa, tag (S=CC1/N=CC2),
          condicion_venta_tipo (1-4), usuario.

        Cada ítem: cod_articulo (0=libre), cantidad, cod_lista_precios,
          descuento_porc, cod_unidad_negocio, detalle.

        ⚠️ numero=0 genera el número automáticamente.
        ⚠️ id_destino: 2=Electrónica interna, 3=Controlador fiscal, 11=Mostrador CC2.
        """
        body = {**cabecera, "items": items}
        return self._post("/api/v1/ventas", body)

    # ── Recibos ───────────────────────────────────────────────────────────────

    def crear_recibo(
        self,
        cabecera: dict,
        pagos: list[dict],
        comprobantes: list[dict],
    ) -> dict[str, Any]:
        """POST /api/v1/Recibo — Registrar un cobro a un cliente.

        Cabecera: cod_empresa, fecha (AAAA-MM-DD), centro_costo (S=CC1/N=CC2),
          cod_cliente, usuario, moneda (P/D), cotizacion, detalle.

        Cada pago: forma_pago (EF=efectivo/TJ=tarjeta), importe,
          cod_cuenta (cuenta contable del medio de pago),
          tarjeta_numero y tarjeta_numero_cupon si forma_pago=TJ.

        Cada comprobante: id (ID interno de la factura), importe_a_pagar.

        ⚠️ La suma de los pagos debe coincidir con la suma de importe_a_pagar.
        ⚠️ centro_costo en recibos: S=CC1, N=CC2 (NO invertido como el libro mayor).
        """
        body = {
            **cabecera,
            "pagos": pagos,
            "comprobantes": comprobantes,
        }
        return self._post("/api/v1/Recibo", body)

    # ── Presupuestos ──────────────────────────────────────────────────────────

    def crear_presupuesto(self, cabecera: dict, items: list[dict]) -> dict[str, Any]:
        """POST /api/v1/presupuestos — Crear un presupuesto.

        Diferencias clave vs venta:
          tipo_comprobante = 'PR', tipo_factura = 'X'
          tipo_presupuesto: 'NC'=no confirmado, 'C'=confirmado
          id_destino: 1=Manual CC1, 11=Mostrador CC2
          talonario_manual = 'N', tipo_recibo = 'L'
          mueve_stock: 'S'=reserva stock, 'N'=no reserva
        """
        body = {**cabecera, "items": items}
        return self._post("/api/v1/presupuestos", body)

    def obtener_facturas_de_presupuesto(self, id_presupuesto: int) -> list[dict[str, Any]]:
        """GET /api/v1/presupuestos/obtener_facturas/{id_presupuesto}
        Trazabilidad presupuesto → factura. Devuelve las facturas generadas.
        """
        self.ensure_token()
        resp = requests.get(
            f"{self.base_url}/api/v1/presupuestos/obtener_facturas/{id_presupuesto}",
            headers=self.headers(),
            timeout=15,
        )
        if resp.ok and resp.content:
            data = resp.json()
            return data if isinstance(data, list) else [data]
        return []

    # ── Compras ───────────────────────────────────────────────────────────────

    def crear_orden_compra(self, cabecera: dict, items: list[dict]) -> dict[str, Any]:
        """POST /api/v1/compras/ordendecompra — Crear orden de compra.

        Cabecera: tipo_pago (P=proveedor/C=cuenta contable), cod_proveedor o cod_cuenta,
          fecha (AAAA-MM-DD), cod_empresa, moneda (P/D), cotizacion,
          tag (S=CC1/N=CC2), detalle, cod_deposito, condicion_de_pago.

        Cada ítem: cod_articulo, cantidad, precio, descuento, iva.
        """
        body = {**cabecera, "items": items}
        return self._post("/api/v1/compras/ordendecompra", body)

    # ── Artículos ─────────────────────────────────────────────────────────────

    def crear_articulo(self, datos: dict) -> dict[str, Any]:
        """POST /api/v1/articulos — Dar de alta un artículo nuevo.

        Campos obligatorios: descripcion, cod_afip_concepto (1/2/3),
          cod_cuenta_venta, habilitado (1/2), iva (0/10.5/21/27),
          moneda (P/D), precio_compra, precio_compra_dolar,
          precio_venta, precio_venta_dolar, tipo_movimiento (V/C/A).
        """
        return self._post("/api/v1/articulos", datos)

    # ── Rubros y Subrubros ────────────────────────────────────────────────────

    def crear_rubro(self, descripcion: str, tipo_rubro: str = "", cod_compatibilidad: str = "") -> dict[str, Any]:
        """POST /api/v1/rubros — Crear rubro nuevo."""
        return self._post("/api/v1/rubros", {
            "descripcion": descripcion,
            "tipo_rubro": tipo_rubro,
            "cod_compatibilidad": cod_compatibilidad,
        })

    def crear_subrubro(self, cod_rubro: int, descripcion: str) -> dict[str, Any]:
        """POST /api/v1/subrubros — Crear subrubro nuevo.
        cod_rubro obligatorio — el subrubro debe pertenecer a un rubro existente.
        """
        return self._post("/api/v1/subrubros", {
            "cod_rubro": cod_rubro,
            "descripcion": descripcion,
        })

    # ── Proveedores ───────────────────────────────────────────────────────────

    def crear_proveedor(self, datos: dict) -> dict[str, Any]:
        """POST /api/v1/proveedores — Dar de alta un proveedor.

        Campos obligatorios: nombre, cuit (##-########-#, 13 chars con guiones),
          numero_cai, vencimiento_cai (AAAA-MM-DD, no acepta fechas pasadas).
        Opcionales: telefono, domicilio, email, categoria_iva, cod_cuenta,
          moneda, observaciones (máx. 113 chars).
        """
        return self._post("/api/v1/proveedores", datos)

    # ── Consultas de libro mayor por grupo de cuentas ────────────────────────

    def obtener_mayor_por_rango_cuenta(
        self,
        desde,
        hasta,
        prefijo_cuenta: str,
        cod_empresa: int = 1,
        tag: str = "N",
        saldo_anterior: str = "S",
    ) -> list[dict[str, Any]]:
        """GET /api/v1/planes/mayor filtrado por prefijo de cuenta.

        Según la guía: tag en libro mayor está INVERTIDO:
          S = CC2, N = CC1
        Usar saldo_anterior='S' para incluir el saldo previo al período.

        Prefijos típicos (plan de cuentas estándar):
          '111' → Caja y Bancos (ACTIVO corriente)
          '112' → Bancos cuentas corrientes
          '4'   → Ingresos / Ventas
          '5'   → Costos y Gastos
          '21'  → Proveedores (PASIVO corriente)
        """
        all_rows = []
        for t in ("S", "N") if tag == "T" else [tag]:
            params = {
                "fechaDesde": desde.strftime("%Y%m%d"),
                "fechaHasta": hasta.strftime("%Y%m%d"),
                "tag": t,
                "saldoAnterior": saldo_anterior,
                "codEmpresa": cod_empresa,
                "codCuenta": 0,
                "page": 1,
                "limit": 500,
            }
            rows = self.fetch_paginated("/api/v1/planes/mayor", params, max_pages=200)
            filtered = [
                r for r in rows
                if str(r.get("cuenta") or "").startswith(prefijo_cuenta)
            ]
            all_rows.extend(filtered)
        return all_rows

    # ── End write methods ────────────────────────────────────────────────────

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
