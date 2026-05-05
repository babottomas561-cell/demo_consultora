from contextlib import asynccontextmanager

from fastapi import FastAPI

from .data_store import get_data
from .routes import articulos, auth, clientes, cotizaciones, empresas, rubros, subrubros, vendedores, ventas


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_data()
    yield


app = FastAPI(
    title="Infomanager API Simulator",
    description="API local compatible con el flujo de integración demo Infomanager.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(empresas.router)
app.include_router(clientes.router)
app.include_router(articulos.router)
app.include_router(vendedores.router)
app.include_router(rubros.router)
app.include_router(subrubros.router)
app.include_router(cotizaciones.router)
app.include_router(ventas.router)
