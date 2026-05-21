"""
InfoManager write operations — POST/PUT endpoints que el frontend puede llamar
para crear ventas, recibos, clientes, presupuestos y órdenes de compra.

Cada endpoint autentica contra InfoManager usando las credenciales del conector
activo de la empresa. Este módulo es autocontenido: no depende del worker service.
"""
from __future__ import annotations

import requests as _requests
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.v1.dashboard import get_tenant_schema
from app.core.database import get_db

router = APIRouter(prefix="/im", tags=["infomanager-ops"])


# ── Mini connector (self-contained) ───────────────────────────────────────────

class _IM:
    """Minimal InfoManager client for write operations."""

    def __init__(self, client_id: str, client_secret: str, base_url: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = base_url.rstrip("/")
        self._token: str | None = None

    def _auth(self) -> None:
        r = _requests.post(
            f"{self.base_url}/api/v1/auth/login",
            json={"client_id": self.client_id, "client_secret": self.client_secret},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        self._token = data.get("access_token") or data.get("token") or data.get("accessToken")
        if not self._token:
            raise ValueError("No token in auth response")

    def _headers(self) -> dict[str, str]:
        if not self._token:
            self._auth()
        return {"Authorization": f"Bearer {self._token}"}

    def get(self, path: str, params: dict | None = None) -> Any:
        r = _requests.get(f"{self.base_url}{path}", headers=self._headers(), params=params, timeout=20)
        if r.status_code == 401:
            self._auth()
            r = _requests.get(f"{self.base_url}{path}", headers=self._headers(), params=params, timeout=20)
        self._raise(r)
        return r.json() if r.content else {}

    def post(self, path: str, body: dict | list) -> Any:
        r = _requests.post(
            f"{self.base_url}{path}",
            headers={**self._headers(), "Content-Type": "application/json"},
            json=body,
            timeout=30,
        )
        if r.status_code == 401:
            self._auth()
            r = _requests.post(
                f"{self.base_url}{path}",
                headers={**self._headers(), "Content-Type": "application/json"},
                json=body,
                timeout=30,
            )
        self._raise(r)
        return r.json() if r.content else {"ok": True}

    def put(self, path: str, body: dict) -> Any:
        r = _requests.put(
            f"{self.base_url}{path}",
            headers={**self._headers(), "Content-Type": "application/json"},
            json=body,
            timeout=30,
        )
        if r.status_code == 401:
            self._auth()
            r = _requests.put(
                f"{self.base_url}{path}",
                headers={**self._headers(), "Content-Type": "application/json"},
                json=body,
                timeout=30,
            )
        self._raise(r)
        return r.json() if r.content else {"ok": True}

    @staticmethod
    def _raise(r: _requests.Response) -> None:
        if not r.ok:
            try:
                detail = r.json()
            except Exception:
                detail = r.text[:300]
            raise ValueError(f"InfoManager {r.status_code}: {detail}")


# ── Dependency: build IM client from connector config ────────────────────────

async def _im(
    db: AsyncSession,
    current_user,
    company_id: int | None,
) -> _IM:
    # Determine effective company_id
    cid = (
        company_id
        if (current_user.is_admin and company_id)
        else current_user.company_id
    )
    if not cid:
        raise HTTPException(status_code=400, detail="company_id requerido")

    row = (await db.execute(text(
        "SELECT config FROM public.company_connectors "
        "WHERE company_id = :cid AND connector_type = 'INFOMANAGER' "
        "ORDER BY id DESC LIMIT 1"
    ), {"cid": cid})).mappings().one_or_none()

    if not row:
        raise HTTPException(status_code=404, detail="No hay conector InfoManager configurado")

    cfg = row["config"] or {}
    client_id     = cfg.get("client_id") or cfg.get("username") or ""
    client_secret = cfg.get("client_secret") or cfg.get("password") or ""
    base_url      = cfg.get("base_url") or cfg.get("url") or "https://impedidos.infomanager.com.ar"

    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Conector InfoManager sin credenciales")

    return _IM(client_id, client_secret, base_url)


def _call(fn):
    """Convert ValueError / Exception from InfoManager to HTTP errors."""
    try:
        return fn()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Error InfoManager: {str(exc)[:300]}") from exc


# ═══════════════════════════════════════════════════════════════════════════
# AFIP / ARCA — GET /im/afip/{identificador}
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/afip/{identificador}")
async def consultar_afip(
    identificador: str,
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Consulta un contribuyente en ARCA/AFIP.
    Solo números: CUIT/CUIL 11 dígitos, DNI 7 u 8 dígitos.
    Devuelve: nombre, tipo_doc, numero, domicilio, localidad, provincia.
    """
    im = await _im(db, current_user, company_id)
    clean = str(identificador).replace("-", "").replace(" ", "")
    return _call(lambda: im.get(f"/api/v1/clientes/GetDatosArca/{clean}"))


# ═══════════════════════════════════════════════════════════════════════════
# CLIENTES
# ═══════════════════════════════════════════════════════════════════════════

class ClienteCreate(BaseModel):
    nombre: str
    categoria_iva: str = Field(description="RI, CF, RM, EX, etc.")
    cod_tipo_doc: int = Field(description="1=CUIT, 3=DNI, etc.")
    numero_doc: str
    cuit: str = Field(description="##-########-# con guiones")
    habilitado: str = "S"
    fecha_alta: str = Field(description="AAAA-MM-DD")
    fecha_estado: str = Field(description="AAAA-MM-DD")
    observaciones: str = ""
    email: str = ""
    cod_vendedor: int = 0
    lista_precio: int = 0
    domicilio: str = ""
    telefonos: str = ""
    cod_zona: int = 0
    cod_localidad: int = 0
    razon_social: str = ""
    cod_rubro_cliente: int = 0
    condicion_venta: int = Field(default=1, description="1=Efectivo, 2=Cta.cte, 3=Tarjeta, 4=Otros")
    cod_compatibilidad: str = Field(description="Código único en sistema externo — OBLIGATORIO")
    id_grupo: int = 0
    cod_pais: int = 0
    percepcion2: int = 0
    localidad: str = ""


@router.post("/clientes")
async def crear_cliente(
    datos: ClienteCreate,
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dar de alta un cliente nuevo en InfoManager.
    cod_compatibilidad debe ser ÚNICO — es el ID en tu sistema externo.
    """
    im = await _im(db, current_user, company_id)
    return _call(lambda: im.post("/api/v1/clientes", datos.model_dump()))


@router.post("/clientes/batch")
async def crear_clientes_batch(
    lista: list[ClienteCreate],
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Alta masiva de clientes en una sola llamada."""
    im = await _im(db, current_user, company_id)
    return _call(lambda: im.post("/api/v1/clientes/batch", [c.model_dump() for c in lista]))


class ClienteEdit(BaseModel):
    nombre: str | None = None
    categoria_iva: str | None = None
    cod_tipo_doc: int | None = None
    numero_doc: str | None = None
    cuit: str | None = None
    cod_cuenta: str | None = None


@router.put("/clientes/{cod_cliente}")
async def editar_cliente(
    cod_cliente: int,
    datos: ClienteEdit,
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Editar nombre, categoría IVA, documento o cuenta contable de un cliente."""
    im = await _im(db, current_user, company_id)
    payload = {k: v for k, v in datos.model_dump().items() if v is not None}
    return _call(lambda: im.put(f"/api/v1/clientes/{cod_cliente}", payload))


class ClienteEstado(BaseModel):
    habilitado: str = Field(description="S=activo, N=inactivo")
    fecha_estado: str = Field(description="AAAA-MM-DD")


@router.put("/clientes/{cod_cliente}/estado")
async def cambiar_estado_cliente(
    cod_cliente: int,
    datos: ClienteEstado,
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Habilitar o deshabilitar un cliente."""
    im = await _im(db, current_user, company_id)
    return _call(lambda: im.put(f"/api/v1/clientes/estado/{cod_cliente}", datos.model_dump()))


@router.get("/clientes/{cod_cliente}/detalle")
async def cliente_detallado(
    cod_cliente: int,
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ver todos los datos del cliente: domicilio, crédito, vendedor, lista de precios."""
    im = await _im(db, current_user, company_id)
    return _call(lambda: im.get(f"/api/v1/clientes/detallado/{cod_cliente}"))


# ═══════════════════════════════════════════════════════════════════════════
# VENTAS — POST /im/ventas
# ═══════════════════════════════════════════════════════════════════════════

class ItemVenta(BaseModel):
    cod_articulo: int = Field(default=0, description="0=artículo libre sin registro")
    cantidad: float
    cod_lista_precios: int = 0
    descuento_porc: float = 0
    cod_unidad_negocio: int = 0
    cod_vendedor: str = ""
    detalle: str = Field(default="", description="Nombre libre si cod_articulo=0")


class VentaCreate(BaseModel):
    fecha: str = Field(description="AAAA-MM-DD")
    tipo_comprobante: str = Field(description="FA, NC, ND, PR, RE")
    tipo_factura: str = Field(description="A, B, C, E, M — o X para PR/RE")
    numero: int = Field(default=0, description="0 = número automático")
    punto_de_venta: int
    moneda: str = Field(default="P", description="P=Pesos, D=Dólar")
    cotizacion: float = Field(default=1.0)
    id_destino: int = Field(description="2=Electrónica interna, 3=Controlador fiscal, 11=Mostrador CC2")
    cod_cliente: int = Field(default=0)
    cuit: str = ""
    cod_vendedor: int = 0
    cod_empresa: int = 1
    tag: str = Field(description="S=CC1, N=CC2")
    condicion_venta_tipo: int = Field(description="1=Efectivo, 2=Cta.cte, 3=Tarjeta, 4=Otros")
    no_grabado: float = 0
    observaciones: str = ""
    usuario: str = "API_User"
    usuario_fecha: str = ""
    fac_electronica: int = Field(default=0, description="0=No electrónica, 1=Enviada CAE, 2=Pendiente")
    fecha_cae: str = ""
    cae: str = ""
    afip_comprobantes_fe: str = ""
    afip_conceptos_fe: int = 0
    afip_tipdoc_fe: int = 0
    afip_cod_barra: str = ""
    afip_cond_vta: int = 0
    anulada: str = "N"
    cod_compatibilidad: str = ""
    cod_deposito: int = 0
    cod_lista_precios: int = 0
    items: list[ItemVenta] = []


@router.post("/ventas")
async def crear_venta(
    venta: VentaCreate,
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Registrar una factura de venta en InfoManager.
    numero=0 genera el número automáticamente.
    Consultá GET /im/puntos-de-venta antes de crear.
    """
    im = await _im(db, current_user, company_id)
    return _call(lambda: im.post("/api/v1/ventas", venta.model_dump()))


# ═══════════════════════════════════════════════════════════════════════════
# RECIBOS — POST /im/recibos
# ═══════════════════════════════════════════════════════════════════════════

class Pago(BaseModel):
    forma_pago: str = Field(description="EF=Efectivo, TJ=Tarjeta de crédito")
    importe: str = Field(description="Monto pagado con esta forma")
    cod_cuenta: str = Field(description="Cuenta contable del medio de pago (ej: 1114000)")
    cod_unidad_negocio: str = ""
    tarjeta_numero: str = Field(default="", description="Solo si forma_pago=TJ")
    tarjeta_numero_cupon: str = Field(default="", description="Solo si forma_pago=TJ")


class ComprobanteAplicar(BaseModel):
    id: str = Field(description="ID interno de la factura a cobrar")
    importe_a_pagar: str = Field(description="Monto que se aplica a esa factura")


class ReciboCreate(BaseModel):
    cod_empresa: str = "1"
    fecha: str = Field(description="AAAA-MM-DD")
    centro_costo: str = Field(description="S=CC1, N=CC2 — en recibos NO está invertido")
    cod_cliente: str
    usuario: str = "API_User"
    detalle: str = ""
    moneda: str = "P"
    cotizacion: str = "1.0"
    pagos: list[Pago] = Field(description="Formas de pago (puede haber más de una)")
    comprobantes: list[ComprobanteAplicar] = Field(description="Facturas que se están cobrando")


@router.post("/recibos")
async def crear_recibo(
    recibo: ReciboCreate,
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Registrar un cobro a un cliente en InfoManager.

    La suma de pagos[].importe debe coincidir con la suma de comprobantes[].importe_a_pagar.
    centro_costo: S=CC1, N=CC2 (en recibos NO está invertido como en el libro mayor).
    """
    im = await _im(db, current_user, company_id)
    return _call(lambda: im.post("/api/v1/Recibo", recibo.model_dump()))


# ═══════════════════════════════════════════════════════════════════════════
# PRESUPUESTOS
# ═══════════════════════════════════════════════════════════════════════════

class PresupuestoCreate(BaseModel):
    fecha: str = Field(description="AAAA-MM-DD")
    tipo_comprobante: str = "PR"
    tipo_factura: str = "X"
    tipo_presupuesto: str = Field(default="NC", description="NC=no confirmado, C=confirmado")
    punto_de_venta: int
    moneda: str = "P"
    cotizacion: float = 1.0
    id_destino: int = Field(description="1=Manual CC1, 11=Mostrador CC2")
    cod_cliente: int = 0
    cod_vendedor: int = 0
    cod_empresa: int = 1
    tag: str = Field(description="S=CC1, N=CC2")
    condicion_venta_tipo: int = 1
    observaciones: str = ""
    usuario: str = "API_User"
    talonario_manual: str = "N"
    tipo_recibo: str = "L"
    mueve_stock: str = Field(default="N", description="S=reserva stock, N=no reserva")
    cod_deposito: int = 0
    items: list[ItemVenta] = []


@router.post("/presupuestos")
async def crear_presupuesto(
    presupuesto: PresupuestoCreate,
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Crear un presupuesto en InfoManager."""
    im = await _im(db, current_user, company_id)
    return _call(lambda: im.post("/api/v1/presupuestos", presupuesto.model_dump()))


@router.get("/presupuestos/{id_presupuesto}/facturas")
async def facturas_del_presupuesto(
    id_presupuesto: int,
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Ver las facturas generadas a partir de un presupuesto (trazabilidad)."""
    im = await _im(db, current_user, company_id)
    return _call(lambda: im.get(f"/api/v1/presupuestos/obtener_facturas/{id_presupuesto}"))


# ═══════════════════════════════════════════════════════════════════════════
# COMPRAS — ORDEN DE COMPRA
# ═══════════════════════════════════════════════════════════════════════════

class ItemOrdenCompra(BaseModel):
    cod_articulo: int
    cantidad: float
    precio: float
    descuento: float = 0
    iva: float = 21.0


class OrdenCompraCreate(BaseModel):
    tipo_pago: str = Field(description="P=sobre proveedor, C=sobre cuenta contable")
    cod_proveedor: str = Field(default="", description="Obligatorio si tipo_pago=P")
    cod_cuenta: str = Field(default="", description="Obligatorio si tipo_pago=C")
    fecha: str = Field(description="AAAA-MM-DD")
    cod_empresa: str = "1"
    moneda: str = "P"
    cotizacion: str = "1"
    tag: str = Field(description="S=CC1, N=CC2")
    detalle: str = ""
    cod_deposito: str = ""
    condicion_de_pago: str = ""
    items: list[ItemOrdenCompra] = []


@router.post("/compras/orden")
async def crear_orden_compra(
    orden: OrdenCompraCreate,
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Crear una orden de compra en InfoManager."""
    im = await _im(db, current_user, company_id)
    return _call(lambda: im.post("/api/v1/compras/ordendecompra", orden.model_dump()))


# ═══════════════════════════════════════════════════════════════════════════
# MAESTROS — catálogos necesarios antes de crear comprobantes
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/puntos-de-venta")
async def listar_puntos_de_venta(
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar puntos de venta habilitados.
    Consultá este endpoint antes de crear ventas para saber qué punto_de_venta
    e id_destino corresponden a qué tipo de comprobante.
    """
    im = await _im(db, current_user, company_id)
    return _call(lambda: im.get("/api/v1/puntos-de-venta"))


@router.get("/monedas")
async def listar_monedas(
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar monedas disponibles con sus códigos (P=Pesos, D=Dólar, etc.)"""
    im = await _im(db, current_user, company_id)
    return _call(lambda: im.get("/api/v1/monedas/all"))


@router.get("/depositos")
async def listar_depositos(
    company_id: int | None = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Listar depósitos disponibles. Necesario para cod_deposito en ventas y compras."""
    im = await _im(db, current_user, company_id)
    return _call(lambda: im.get("/api/v1/depositos"))
