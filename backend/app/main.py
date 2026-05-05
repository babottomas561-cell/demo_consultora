import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import AsyncSessionLocal, Base, engine
from app.models import (
    BiCustomer, BiDataSource, BiProduct, BiRubro,
    BiSale, BiSaleItem, BiVendedor, Company, Sale, User,
)
from app.routers import auth, bi, demo
from app.routers.articulos import router as articulos_router
from app.routers.clientes import router as clientes_router
from app.routers.eerr import router as eerr_router
from app.routers.vendedores import router as vendedores_router
from app.routers.ventas import router as ventas_router
from app.integrations.infomanager.sync_service import im_client, sync_infomanager
from app.simulator.main import router as simulator_router
from app.services.demo_seed import seed_demo_sales_if_empty

logger = logging.getLogger(__name__)


async def _sync_loop() -> None:
    if not settings.im_client_id or not settings.im_client_secret:
        logger.info("Infomanager: credenciales no configuradas, sync deshabilitado")
        return

    logger.info("Infomanager sync loop iniciado (intervalo: %ds)", settings.im_sync_interval_seconds)
    while True:
        try:
            async with AsyncSessionLocal() as db:
                result = await sync_infomanager(db)
                logger.info("Sync OK — ventas: %d, clientes: %d, artículos: %d",
                            result.get("sales", 0), result.get("customers", 0), result.get("products", 0))
        except Exception as exc:
            logger.error("Sync loop error: %s", exc)

        await asyncio.sleep(settings.im_sync_interval_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        await seed_demo_sales_if_empty(db)

    sync_task = asyncio.create_task(_sync_loop())
    yield

    sync_task.cancel()
    await im_client.close()
    await engine.dispose()


app = FastAPI(title="demo_consultora API", version="0.1.0", docs_url="/docs", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(demo.router)
app.include_router(bi.router)
app.include_router(ventas_router)
app.include_router(clientes_router)
app.include_router(articulos_router)
app.include_router(vendedores_router)
app.include_router(eerr_router)

if settings.enable_simulator:
    app.include_router(simulator_router, prefix="/simulator")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/sync/status")
async def sync_status():
    from app.integrations.infomanager.sync_service import _last_sync_at
    return {
        "im_enabled": bool(settings.im_client_id and settings.im_client_secret),
        "last_sync_at": _last_sync_at.isoformat() if _last_sync_at else None,
        "sync_interval_seconds": settings.im_sync_interval_seconds,
    }
