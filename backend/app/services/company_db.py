"""
Fábrica de sesiones por empresa.

Cada empresa tiene su propio schema PostgreSQL.
Usamos asyncpg's server_settings para fijar search_path en cada conexión,
de modo que todas las queries de SQLAlchemy apuntan automáticamente
al schema correcto sin cambiar los modelos.
"""

import logging
from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

logger = logging.getLogger(__name__)

# Cache de sessionmakers por schema — evita crear un engine nuevo en cada request
_sessionmakers: dict[str, async_sessionmaker] = {}


def get_company_sessionmaker(db_schema: str) -> async_sessionmaker:
    """
    Devuelve (o crea) un sessionmaker dedicado al schema de la empresa.
    search_path fija el schema por defecto para toda la sesión.
    """
    if db_schema not in _sessionmakers:
        engine = create_async_engine(
            settings.async_database_url,
            connect_args={
                "server_settings": {
                    "search_path": db_schema,  # asyncpg fija el schema en el handshake
                }
            },
        )
        _sessionmakers[db_schema] = async_sessionmaker(engine, expire_on_commit=False)
        logger.info("Engine creado para schema '%s'", db_schema)
    return _sessionmakers[db_schema]


async def get_company_db(db_schema: str) -> AsyncSession:
    """Generador de sesión para usar con Depends() en endpoints de empresa."""
    session_factory = get_company_sessionmaker(db_schema)
    async with session_factory() as session:
        yield session
