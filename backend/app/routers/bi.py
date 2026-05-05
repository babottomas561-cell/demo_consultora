from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.integrations.infomanager.sync_service import get_bi_status
from app.models.bi_customer import BiCustomer
from app.models.bi_product import BiProduct
from app.models.bi_sale import BiSale
from app.models.bi_sale_item import BiSaleItem

router = APIRouter(prefix="/bi", tags=["bi"])

# Solo facturas de venta reales — excluye NC, ND, presupuestos, remitos
FACTURAS = ("FA",)


def _venta_filters(fecha_desde: date, fecha_hasta: date):
    return [
        BiSale.tipo_comprobante.in_(FACTURAS),
        BiSale.anulada == "N",
        BiSale.fecha >= fecha_desde,
        BiSale.fecha <= fecha_hasta,
    ]


# ─────────────────────────────────────── status

@router.get("/status")
async def bi_status(db: AsyncSession = Depends(get_db)):
    return await get_bi_status(db)


# ─────────────────────────────────────── kpis

@router.get("/kpis")
async def get_kpis(db: AsyncSession = Depends(get_db)):
    today = date.today()
    month_start = today.replace(day=1)

    # Ventas de hoy
    r = await db.execute(
        select(func.coalesce(func.sum(BiSale.total), 0)).where(
            and_(BiSale.tipo_comprobante.in_(FACTURAS), BiSale.anulada == "N", BiSale.fecha == today)
        )
    )
    today_sales = float(r.scalar_one())

    # Ventas + neto del mes
    r = await db.execute(
        select(
            func.coalesce(func.sum(BiSale.total), 0),
            func.coalesce(func.sum(BiSale.neto), 0),
        ).where(and_(*_venta_filters(month_start, today)))
    )
    month_sales, month_neto = r.one()
    month_sales = float(month_sales)

    # Margen real del mes (desde items: precio_venta - precio_compra) * cantidad
    r = await db.execute(
        select(
            func.coalesce(
                func.sum(
                    (BiSaleItem.precio_con_iva - BiSaleItem.precio_compra_actual) * BiSaleItem.cantidad
                ),
                0,
            )
        )
        .join(BiSale, and_(
            BiSale.source_sale_id == BiSaleItem.source_sale_id,
            BiSale.source_id == BiSaleItem.source_id,
        ))
        .where(and_(*_venta_filters(month_start, today)))
    )
    month_margin = float(r.scalar_one())
    gross_margin_rate = (month_margin / month_sales) if month_sales else 0

    # Unidades del mes
    r = await db.execute(
        select(func.coalesce(func.sum(BiSaleItem.cantidad), 0))
        .join(BiSale, and_(
            BiSale.source_sale_id == BiSaleItem.source_sale_id,
            BiSale.source_id == BiSaleItem.source_id,
        ))
        .where(and_(*_venta_filters(month_start, today)))
    )
    month_units = int(r.scalar_one())

    # Clientes activos del mes
    r = await db.execute(
        select(func.count(func.distinct(BiSale.cod_cliente))).where(
            and_(*_venta_filters(month_start, today))
        )
    )
    active_customers = int(r.scalar_one())

    # Punto de equilibrio — en Fase 3 vendrá del plan de cuentas real
    # Por ahora usamos un placeholder para que el frontend no rompa
    fixed_costs = 0.0
    break_even_progress = (month_margin / fixed_costs) if fixed_costs else 0.0

    return {
        "client_name": "Mi Empresa",          # Fase 5: vendrá del modelo Company
        "today_sales": round(today_sales, 2),
        "month_sales": round(month_sales, 2),
        "month_margin": round(month_margin, 2),
        "month_units": month_units,
        "month_neto": round(float(month_neto), 2),
        "gross_margin_rate": round(gross_margin_rate, 4),
        "active_customers": active_customers,
        "fixed_costs": fixed_costs,
        "break_even_progress": round(break_even_progress, 4),
        "data_source": "infomanager",
    }


# ─────────────────────────────────────── serie de ventas

