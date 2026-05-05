from fastapi import APIRouter, Depends

from ..auth import require_bearer_token
from ..data_store import get_data

router = APIRouter(prefix="/api/v1/empresas", tags=["empresas"], dependencies=[Depends(require_bearer_token)])


@router.get("")
def list_empresas():
    return {"page": 1, "limit": len(get_data()["empresas"]), "total": len(get_data()["empresas"]), "data": get_data()["empresas"]}
