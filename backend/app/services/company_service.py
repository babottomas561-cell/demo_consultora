"""
CompanyService — gestiona el ciclo de vida de una empresa en la plataforma.

Cuando se crea una empresa:
1. Se crea el registro en companies (BD global)
2. Se crea una base de datos PostgreSQL exclusiva: company_{id}
3. Se crean todas las tablas BI en esa nueva BD
4. Se guarda el db_url de la nueva BD en el registro de la empresa
5. El sync loop detecta la empresa activa y empieza a sincronizar

Arquitectura de aislamiento:
- BD global (postgres): users, companies
- BD company_1: todos los datos de la empresa 1 (bi_sales, bi_customers, etc.)
- BD company_2: todos los datos de la empresa 2 (completamente separada)
"""

import logging
import re

import asyncpg
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.config import settings
from app.models.company import Company

logger = logging.getLogger(__name__)

# DDL de las tablas BI en la BD de cada empresa
BI_TABLES_DDL = [
    """
    CREATE TABLE IF NOT EXISTS bi_data_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(128) NOT NULL UNIQUE,
        source_type VARCHAR(64),
        base_url VARCHAR(512),
        status VARCHAR(32) DEFAULT 'active',
        last_sync_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bi_customers (
        id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL,
        cod_cliente INTEGER NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        razon_social VARCHAR(255),
        categoria_iva VARCHAR(20),
        cuit VARCHAR(40),
        email VARCHAR(255),
        cod_vendedor INTEGER,
        lista_precio INTEGER,
        domicilio VARCHAR(255),
        telefonos VARCHAR(120),
        condicion_venta INTEGER,
        fecha_alta DATE,
        raw JSONB,
        synced_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (source_id, cod_cliente)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bi_products (
        id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL,
        cod_articulo INTEGER NOT NULL,
        descripcion VARCHAR(255) NOT NULL,
        descripcion_corta VARCHAR(255),
        cod_rubro INTEGER,
        cod_subrubro INTEGER,
        cod_barra VARCHAR(80),
        iva FLOAT,
        moneda VARCHAR(4),
        precio_compra FLOAT,
        precio_venta FLOAT,
        habilitado VARCHAR(4),
        raw JSONB,
        synced_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (source_id, cod_articulo)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bi_vendedores (
        id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL,
        cod_vendedor INTEGER NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        habilitado VARCHAR(4),
        synced_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (source_id, cod_vendedor)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bi_rubros (
        id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL,
        cod_rubro INTEGER NOT NULL,
        descripcion VARCHAR(255) NOT NULL,
        synced_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (source_id, cod_rubro)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bi_sales (
        id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL,
        source_sale_id INTEGER NOT NULL,
        fecha DATE,
        tipo_comprobante VARCHAR(8),
        tipo_factura VARCHAR(4),
        numero INTEGER,
        punto_de_venta INTEGER,
        total FLOAT DEFAULT 0,
        neto FLOAT,
        iva_importe FLOAT,
        cod_cliente INTEGER,
        cod_vendedor INTEGER,
        cod_empresa INTEGER,
        moneda VARCHAR(4),
        cotizacion FLOAT,
        anulada VARCHAR(4),
        raw JSONB,
        synced_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (source_id, source_sale_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS bi_sale_items (
        id SERIAL PRIMARY KEY,
        source_id INTEGER NOT NULL,
        source_item_id INTEGER NOT NULL,
        source_sale_id INTEGER NOT NULL,
        fecha DATE,
        cod_cliente INTEGER,
        cod_vendedor INTEGER,
        cod_empresa INTEGER,
        cod_articulo INTEGER,
        detalle VARCHAR(255),
        cantidad FLOAT DEFAULT 0,
        precio FLOAT,
        precio_con_iva FLOAT,
        precio_compra_actual FLOAT,
        iva_por FLOAT,
        importe FLOAT,
        cod_barra VARCHAR(80),
        raw JSONB,
        synced_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (source_id, source_item_id)
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_bi_sales_fecha ON bi_sales (fecha)",
    "CREATE INDEX IF NOT EXISTS idx_bi_sales_cliente ON bi_sales (cod_cliente)",
    "CREATE INDEX IF NOT EXISTS idx_bi_items_sale ON bi_sale_items (source_sale_id)",
    "CREATE INDEX IF NOT EXISTS idx_bi_items_articulo ON bi_sale_items (cod_articulo)",
]


def _slugify(nombre: str) -> str:
    slug = nombre.lower().strip()
    for src, dst in [("á","a"),("é","e"),("í","i"),("ó","o"),("ú","u"),("ñ","n")]:
        slug = slug.replace(src, dst)
    slug = re.sub(r"[^a-z0-9]+", "_", slug).strip("_")[:50]
    return slug


def _company_db_name(company_id: int) -> str:
    return f"company_{company_id}"


def _build_company_db_url(base_url: str, db_name: str) -> str:
    """Reemplaza el nombre de la BD en la URL base."""
    # postgresql+asyncpg://user:pass@host:port/postgres  →  .../company_1
    parts = base_url.rsplit("/", 1)
    return f"{parts[0]}/{db_name}"


async def _create_database(db_name: str) -> None:
    """
    Crea una nueva base de datos PostgreSQL.
    CREATE DATABASE no puede correr dentro de una transacción — usamos asyncpg directamente.
    """
    # Conectamos a la BD 'postgres' (siempre existe) para poder crear otras
    admin_url = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
    # Aseguramos que conectamos a la BD admin, no a la BD del proyecto
    parts = admin_url.rsplit("/", 1)
    admin_db_url = f"{parts[0]}/postgres"

    conn = await asyncpg.connect(admin_db_url)
    try:
        # Verificar si ya existe
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", db_name
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{db_name}"')
            logger.info("Base de datos '%s' creada", db_name)
        else:
            logger.info("Base de datos '%s' ya existía", db_name)
    finally:
        await conn.close()


async def _create_bi_tables(company_db_url: str) -> None:
    """Crea todas las tablas BI en la BD recién creada."""
    engine = create_async_engine(company_db_url)
    async with engine.begin() as conn:
        for ddl in BI_TABLES_DDL:
            await conn.execute(text(ddl.strip()))
    await engine.dispose()
    logger.info("Tablas BI creadas en '%s'", company_db_url.rsplit("/", 1)[-1])


async def get_or_create_company(
    db: AsyncSession,
    nombre: str,
    im_base_url: str,
    im_client_id: str,
    im_client_secret: str,
) -> Company:
    """
    Crea una empresa nueva con su propia base de datos PostgreSQL.
    """
    from sqlalchemy import select

    slug_base = _slugify(nombre)
    slug = slug_base
    counter = 1
    while True:
        existing = await db.execute(select(Company).where(Company.slug == slug))
        if not existing.scalar_one_or_none():
            break
        slug = f"{slug_base}_{counter}"
        counter += 1

    company = Company(
        nombre=nombre,
        slug=slug,
        im_base_url=im_base_url,
        im_client_id=im_client_id,
        im_client_secret=im_client_secret,
    )
    db.add(company)
    await db.flush()  # obtiene el ID

    # Nombre y URL de la BD de esta empresa
    db_name = _company_db_name(company.id)
    company_db_url = _build_company_db_url(settings.async_database_url, db_name)
    company.db_url = company_db_url

    await db.commit()
    await db.refresh(company)

    # Crear la BD y sus tablas
    await _create_database(db_name)
    await _create_bi_tables(company_db_url)

    logger.info(
        "Empresa '%s' creada — BD exclusiva: %s",
        nombre, db_name,
    )
    return company
