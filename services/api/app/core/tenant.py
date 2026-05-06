from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

async def create_tenant_schema(db: AsyncSession, schema_name: str):
    """Creates a new PostgreSQL schema for a tenant if it doesn't exist."""
    await db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
    await db.commit()

async def set_tenant_schema(db: AsyncSession, schema_name: str):
    """Sets the search_path to the specific tenant schema."""
    await db.execute(text(f'SET search_path TO "{schema_name}"'))
