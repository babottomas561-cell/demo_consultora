from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.bi_product import BiProduct
from app.models.bi_rubro import BiRubro
from app.models.bi_sale import BiSale
from app.models.bi_sale_item import BiSaleItem

router = APIRouter(prefix="/articulos", tags=["articulos"])

FACTURAS = ("FA",)


@router.get("")
async def list_articulos(
    q: str | None = None,
    cod_rubro: int | None = None,
    habilitado: str = "1",
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if q:
        filters.append(BiProduct.descripcion.ilike(f"%{q}%"))
    if cod_rubro:
        filters.append(BiProduct.cod_rubro == cod_rubro)
    if habilitado:
        filters.append(BiProduct.habilitado == habilitado)

    total_r = await db.execute(select(func.count()).select_from(BiProduct).where(and_(*filters) if filters else True))
    total = int(total_r.scalar_one())

    r = await db.execute(
        select(BiProduct)
        .where(and_(*filters) if filters else True)
        .order_by(BiProduct.descripcion)
        .limit(limit).offset(offset)
    )
    products = r.scalars().all()

    # Rubros map
    rubro_ids = list({p.cod_rubro for p in products if p.cod_rubro})
    rubros_map: dict[int, str] = {}
    if rubro_ids:
        rr = await db.execute(select(BiRubro.cod_rubro, BiRubro.descripcion).where(BiRubro.cod_rubro.in_(rubro_ids)))
        rubros_map = {r.cod_rubro: r.descripcion for r in rr.all()}

    # Ventas últimos 30 días por artículo
    start = date.today() - timedelta(days=30)
    cod_articulos = [p.cod_articulo for p in products]
    ventas_map: dict[int, dict] = {}
    if cod_articulos:
        vr = await db.execute(
            select(
                BiSaleItem.cod_articulo,
                func.sum(BiSaleItem.importe).label("ventas"),
                func.sum(BiSaleItem.cantidad).label("unidades"),
            )
            .join(BiSale, and_(BiSale.source_sale_id == BiSaleItem.source_sale_id, BiSale.source_id == BiSaleItem.source_id))
            .where(and_(
                BiSaleItem.cod_articulo.in_(cod_articulos),
                BiSale.tipo_comprobante.in_(FACTURAS),
                BiSale.anulada == "N",
                BiSale.fecha >= start,
            ))
            .group_by(BiSaleItem.cod_articulo)
        )
        ventas_map = {row.cod_articulo: {"ventas": float(row.ventas or 0), "unidades": float(row.unidades or 0)} for row in vr.all()}

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "cod_articulo": p.cod_articulo,
                "descripcion": p.descripcion,
                "descripcion_corta": p.descripcion_corta,
                "cod_rubro": p.cod_rubro,
                "rubro": rubros_map.get(p.cod_rubro, ""),
                "cod_barra": p.cod_barra,
                "iva": p.iva,
                "precio_compra": round(float(p.precio_compra or 0), 2),
                "precio_venta": round(float(p.precio_venta or 0), 2),
                "margen_pct": round(
                    (float(p.precio_venta or 0) - float(p.precio_compra or 0)) / float(p.precio_venta or 1) * 100, 1
                ) if p.precio_venta else 0,
                "habilitado": p.habilitado,
                "ventas_30d": round(ventas_map.get(p.cod_articulo, {}).get("ventas", 0), 2),
                "unidades_30d": round(ventas_map.get(p.cod_articulo, {}).get("unidades", 0), 1),
            }
            for p in products
        ],
    }


@router.get("/rubros")
async def list_rubros(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(BiRubro).order_by(BiRubro.descripcion))
    return [{"cod_rubro": rr.cod_rubro, "descripcion": rr.descripcion} for rr in r.scalars().all()]


@router.get("/{cod_articulo}")
async def get_articulo(cod_articulo: int, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(BiProduct).where(BiProduct.cod_articulo == cod_articulo))
    product = r.scalar_one_or_none()
    if not product:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Artículo no encontrado")

    # Serie de ventas últimos 90 días
    start = date.today() - timedelta(days=89)
    serie_r = await db.execute(
        select(BiSaleItem.fecha, func.sum(BiSaleItem.importe).label("ventas"), func.sum(BiSaleItem.cantidad).label("unidades"))
        .join(BiSale, and_(BiSale.source_sale_id == BiSaleItem.source_sale_id, BiSale.source_id == BiSaleItem.source_id))
        .where(and_(
            BiSaleItem.cod_articulo == cod_articulo,
            BiSale.tipo_comprobante.in_(FACTURAS),
            BiSale.anulada == "N",
            BiSaleItem.fecha >= start,
        ))
        .group_by(BiSaleItem.fecha)
        .order_by(BiSaleItem.fecha)
    )

    rubro_nombre = ""
    if product.cod_rubro:
        rr = await db.execute(select(BiRubro.descripcion).where(BiRubro.cod_rubro == product.cod_rubro))
        row = rr.scalar_one_or_none()
        if row:
            rubro_nombre = row

    return {
        "cod_articulo": product.cod_articulo,
        "descripcion": product.descripcion,
        "descripcion_corta": product.descripcion_corta,
        "cod_rubro": product.cod_rubro,
        "rubro": rubro_nombre,
        "cod_barra": product.cod_barra,
        "iva": product.iva,
        "precio_compra": round(float(product.precio_compra or 0), 2),
        "precio_venta": round(float(product.precio_venta or 0), 2),
        "margen_pct": round(
            (float(product.precio_venta or 0) - float(product.precio_compra or 0)) / float(product.precio_venta or 1) * 100, 1
        ) if product.precio_venta else 0,
        "habilitado": product.habilitado,
        "serie_ventas": [
            {
                "fecha": row.fecha.isoformat(),
                "ventas": round(float(row.ventas or 0), 2),
                "unidades": round(float(row.unidades or 0), 1),
            }
            for row in serie_r.all()
        ],
    }
