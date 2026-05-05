from fastapi import APIRouter, Depends

from ..auth import require_bearer_token
from ..data_store import get_data

router = APIRouter(prefix="/api/v1/cotizaciones", tags=["cotizaciones"], dependencies=[Depends(require_bearer_token)])


@router.get("")
def list_cotizaciones():
    rows = get_data()["cotizaciones"]
    return {"page": 1, "limit": len(rows), "total": len(rows), "data": rows}
