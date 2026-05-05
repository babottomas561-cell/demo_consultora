from fastapi import APIRouter, Depends, HTTPException

from ..auth import require_bearer_token
from ..data_store import get_data
from ..seed_data import paginate

router = APIRouter(prefix="/api/v1/articulos", tags=["articulos"], dependencies=[Depends(require_bearer_token)])


@router.get("")
def list_articulos(page: int = 1, limit: int = 100):
    return paginate(get_data()["articulos"], page, limit)


@router.get("/{cod_articulo}")
def get_articulo(cod_articulo: str):
    for articulo in get_data()["articulos"]:
        if articulo["cod_articulo"] == cod_articulo:
            return articulo
    raise HTTPException(status_code=404, detail="Artículo not found")
