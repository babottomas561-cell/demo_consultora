from __future__ import annotations

import logging
from dataclasses import dataclass

import asyncpg
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.services.tenant_migration_service import run_initial_migrations

logger = logging.getLogger(__name__)

_sessionmakers: dict[str, async_sessionmaker] = {}


@dataclass
class CreateDatabaseResult:
    database_url: str
    created: bool


def _sync_database_url(url: str) -> str:
    return url.replace("postgresql+asyncpg://", "postgresql://", 1)


def build_tenant_database_url(database_name: str) -> str:
    base = make_url(settings.async_database_url)
    return str(base.set(database=database_name))


def admin_database_url() -> str:
    base = make_url(_sync_database_url(settings.database_url))
    return str(base.set(database="postgres"))


async def can_create_database() -> bool:
    conn = await asyncpg.connect(admin_database_url())
    try:
        value = await conn.fetchval("SELECT rolsuper OR rolcreatedb FROM pg_roles WHERE rolname = current_user")
        return bool(value)
    finally:
        await conn.close()


async def create_database(database_name: str) -> CreateDatabaseResult:
    conn = await asyncpg.connect(admin_database_url())
    try:
        exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", database_name)
        if exists:
            logger.info("tenant database already exists database_name=%s", database_name)
            return CreateDatabaseResult(database_url=build_tenant_database_url(database_name), created=False)
        allowed = await conn.fetchval("SELECT rolsuper OR rolcreatedb FROM pg_roles WHERE rolname = current_user")
        if not allowed:
            raise PermissionError("Current PostgreSQL user does not have CREATE DATABASE privilege.")
        await conn.execute(f'CREATE DATABASE "{database_name}"')
        logger.info("tenant database created database_name=%s", database_name)
        return CreateDatabaseResult(database_url=build_tenant_database_url(database_name), created=True)
    finally:
        await conn.close()


def get_tenant_engine(database_url: str):
    return create_async_engine(database_url)


def get_tenant_sessionmaker(database_url: str) -> async_sessionmaker:
    if database_url not in _sessionmakers:
        _sessionmakers[database_url] = async_sessionmaker(create_async_engine(database_url), expire_on_commit=False)
    return _sessionmakers[database_url]


async def run_tenant_migrations(database_url: str) -> None:
    engine = get_tenant_engine(database_url)
    try:
        await run_initial_migrations(engine)
    finally:
        await engine.dispose()


async def validate_connection(database_url: str) -> None:
    engine = get_tenant_engine(database_url)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    finally:
        await engine.dispose()
