from fastapi import APIRouter, Depends

from ..auth import require_bearer_token
from ..data_store import get_data

router = APIRouter(prefix="/api/v1/rubros", tags=["rubros"], dependencies=[Depends(require_bearer_token)])


@router.get("")
def list_rubros():
    rows = get_data()["rubros"]
    return {"page": 1, "limit": len(rows), "total": len(rows), "data": rows}
