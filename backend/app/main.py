import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal, Base, engine
from app.models import (
    BiCustomer, BiDataSource, BiProduct, BiRubro,
    BiSale, BiSaleItem, BiVendedor, Company, DataSource, Sale, SyncStatus, TenantDatabase, User,
)
from app.routers import auth, bi, demo
from app.routers.admin import router as admin_router
from app.routers.articulos import router as articulos_router
from app.routers.clientes import router as clientes_router
from app.routers.eerr import router as eerr_router
from app.routers.vendedores import router as vendedores_router
from app.routers.ventas import router as ventas_router
from app.integrations.infomanager.company_sync import sync_company
from app.simulator.main import router as simulator_router
from app.simulator.data_store import get_data as simulator_get_data
from app.services.central_migration_service import run_central_migrations
from app.services.demo_seed import seed_demo_sales_if_empty

logger = logging.getLogger(__name__)


async def _company_sync_loop() -> None:
    """
    Loop principal de sync. Cada ciclo sincroniza todas las empresas activas.
    Cada empresa tiene su propio cliente IM y escribe en su schema PostgreSQL exclusivo.
    """
    # Espera a que uvicorn esté completamente listo
    await asyncio.sleep(20)
    logger.info("Company sync loop iniciado (intervalo: %ds)", settings.im_sync_interval_seconds)

    while True:
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(Company)
                    .join(TenantDatabase, TenantDatabase.company_id == Company.id)
                    .join(DataSource, DataSource.company_id == Company.id)
                    .where(
                        Company.status == "active",
                        TenantDatabase.status == "active",
                        DataSource.status == "active",
                    )
                )
                companies = result.scalars().all()

            for company in companies:
                try:
                    async with AsyncSessionLocal() as sync_db:
                        result = await sync_company(company.id, sync_db)
                    logger.info(
                        "Sync '%s' OK — ventas: %d, clientes: %d",
                        company.nombre, result.get("sales", 0), result.get("customers", 0),
                    )
                except Exception as exc:
                    logger.error("Sync error empresa '%s': %s", company.nombre, exc, exc_info=True)

        except Exception as exc:
            logger.error("Company sync loop error: %s", exc, exc_info=True)

        await asyncio.sleep(settings.im_sync_interval_seconds)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea tablas globales (companies, users, etc.)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await run_central_migrations(conn)

    # Seed datos demo
    async with AsyncSessionLocal() as db:
        await seed_demo_sales_if_empty(db)

    # Pre-genera datos del simulador (blocking, solo en primer arranque)
    if settings.enable_simulator:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, simulator_get_data)
        logger.info("Simulador: datos pre-generados")

    # Lanza el sync loop
    sync_task = asyncio.create_task(_company_sync_loop())
    yield

    sync_task.cancel()
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
app.include_router(admin_router)
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
    from app.integrations.infomanager.company_sync import _last_sync
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Company).where(Company.is_active == True))
        companies = result.scalars().all()
    return {
        "companies": [
            {
                "id": c.id,
                "nombre": c.nombre,
                "status": c.status,
                "last_sync": _last_sync.get(c.id, {}).isoformat() if c.id in _last_sync else None,
            }
            for c in companies
        ]
    }


@app.post("/sync/trigger/{company_id}")
async def trigger_sync(company_id: int):
    """Dispara sync manual para una empresa — útil para testing."""
    async with AsyncSessionLocal() as db:
        company = await db.get(Company, company_id)
        if not company:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        try:
            result = await sync_company(company_id, db)
            return {"ok": True, "result": result}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}
