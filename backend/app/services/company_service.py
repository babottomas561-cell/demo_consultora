"""
CompanyService — gestiona el ciclo de vida de una empresa en la plataforma.

Cuando se crea una empresa:
1. Se genera un slug único
2. Se crea el registro en la tabla companies
3. Se crea un schema PostgreSQL exclusivo: company_{id}
4. Se crean todas las tablas BI dentro de ese schema
5. El sync loop la detecta y empieza a sincronizar

El schema_name sigue el patrón: company_1, company_2, etc.
"""

import logging
import re

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.config import settings
from app.models.company import Company

logger = logging.getLogger(__name__)

# DDL de las tablas BI que se crean en cada schema de empresa
BI_TABLES_DDL = """
CREATE TABLE IF NOT EXISTS {schema}.bi_data_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    source_type VARCHAR(64),
    base_url VARCHAR(512),
    status VARCHAR(32) DEFAULT 'active',
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS {schema}.bi_customers (
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
);

CREATE TABLE IF NOT EXISTS {schema}.bi_products (
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
);

CREATE TABLE IF NOT EXISTS {schema}.bi_vendedores (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL,
    cod_vendedor INTEGER NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    habilitado VARCHAR(4),
    synced_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (source_id, cod_vendedor)
);

CREATE TABLE IF NOT EXISTS {schema}.bi_rubros (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL,
    cod_rubro INTEGER NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (source_id, cod_rubro)
);

CREATE TABLE IF NOT EXISTS {schema}.bi_sales (
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
);

CREATE TABLE IF NOT EXISTS {schema}.bi_sale_items (
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
);

CREATE INDEX IF NOT EXISTS idx_{schema_flat}_sales_fecha ON {schema}.bi_sales (fecha);
CREATE INDEX IF NOT EXISTS idx_{schema_flat}_sales_cliente ON {schema}.bi_sales (cod_cliente);
CREATE INDEX IF NOT EXISTS idx_{schema_flat}_items_sale ON {schema}.bi_sale_items (source_sale_id);
CREATE INDEX IF NOT EXISTS idx_{schema_flat}_items_articulo ON {schema}.bi_sale_items (cod_articulo);
"""


def _slugify(nombre: str) -> str:
    """Convierte un nombre en slug válido para PostgreSQL: solo a-z, 0-9 y _"""
    slug = nombre.lower().strip()
    slug = re.sub(r"[áàäâ]", "a", slug)
    slug = re.sub(r"[éèëê]", "e", slug)
    slug = re.sub(r"[íìïî]", "i", slug)
    slug = re.sub(r"[óòöô]", "o", slug)
    slug = re.sub(r"[úùüû]", "u", slug)
    slug = re.sub(r"[ñ]", "n", slug)
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    slug = slug.strip("_")[:50]
    return slug


async def create_company_schema(company: Company) -> None:
    """
    Crea el schema PostgreSQL y todas las tablas BI para la empresa.
    Se llama una sola vez cuando se da de alta la empresa.
    """
    schema = company.db_schema
    schema_flat = schema.replace(".", "_")  # para nombres de índices

    # Usamos la conexión raw para ejecutar CREATE SCHEMA (no admite transacción implícita)
    engine = create_async_engine(settings.async_database_url)
    async with engine.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))
        ddl = BI_TABLES_DDL.format(schema=f'"{schema}"', schema_flat=schema_flat)
        for statement in ddl.strip().split(";"):
            stmt = statement.strip()
            if stmt:
                await conn.execute(text(stmt))
    await engine.dispose()
    logger.info("Schema '%s' creado con tablas BI para empresa '%s'", schema, company.nombre)


async def get_or_create_company(
    db: AsyncSession,
    nombre: str,
    im_base_url: str,
    im_client_id: str,
    im_client_secret: str,
) -> Company:
    """
    Crea una empresa nueva:
    1. Genera slug y schema name
    2. Inserta en companies
    3. Crea el schema PostgreSQL con tablas BI
    """
    from sqlalchemy import select

    slug_base = _slugify(nombre)

    # Asegurar slug único
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
    await db.flush()  # obtiene el ID antes de commit

    # El schema se nombra con el ID para garantizar unicidad
    company.db_schema = f"company_{company.id}"
    await db.commit()
    await db.refresh(company)

    # Crear schema y tablas en PostgreSQL
    await create_company_schema(company)

    logger.info("Empresa '%s' creada (id=%d, schema=%s)", nombre, company.id, company.db_schema)
    return company
