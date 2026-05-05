from fastapi import APIRouter, Depends, HTTPException

from ..auth import require_bearer_token
from ..data_store import get_data
from ..seed_data import paginate

router = APIRouter(prefix="/api/v1/clientes", tags=["clientes"], dependencies=[Depends(require_bearer_token)])


@router.get("")
def list_clientes(page: int = 1, limit: int = 100):
    return paginate(get_data()["clientes"], page, limit)


@router.get("/{cod_cliente}")
def get_cliente(cod_cliente: str):
    for cliente in get_data()["clientes"]:
        if cliente["cod_cliente"] == cod_cliente:
            return cliente
    raise HTTPException(status_code=404, detail="Cliente not found")
