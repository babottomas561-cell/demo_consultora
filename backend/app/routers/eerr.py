"""
Estado de Resultados (EERR) calculado desde bi_sales + bi_sale_items.
Estructura: Ventas → (-) Costo de Ventas → Utilidad Bruta → (-) IVA → Neto.
En Fase 3 real se sumarían gastos operativos desde /planes/mayor.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.bi_sale import BiSale
from app.models.bi_sale_item import BiSaleItem

router = APIRouter(prefix="/eerr", tags=["eerr"])

FACTURAS = ("FA",)
NC = ("NC",)


def _sale_filters(fecha_desde: date, fecha_hasta: date):
    return [
        BiSale.tipo_comprobante.in_(FACTURAS),
        BiSale.anulada == "N",
        BiSale.fecha >= fecha_desde,
        BiSale.fecha <= fecha_hasta,
    ]


async def _calc_period(db: AsyncSession, fecha_desde: date, fecha_hasta: date) -> dict:
    # Ingresos brutos (ventas)
    r = await db.execute(
        select(
            func.coalesce(func.sum(BiSale.total), 0).label("ventas_total"),
            func.coalesce(func.sum(BiSale.neto), 0).label("ventas_neto"),
            func.coalesce(func.sum(BiSale.iva_importe), 0).label("ventas_iva"),
        ).where(and_(*_sale_filters(fecha_desde, fecha_hasta)))
    )
    row = r.one()
    ventas_total = float(row.ventas_total)
    ventas_neto = float(row.ventas_neto)
    ventas_iva = float(row.ventas_iva)

    # Costo de ventas (desde items)
    r = await db.execute(
        select(
            func.coalesce(func.sum(BiSaleItem.precio_compra_actual * BiSaleItem.cantidad), 0).label("costo"),
            func.coalesce(func.sum(BiSaleItem.importe), 0).label("importe_items"),
        )
        .join(BiSale, and_(
            BiSale.source_sale_id == BiSaleItem.source_sale_id,
            BiSale.source_id == BiSaleItem.source_id,
        ))
        .where(and_(*_sale_filters(fecha_desde, fecha_hasta)))
    )
    row2 = r.one()
    costo_ventas = float(row2.costo)

    utilidad_bruta = ventas_neto - costo_ventas
    margen_bruto_pct = (utilidad_bruta / ventas_neto * 100) if ventas_neto else 0

    return {
        "ventas_total": round(ventas_total, 2),
        "ventas_neto": round(ventas_neto, 2),
        "ventas_iva": round(ventas_iva, 2),
        "costo_ventas": round(costo_ventas, 2),
        "utilidad_bruta": round(utilidad_bruta, 2),
        "margen_bruto_pct": round(margen_bruto_pct, 2),
        # Gastos operativos: se completan en Fase 3 real con /planes/mayor
        "gastos_operativos": 0.0,
        "resultado_operativo": round(utilidad_bruta, 2),
        "resultado_neto": round(utilidad_bruta, 2),
    }


@router.get("")
async def get_eerr(
    year: int = Query(default=date.today().year),
    mes: int | None = Query(default=None, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
):
    """
    EERR de un año completo o un mes específico.
    Con mes=None devuelve el año completo + breakdown mensual.
    """
    if mes:
        from calendar import monthrange
        last_day = monthrange(year, mes)[1]
        fecha_desde = date(year, mes, 1)
        fecha_hasta = date(year, mes, last_day)
        periodo = await _calc_period(db, fecha_desde, fecha_hasta)
        return {"periodo": f"{year}-{mes:02d}", "fecha_desde": fecha_desde.isoformat(), "fecha_hasta": fecha_hasta.isoformat(), **periodo}

    # Año completo
    fecha_desde = date(year, 1, 1)
    fecha_hasta = date(year, 12, 31)
    anual = await _calc_period(db, fecha_desde, fecha_hasta)

    # Breakdown mensual
    monthly = []
    for m in range(1, 13):
        from calendar import monthrange
        last_day = monthrange(year, m)[1]
        fd = date(year, m, 1)
        fh = date(year, m, last_day)
        p = await _calc_period(db, fd, fh)
        monthly.append({"mes": m, "label": fd.strftime("%b"), **p})

    return {
        "year": year,
        "fecha_desde": fecha_desde.isoformat(),
        "fecha_hasta": fecha_hasta.isoformat(),
        "anual": anual,
        "monthly": monthly,
    }


@router.get("/comparativo")
async def get_comparativo(
    year: int = Query(default=date.today().year),
    db: AsyncSession = Depends(get_db),
):
    """Compara el año actual con el año anterior mes a mes."""
    results = {}
    for y in [year - 1, year]:
        months = []
        for m in range(1, 13):
            from calendar import monthrange
            last_day = monthrange(y, m)[1]
            p = await _calc_period(db, date(y, m, 1), date(y, m, last_day))
            months.append({"mes": m, "label": date(y, m, 1).strftime("%b %Y"), **p})
        results[str(y)] = months
    return results
