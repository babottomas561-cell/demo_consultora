from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: crea las tablas si no existen. En producción esto lo haría Alembic,
    # pero para el primer deploy en Railway es suficiente para arrancar.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: libera el pool de conexiones del engine.
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


@app.get("/health")
async def health_check():
    return {"status": "ok"}
