from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


TENANT_MIGRATIONS = [
    """
    CREATE TABLE IF NOT EXISTS bi_data_sources (
        id SERIAL PRIMARY KEY,
        source_type VARCHAR(40) NOT NULL,
        external_name VARCHAR(160),
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        last_sync_at TIMESTAMPTZ,
        raw_config JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bi_customers (
        id SERIAL PRIMARY KEY,
        source VARCHAR(40) NOT NULL,
        external_id VARCHAR(120) NOT NULL,
        name VARCHAR(255) NOT NULL,
        document VARCHAR(80),
        raw_payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (source, external_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bi_products (
        id SERIAL PRIMARY KEY,
        source VARCHAR(40) NOT NULL,
        external_id VARCHAR(120) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(160),
        brand VARCHAR(160),
        current_price DOUBLE PRECISION,
        current_cost DOUBLE PRECISION,
        raw_payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (source, external_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bi_sales (
        id SERIAL PRIMARY KEY,
        source VARCHAR(40) NOT NULL,
        external_id VARCHAR(120) NOT NULL,
        date DATE NOT NULL,
        customer_external_id VARCHAR(120),
        customer_name VARCHAR(255),
        seller_external_id VARCHAR(120),
        gross_total DOUBLE PRECISION NOT NULL DEFAULT 0,
        net_total DOUBLE PRECISION,
        tax_total DOUBLE PRECISION,
        cancelled BOOLEAN NOT NULL DEFAULT false,
        raw_payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (source, external_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bi_sale_items (
        id SERIAL PRIMARY KEY,
        source VARCHAR(40) NOT NULL,
        external_id VARCHAR(120) NOT NULL,
        sale_external_id VARCHAR(120) NOT NULL,
        product_external_id VARCHAR(120),
        product_name VARCHAR(255),
        quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
        unit_price DOUBLE PRECISION,
        unit_cost DOUBLE PRECISION,
        gross_total DOUBLE PRECISION,
        estimated_margin DOUBLE PRECISION,
        raw_payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (source, external_id)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_tenant_bi_sales_date ON bi_sales (date)",
    "CREATE INDEX IF NOT EXISTS idx_tenant_bi_sales_customer ON bi_sales (customer_external_id)",
    "CREATE INDEX IF NOT EXISTS idx_tenant_bi_items_sale ON bi_sale_items (sale_external_id)",
    "CREATE INDEX IF NOT EXISTS idx_tenant_bi_items_product ON bi_sale_items (product_external_id)",
]


async def run_initial_migrations(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        for migration in TENANT_MIGRATIONS:
            await conn.execute(text(migration.strip()))
