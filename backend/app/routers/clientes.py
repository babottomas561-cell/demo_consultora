from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.bi_customer import BiCustomer
from app.models.bi_sale import BiSale
from app.models.bi_sale_item import BiSaleItem
from app.models.bi_vendedor import BiVendedor

router = APIRouter(prefix="/clientes", tags=["clientes"])

FACTURAS = ("FA",)


@router.get("")
async def list_clientes(
    q: str | None = None,
    categoria_iva: str | None = None,
    cod_vendedor: int | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if q:
        filters.append(BiCustomer.nombre.ilike(f"%{q}%"))
    if categoria_iva:
        filters.append(BiCustomer.categoria_iva == categoria_iva)
    if cod_vendedor:
        filters.append(BiCustomer.cod_vendedor == cod_vendedor)

    total_r = await db.execute(select(func.count()).select_from(BiCustomer).where(and_(*filters) if filters else True))
    total = int(total_r.scalar_one())

    r = await db.execute(
        select(BiCustomer)
        .where(and_(*filters) if filters else True)
        .order_by(BiCustomer.nombre)
        .limit(limit).offset(offset)
    )
    customers = r.scalars().all()

    # Ventas del último mes por cliente
    month_start = date.today().replace(day=1)
    cod_clientes = [c.cod_cliente for c in customers]
    sales_map: dict[int, float] = {}
    if cod_clientes:
        sr = await db.execute(
            select(BiSale.cod_cliente, func.sum(BiSale.total).label("total"))
            .where(and_(
                BiSale.cod_cliente.in_(cod_clientes),
                BiSale.tipo_comprobante.in_(FACTURAS),
                BiSale.anulada == "N",
                BiSale.fecha >= month_start,
            ))
            .group_by(BiSale.cod_cliente)
        )
        sales_map = {row.cod_cliente: float(row.total or 0) for row in sr.all()}

    # Nombres de vendedores
    cod_vendedores = list({c.cod_vendedor for c in customers if c.cod_vendedor})
    vendedores_map: dict[int, str] = {}
    if cod_vendedores:
        vr = await db.execute(select(BiVendedor.cod_vendedor, BiVendedor.nombre).where(BiVendedor.cod_vendedor.in_(cod_vendedores)))
        vendedores_map = {v.cod_vendedor: v.nombre for v in vr.all()}

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "cod_cliente": c.cod_cliente,
                "nombre": c.nombre,
                "razon_social": c.razon_social,
                "categoria_iva": c.categoria_iva,
                "cuit": c.cuit,
                "email": c.email,
                "domicilio": c.domicilio,
                "telefonos": c.telefonos,
                "condicion_venta": c.condicion_venta,
                "cod_vendedor": c.cod_vendedor,
                "vendedor_nombre": vendedores_map.get(c.cod_vendedor, ""),
                "ventas_mes": round(sales_map.get(c.cod_cliente, 0), 2),
            }
            for c in customers
        ],
    }


@router.get("/{cod_cliente}")
async def get_cliente(cod_cliente: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(BiCustomer).where(BiCustomer.cod_cliente == cod_cliente))
    customer = r.scalar_one_or_none()
    if not customer:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Últimas 12 ventas
    ventas_r = await db.execute(
        select(BiSale)
        .where(and_(BiSale.cod_cliente == cod_cliente, BiSale.tipo_comprobante.in_(FACTURAS), BiSale.anulada == "N"))
        .order_by(desc(BiSale.fecha))
        .limit(12)
    )
    ultimas_ventas = ventas_r.scalars().all()

    # Estadísticas históricas
    stats_r = await db.execute(
        select(
            func.count(BiSale.source_sale_id).label("total_compras"),
            func.sum(BiSale.total).label("total_facturado"),
            func.max(BiSale.fecha).label("ultima_compra"),
            func.min(BiSale.fecha).label("primera_compra"),
        )
        .where(and_(BiSale.cod_cliente == cod_cliente, BiSale.tipo_comprobante.in_(FACTURAS), BiSale.anulada == "N"))
    )
    stats = stats_r.one()

    # Margen del cliente (items)
    margin_r = await db.execute(
        select(func.sum((BiSaleItem.precio_con_iva - BiSaleItem.precio_compra_actual) * BiSaleItem.cantidad))
        .where(BiSaleItem.cod_cliente == cod_cliente)
    )
    total_margen = float(margin_r.scalar_one() or 0)
    total_facturado = float(stats.total_facturado or 0)

    vendedor_nombre = ""
    if customer.cod_vendedor:
        vr = await db.execute(select(BiVendedor.nombre).where(BiVendedor.cod_vendedor == customer.cod_vendedor))
        row = vr.scalar_one_or_none()
        if row:
            vendedor_nombre = row

    return {
        "cod_cliente": customer.cod_cliente,
        "nombre": customer.nombre,
        "razon_social": customer.razon_social,
        "categoria_iva": customer.categoria_iva,
        "cuit": customer.cuit,
        "email": customer.email,
        "domicilio": customer.domicilio,
        "telefonos": customer.telefonos,
        "condicion_venta": customer.condicion_venta,
        "cod_vendedor": customer.cod_vendedor,
        "vendedor_nombre": vendedor_nombre,
        "lista_precio": customer.lista_precio,
        "fecha_alta": customer.fecha_alta.isoformat() if customer.fecha_alta else None,
        "stats": {
            "total_compras": int(stats.total_compras or 0),
            "total_facturado": round(total_facturado, 2),
            "total_margen": round(total_margen, 2),
            "margen_pct": round(total_margen / total_facturado * 100, 1) if total_facturado else 0,
            "ultima_compra": stats.ultima_compra.isoformat() if stats.ultima_compra else None,
            "primera_compra": stats.primera_compra.isoformat() if stats.primera_compra else None,
        },
        "ultimas_ventas": [
            {
                "id": v.source_sale_id,
                "fecha": v.fecha.isoformat(),
                "tipo_comprobante": v.tipo_comprobante,
                "total": round(float(v.total or 0), 2),
            }
            for v in ultimas_ventas
        ],
    }
