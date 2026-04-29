from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.sale import Sale
from app.services.demo_seed import CLIENT_ID

router = APIRouter(prefix="/api/demo", tags=["demo-bi"])


def _date_filters(start_date: date | None, end_date: date | None):
    filters = [Sale.client_id == CLIENT_ID]
    if start_date:
        filters.append(Sale.date >= start_date)
    if end_date:
        filters.append(Sale.date <= end_date)
    return filters


@router.get("/kpis")
async def get_demo_kpis(db: AsyncSession = Depends(get_db)):
    today = date.today()
    month_start = today.replace(day=1)

    today_result = await db.execute(
        select(
            func.coalesce(func.sum(Sale.total), 0),
            func.coalesce(func.sum((Sale.unit_price - Sale.unit_cost) * Sale.quantity), 0),
        ).where(and_(Sale.client_id == CLIENT_ID, Sale.date == today))
    )
    today_sales, today_margin = today_result.one()

    month_result = await db.execute(
        select(
            func.coalesce(func.sum(Sale.total), 0),
            func.coalesce(func.sum((Sale.unit_price - Sale.unit_cost) * Sale.quantity), 0),
            func.coalesce(func.sum(Sale.quantity), 0),
        ).where(and_(Sale.client_id == CLIENT_ID, Sale.date >= month_start, Sale.date <= today))
    )
    month_sales, month_margin, month_units = month_result.one()

    fixed_costs = 2_500_000
    break_even_progress = min(float(month_margin) / fixed_costs, 1) if fixed_costs else 0
    gross_margin_rate = (float(month_margin) / float(month_sales)) if float(month_sales) else 0

    active_customers_result = await db.execute(
        select(func.count(func.distinct(Sale.customer_name))).where(
            and_(Sale.client_id == CLIENT_ID, Sale.date >= month_start, Sale.date <= today)
        )
    )

    return {
        "client_id": CLIENT_ID,
        "client_name": "Distribuidora San Miguel",
        "today_sales": round(float(today_sales), 2),
        "today_margin": round(float(today_margin), 2),
        "month_sales": round(float(month_sales), 2),
        "month_margin": round(float(month_margin), 2),
        "month_units": int(month_units or 0),
        "gross_margin_rate": round(gross_margin_rate, 4),
        "fixed_costs": fixed_costs,
        "break_even_progress": round(break_even_progress, 4),
        "active_customers": active_customers_result.scalar_one(),
    }


@router.get("/ventas")
async def list_demo_sales(
    start_date: date | None = None,
    end_date: date | None = None,
    product: str | None = None,
    customer: str | None = None,
    seller: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    filters = _date_filters(start_date, end_date)
    if product:
        filters.append(Sale.product == product)
    if customer:
        filters.append(Sale.customer_name == customer)
    if seller:
        filters.append(Sale.seller == seller)

    total_result = await db.execute(select(func.count()).select_from(Sale).where(and_(*filters)))
    rows_result = await db.execute(
        select(Sale).where(and_(*filters)).order_by(desc(Sale.date), desc(Sale.id)).limit(limit).offset(offset)
    )

    return {
        "total": total_result.scalar_one(),
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": row.id,
                "date": row.date.isoformat(),
                "product": row.product,
                "category": row.category,
                "quantity": row.quantity,
                "unit_price": row.unit_price,
                "unit_cost": row.unit_cost,
                "total": row.total,
                "seller": row.seller,
                "customer_name": row.customer_name,
                "city": row.city,
            }
            for row in rows_result.scalars().all()
        ],
    }


@router.get("/ventas/serie")
async def get_sales_series(days: int = Query(default=30, ge=7, le=365), db: AsyncSession = Depends(get_db)):
    start = date.today() - timedelta(days=days - 1)
    result = await db.execute(
        select(Sale.date, func.sum(Sale.total), func.sum((Sale.unit_price - Sale.unit_cost) * Sale.quantity))
        .where(and_(Sale.client_id == CLIENT_ID, Sale.date >= start))
        .group_by(Sale.date)
        .order_by(Sale.date)
    )

    return [
        {
            "date": row[0].isoformat(),
            "sales": round(float(row[1] or 0), 2),
            "margin": round(float(row[2] or 0), 2),
        }
        for row in result.all()
    ]


@router.get("/productos/top")
async def get_top_products(limit: int = Query(default=5, ge=1, le=20), db: AsyncSession = Depends(get_db)):
    sales_total = func.sum(Sale.total).label("sales")
    margin_total = func.sum((Sale.unit_price - Sale.unit_cost) * Sale.quantity).label("margin")
    units_total = func.sum(Sale.quantity).label("units")
    result = await db.execute(
        select(
            Sale.product,
            Sale.category,
            sales_total,
            margin_total,
            units_total,
        )
        .where(Sale.client_id == CLIENT_ID)
        .group_by(Sale.product, Sale.category)
        .order_by(desc(sales_total))
        .limit(limit)
    )

    return [
        {
            "product": row.product,
            "category": row.category,
            "sales": round(float(row.sales or 0), 2),
            "margin": round(float(row.margin or 0), 2),
            "units": int(row.units or 0),
        }
        for row in result.all()
    ]


@router.get("/clientes/top")
async def get_top_customers(limit: int = Query(default=5, ge=1, le=20), db: AsyncSession = Depends(get_db)):
    sales_total = func.sum(Sale.total).label("sales")
    orders_total = func.count(Sale.id).label("orders")
    last_purchase = func.max(Sale.date).label("last_purchase")
    result = await db.execute(
        select(
            Sale.customer_name,
            sales_total,
            orders_total,
            last_purchase,
        )
        .where(Sale.client_id == CLIENT_ID)
        .group_by(Sale.customer_name)
        .order_by(desc(sales_total))
        .limit(limit)
    )

    return [
        {
            "customer_name": row.customer_name,
            "sales": round(float(row.sales or 0), 2),
            "orders": int(row.orders or 0),
            "last_purchase": row.last_purchase.isoformat(),
        }
        for row in result.all()
    ]
