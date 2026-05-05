from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI

from .data_store import get_data
from .routes import articulos, auth, clientes, cotizaciones, empresas, rubros, subrubros, vendedores, ventas


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_data()
    yield


router = APIRouter()


@router.get("/health")
def healthcheck():
    return {"status": "ok"}


router.include_router(auth.router)
router.include_router(empresas.router)
router.include_router(clientes.router)
router.include_router(articulos.router)
router.include_router(vendedores.router)
router.include_router(rubros.router)
router.include_router(subrubros.router)
router.include_router(cotizaciones.router)
router.include_router(ventas.router)


app = FastAPI(
    title="Infomanager API Simulator",
    description="API local compatible con el flujo de integración demo Infomanager.",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(router)
