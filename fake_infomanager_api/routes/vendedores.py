from fastapi import APIRouter, Depends

from ..auth import require_bearer_token
from ..data_store import get_data

router = APIRouter(prefix="/api/v1/vendedores", tags=["vendedores"], dependencies=[Depends(require_bearer_token)])


@router.get("")
def list_vendedores():
    rows = get_data()["vendedores"]
    return {"page": 1, "limit": len(rows), "total": len(rows), "data": rows}
