import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import AsyncSessionLocal, Base, engine
from app.models import BiCustomer, BiDataSource, BiProduct, BiSale, BiSaleItem, Sale, User
from app.models.im_venta import ImVenta
from app.models.im_venta_item import ImVentaItem
from app.routers import auth, bi, demo
from app.integrations.infomanager.sync_service import im_client, sync_infomanager
from app.services.demo_seed import seed_demo_sales_if_empty

logger = logging.getLogger(__name__)


async def _sync_loop() -> None:
    """Loop infinito que sincroniza Infomanager cada IM_SYNC_INTERVAL_SECONDS."""
    # Solo corre si hay credenciales configuradas
    if not settings.im_client_id or not settings.im_client_secret:
        logger.info("Infomanager: credenciales no configuradas, sync deshabilitado")
        return

    logger.info("Infomanager: sync loop iniciado (intervalo: %ds)", settings.im_sync_interval_seconds)
    while True:
        try:
            async with AsyncSessionLocal() as db:
                result = await sync_infomanager(db)
                if result.get("sales"):
                    logger.info("Infomanager: %d ventas normalizadas", result["sales"])
        except Exception as exc:
            logger.error("Infomanager sync loop error: %s", exc)

        await asyncio.sleep(settings.im_sync_interval_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea tablas nuevas (ImVenta, ImVentaItem) sin tocar las existentes
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed de datos demo (solo si la tabla está vacía)
    async with AsyncSessionLocal() as db:
        await seed_demo_sales_if_empty(db)

    # Lanza el sync loop en background — no bloquea el arranque
    sync_task = asyncio.create_task(_sync_loop())

    yield

    # Shutdown limpio
    sync_task.cancel()
    await im_client.close()
    await engine.dispose()


app = FastAPI(
    title="demo_consultora API",
    version="0.1.0",
    docs_url="/docs",
    lifespan=lifespan,
)

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


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/sync/status")
async def sync_status():
    """Endpoint para verificar el estado del sync desde Railway logs o el frontend."""
    from app.integrations.infomanager.sync_service import _last_sync_at
    return {
        "im_enabled": bool(settings.im_client_id and settings.im_client_secret),
        "last_sync_at": _last_sync_at.isoformat() if _last_sync_at else None,
        "sync_interval_seconds": settings.im_sync_interval_seconds,
    }