@router.get("/ventas/serie")
async def get_ventas_serie(
    days: int = Query(default=30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
):
    start = date.today() - timedelta(days=days - 1)
    r = await db.execute(
        select(
            BiSale.fecha,
            func.sum(BiSale.total).label("sales"),
            func.sum(BiSale.neto).label("neto"),
        )
        .where(and_(*_venta_filters(start, date.today())))
        .group_by(BiSale.fecha)
        .order_by(BiSale.fecha)
    )
    return [
        {
            "date": row.fecha.isoformat(),
            "sales": round(float(row.sales or 0), 2),
            "neto": round(float(row.neto or 0), 2),
        }
        for row in r.all()
    ]


# ─────────────────────────────────────── top productos

@router.get("/productos/top")
async def get_top_productos(
    limit: int = Query(default=5, ge=1, le=20),
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    start = date.today() - timedelta(days=days - 1)

    r = await db.execute(
        select(
            BiSaleItem.cod_articulo,
            BiSaleItem.detalle,
            func.sum(BiSaleItem.importe).label("sales"),
            func.sum(
                (BiSaleItem.precio_con_iva - BiSaleItem.precio_compra_actual) * BiSaleItem.cantidad
            ).label("margin"),
            func.sum(BiSaleItem.cantidad).label("units"),
        )
        .join(BiSale, and_(
            BiSale.source_sale_id == BiSaleItem.source_sale_id,
            BiSale.source_id == BiSaleItem.source_id,
        ))
        .where(and_(*_venta_filters(start, date.today())))
        .group_by(BiSaleItem.cod_articulo, BiSaleItem.detalle)
        .order_by(desc("sales"))
        .limit(limit)
    )

    rows = r.all()

    # Enriquecer con rubro desde BiProduct
    cod_articulos = [row.cod_articulo for row in rows if row.cod_articulo]
    products_map: dict[int, str] = {}
    if cod_articulos:
        pr = await db.execute(
            select(BiProduct.cod_articulo, BiProduct.descripcion)
            .where(BiProduct.cod_articulo.in_(cod_articulos))
        )
        products_map = {p.cod_articulo: p.descripcion for p in pr.all()}

    return [
        {
            "product": products_map.get(row.cod_articulo, row.detalle or "Sin descripción"),
            "category": "",  # rubro se agrega en Fase 2 con rubros sincronizados
            "sales": round(float(row.sales or 0), 2),
            "margin": round(float(row.margin or 0), 2),
            "units": round(float(row.units or 0), 1),
        }
        for row in rows
    ]


# ─────────────────────────────────────── top clientes

@router.get("/clientes/top")
async def get_top_clientes(
    limit: int = Query(default=5, ge=1, le=20),
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    start = date.today() - timedelta(days=days - 1)

    r = await db.execute(
        select(
            BiSale.cod_cliente,
            func.sum(BiSale.total).label("sales"),
            func.count(BiSale.source_sale_id).label("orders"),
            func.max(BiSale.fecha).label("last_purchase"),
        )
        .where(and_(*_venta_filters(start, date.today())))
        .group_by(BiSale.cod_cliente)
        .order_by(desc("sales"))
        .limit(limit)
    )
    rows = r.all()

    # Resolver nombres desde BiCustomer
    cod_clientes = [row.cod_cliente for row in rows if row.cod_cliente]
    names_map: dict[int, str] = {}
    if cod_clientes:
        cr = await db.execute(
            select(BiCustomer.cod_cliente, BiCustomer.nombre)
            .where(BiCustomer.cod_cliente.in_(cod_clientes))
        )
        names_map = {c.cod_cliente: c.nombre for c in cr.all()}

    return [
        {
            "customer_name": names_map.get(row.cod_cliente, f"Cliente {row.cod_cliente}"),
            "sales": round(float(row.sales or 0), 2),
            "orders": int(row.orders or 0),
            "last_purchase": row.last_purchase.isoformat() if row.last_purchase else None,
        }
        for row in rows
    ]


# ─────────────────────────────────────── listado ventas

@router.get("/ventas")
async def get_ventas(
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    start = date.today() - timedelta(days=days - 1)
    filters = _venta_filters(start, date.today())

    total_r = await db.execute(
        select(func.count()).select_from(BiSale).where(and_(*filters))
    )
    total = int(total_r.scalar_one())

    r = await db.execute(
        select(BiSale)
        .where(and_(*filters))
        .order_by(desc(BiSale.fecha), desc(BiSale.source_sale_id))
        .limit(limit)
        .offset(offset)
    )
    sales = r.scalars().all()

    # Resolver nombres de clientes
    cod_clientes = list({s.cod_cliente for s in sales if s.cod_cliente})
    names_map: dict[int, str] = {}
    if cod_clientes:
        cr = await db.execute(
            select(BiCustomer.cod_cliente, BiCustomer.nombre)
            .where(BiCustomer.cod_cliente.in_(cod_clientes))
        )
        names_map = {c.cod_cliente: c.nombre for c in cr.all()}

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": s.source_sale_id,
                "date": s.fecha.isoformat(),
                "tipo_comprobante": s.tipo_comprobante,
                "tipo_factura": s.tipo_factura,
                "numero": s.numero,
                "total": round(float(s.total or 0), 2),
                "neto": round(float(s.neto or 0), 2),
                "customer_name": names_map.get(s.cod_cliente, f"Cliente {s.cod_cliente}"),
                "cod_vendedor": s.cod_vendedor,
                "anulada": s.anulada,
            }
            for s in sales
        ],
    }
