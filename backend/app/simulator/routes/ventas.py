from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import require_bearer_token
from ..data_store import get_data
from ..seed_data import paginate, parse_yyyymmdd

router = APIRouter(prefix="/api/v1/ventas", tags=["ventas"], dependencies=[Depends(require_bearer_token)])


def _parse_range(fechaDesde: str, fechaHasta: str) -> tuple[date, date]:
    try:
        desde = parse_yyyymmdd(fechaDesde)
        hasta = parse_yyyymmdd(fechaHasta)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if desde > hasta:
        raise HTTPException(status_code=422, detail="fechaDesde must be less than or equal to fechaHasta")
    return desde, hasta


@router.get("")
def list_ventas(
    fechaDesde: str = Query(...),
    fechaHasta: str = Query(...),
    page: int = 1,
    limit: int = 100,
):
    desde, hasta = _parse_range(fechaDesde, fechaHasta)
    rows = [
        venta
        for venta in get_data()["ventas"]
        if desde <= date.fromisoformat(venta["venta"]["fecha"]) <= hasta
    ]
    return paginate(rows, page, limit)


@router.get("/items")
def list_venta_items(
    fechaDesde: str = Query(...),
    fechaHasta: str = Query(...),
    page: int = 1,
    limit: int = 100,
):
    desde, hasta = _parse_range(fechaDesde, fechaHasta)
    rows = [
        item
        for item in get_data()["venta_items"]
        if desde <= date.fromisoformat(item["fecha"]) <= hasta
    ]
    return paginate(rows, page, limit)


@router.get("/{id}")
def get_venta(id: int):
    for venta in get_data()["ventas"]:
        if venta["venta"]["id"] == id:
            return venta
    raise HTTPException(status_code=404, detail="Venta not found")
