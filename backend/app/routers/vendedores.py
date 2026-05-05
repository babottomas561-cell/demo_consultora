from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.bi_sale import BiSale
from app.models.bi_sale_item import BiSaleItem
from app.models.bi_vendedor import BiVendedor

router = APIRouter(prefix="/vendedores", tags=["vendedores"])

FACTURAS = ("FA",)


@router.get("")
async def list_vendedores(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(BiVendedor).order_by(BiVendedor.nombre))
    return [{"cod_vendedor": v.cod_vendedor, "nombre": v.nombre, "habilitado": v.habilitado} for v in r.scalars().all()]


@router.get("/ranking")
async def ranking_vendedores(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    start = date.today() - timedelta(days=days - 1)

    r = await db.execute(
        select(
            BiSale.cod_vendedor,
            func.sum(BiSale.total).label("ventas"),
            func.count(BiSale.source_sale_id).label("facturas"),
            func.count(func.distinct(BiSale.cod_cliente)).label("clientes"),
        )
        .where(and_(
            BiSale.tipo_comprobante.in_(FACTURAS),
            BiSale.anulada == "N",
            BiSale.fecha >= start,
        ))
        .group_by(BiSale.cod_vendedor)
        .order_by(desc("ventas"))
    )
    rows = r.all()

    cod_vendedores = [row.cod_vendedor for row in rows if row.cod_vendedor]
    names_map: dict[int, str] = {}
    if cod_vendedores:
        vr = await db.execute(select(BiVendedor.cod_vendedor, BiVendedor.nombre).where(BiVendedor.cod_vendedor.in_(cod_vendedores)))
        names_map = {v.cod_vendedor: v.nombre for v in vr.all()}

    # Margen por vendedor (desde items)
    margin_r = await db.execute(
        select(
            BiSaleItem.cod_vendedor,
            func.sum((BiSaleItem.precio_con_iva - BiSaleItem.precio_compra_actual) * BiSaleItem.cantidad).label("margen"),
        )
        .join(BiSale, and_(BiSale.source_sale_id == BiSaleItem.source_sale_id, BiSale.source_id == BiSaleItem.source_id))
        .where(and_(BiSale.tipo_comprobante.in_(FACTURAS), BiSale.anulada == "N", BiSale.fecha >= start))
        .group_by(BiSaleItem.cod_vendedor)
    )
    margin_map = {row.cod_vendedor: float(row.margen or 0) for row in margin_r.all()}

    total_ventas = sum(float(r.ventas or 0) for r in rows)

    return [
        {
            "cod_vendedor": row.cod_vendedor,
            "nombre": names_map.get(row.cod_vendedor, f"Vendedor {row.cod_vendedor}"),
            "ventas": round(float(row.ventas or 0), 2),
            "facturas": int(row.facturas or 0),
            "clientes": int(row.clientes or 0),
            "margen": round(margin_map.get(row.cod_vendedor, 0), 2),
            "share_pct": round(float(row.ventas or 0) / total_ventas * 100, 1) if total_ventas else 0,
        }
        for row in rows
    ]
