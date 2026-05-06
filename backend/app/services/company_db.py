"""
Fábrica de sesiones por empresa.

Cada empresa tiene su propia base de datos PostgreSQL (db_url).
Cachea los engines para no crear una nueva conexión en cada request.
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

logger = logging.getLogger(__name__)

_sessionmakers: dict[str, async_sessionmaker] = {}


def get_company_sessionmaker(db_url: str) -> async_sessionmaker:
    """Devuelve (o crea) un sessionmaker dedicado a la BD de la empresa."""
    if db_url not in _sessionmakers:
        engine = create_async_engine(db_url)
        _sessionmakers[db_url] = async_sessionmaker(engine, expire_on_commit=False)
        logger.info("Engine creado para BD: %s", db_url.rsplit("/", 1)[-1])
    return _sessionmakers[db_url]


async def get_company_db(db_url: str) -> AsyncSession:
    """Generador de sesión para usar con Depends() en endpoints de empresa."""
    session_factory = get_company_sessionmaker(db_url)
    async with session_factory() as session:
        yield session
