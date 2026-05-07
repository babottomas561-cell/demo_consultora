import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool, text
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Add services/api to path so imports work
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../services/api")))

from app.core.config import settings
from app.models.tenant import TenantBase

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = TenantBase.metadata

# Function to get tenant from args or env
def get_tenant():
    # 1. From -x tenant=something
    x_args = context.get_x_argument(as_dictionary=True)
    tenant = x_args.get("tenant")
    # 2. From env var
    if not tenant:
        tenant = os.environ.get("TENANT")
    return tenant

def run_migrations_offline() -> None:
    url = settings.DATABASE_URL
    tenant = get_tenant()
    if not tenant:
        raise Exception("You must pass the tenant schema dynamically. Example: alembic -x tenant=my_schema upgrade head")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=tenant,
        include_schemas=False,
    )

    with context.begin_transaction():
        context.execute(f'SET search_path TO "{tenant}"')
        context.run_migrations()

def do_run_migrations(connection: Connection, tenant: str) -> None:
    # Configure Alembic to use the tenant schema for the alembic_version table
    context.configure(
        connection=connection, 
        target_metadata=target_metadata,
        version_table_schema=tenant,
        include_schemas=False,
    )
    with context.begin_transaction():
        # Set search path to the tenant schema for all operations
        connection.execute(text(f'SET search_path TO "{tenant}"'))
        context.run_migrations()

async def run_async_migrations() -> None:
    tenant = get_tenant()
    if not tenant:
        raise Exception("You must pass the tenant schema dynamically. Example: alembic -x tenant=my_schema upgrade head")

    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = settings.DATABASE_URL
    
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations, tenant)

    await connectable.dispose()

def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
