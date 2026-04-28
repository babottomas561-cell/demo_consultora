from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.config import settings

# postgresql+asyncpg:// indica a SQLAlchemy que use asyncpg como driver.
# La URL viene de config.py — debe tener ese prefijo en la variable de entorno.
engine = create_async_engine(settings.async_database_url)

# async_sessionmaker produce AsyncSession. expire_on_commit=False evita que
# SQLAlchemy expire los atributos del objeto después del commit, lo que causaría
# un error al acceder a ellos fuera de la sesión en contextos async.
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

Base = declarative_base()
