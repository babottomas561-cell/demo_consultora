"""
Sync por empresa — cada empresa tiene su propia BD PostgreSQL.

Flujo:
1. Conecta a la BD exclusiva de la empresa (company.db_url)
2. Se autentica con Infomanager usando las credenciales de la empresa
3. Trae los datos y los guarda con upsert en la BD de la empresa
4. Ningún dato de una empresa toca la BD de otra
"""

import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.infomanager.adapter import (
    adapt_customer, adapt_product, adapt_rubro,
    adapt_sale, adapt_sale_item, adapt_vendedor,
)
from app.integrations.infomanager.client import InfomanagerApiClient
from app.models.company import Company

logger = logging.getLogger(__name__)

_im_clients: dict[int, InfomanagerApiClient] = {}
_last_sync: dict[int, datetime] = {}


def _get_client(company: Company) -> InfomanagerApiClient:
    if company.id not in _im_clients:
        _im_clients[company.id] = InfomanagerApiClient(
            base_url=company.im_base_url,
            client_id=company.im_client_id,
            client_secret=company.im_client_secret,
        )
    return _im_clients[company.id]


def _date_range(company_id: int) -> tuple[date, date]:
    today = date.today()
    if company_id not in _last_sync:
        return today - timedelta(days=90), today
    return today - timedelta(days=1), today


def _yyyymmdd(d: date) -> str:
    return d.strftime("%Y%m%d")


async def _ensure_source(db: AsyncSession, company: Company) -> int:
    result = await db.execute(
        text("SELECT id FROM bi_data_sources WHERE name = :name"),
        {"name": "infomanager"},
    )
    row = result.fetchone()
    if row:
        await db.execute(
            text("UPDATE bi_data_sources SET base_url = :url, status = 'active' WHERE id = :id"),
            {"url": company.im_base_url, "id": row[0]},
        )
        return row[0]

    result = await db.execute(
        text("""
            INSERT INTO bi_data_sources (name, source_type, base_url, status)
            VALUES (:name, 'erp', :url, 'active')
            RETURNING id
        """),
        {"name": "infomanager", "url": company.im_base_url},
    )
    return result.fetchone()[0]


async def sync_company(company: Company) -> dict:
    """Sincroniza Infomanager → BD exclusiva de la empresa."""
    client = _get_client(company)
    fecha_desde, fecha_hasta = _date_range(company.id)
    desde = _yyyymmdd(fecha_desde)
    hasta = _yyyymmdd(fecha_hasta)

    clientes_raw = await client.get_clientes()
    articulos_raw = await client.get_articulos()
    vendedores_raw = await client.get_vendedores()
    rubros_raw = await client.get_rubros()
    ventas_raw = await client.get_ventas(desde, hasta)
    items_raw = await client.get_venta_items(desde, hasta)

    from app.services.company_db import get_company_sessionmaker
    session_factory = get_company_sessionmaker(company.db_url)

    async with session_factory() as db:
        source_id = await _ensure_source(db, company)

        customers = [adapt_customer(r, source_id) for r in clientes_raw]
        products = [adapt_product(r, source_id) for r in articulos_raw]
        vendedores = [adapt_vendedor(r, source_id) for r in vendedores_raw]
        rubros = [adapt_rubro(r, source_id) for r in rubros_raw]
        sales = [adapt_sale(r, source_id) for r in ventas_raw]
        sale_items = [adapt_sale_item(r, source_id) for r in items_raw]

        if vendedores:
            await db.execute(text("""
                INSERT INTO bi_vendedores (source_id, cod_vendedor, nombre, habilitado)
                VALUES (:source_id, :cod_vendedor, :nombre, :habilitado)
                ON CONFLICT (source_id, cod_vendedor) DO UPDATE
                SET nombre = EXCLUDED.nombre, synced_at = now()
            """), vendedores)

        if rubros:
            await db.execute(text("""
                INSERT INTO bi_rubros (source_id, cod_rubro, descripcion)
                VALUES (:source_id, :cod_rubro, :descripcion)
                ON CONFLICT (source_id, cod_rubro) DO UPDATE
                SET descripcion = EXCLUDED.descripcion, synced_at = now()
            """), rubros)

        if customers:
            await db.execute(text("""
                INSERT INTO bi_customers
                    (source_id, cod_cliente, nombre, razon_social, categoria_iva,
                     cuit, email, cod_vendedor, lista_precio, domicilio, telefonos,
                     condicion_venta, fecha_alta, raw)
                VALUES
                    (:source_id, :cod_cliente, :nombre, :razon_social, :categoria_iva,
                     :cuit, :email, :cod_vendedor, :lista_precio, :domicilio, :telefonos,
                     :condicion_venta, :fecha_alta, :raw::jsonb)
                ON CONFLICT (source_id, cod_cliente) DO UPDATE
                SET nombre = EXCLUDED.nombre, synced_at = now()
            """), customers)

        if products:
            await db.execute(text("""
                INSERT INTO bi_products
                    (source_id, cod_articulo, descripcion, descripcion_corta,
                     cod_rubro, cod_subrubro, cod_barra, iva, moneda,
                     precio_compra, precio_venta, habilitado, raw)
                VALUES
                    (:source_id, :cod_articulo, :descripcion, :descripcion_corta,
                     :cod_rubro, :cod_subrubro, :cod_barra, :iva, :moneda,
                     :precio_compra, :precio_venta, :habilitado, :raw::jsonb)
                ON CONFLICT (source_id, cod_articulo) DO UPDATE
                SET descripcion = EXCLUDED.descripcion,
                    precio_venta = EXCLUDED.precio_venta,
                    precio_compra = EXCLUDED.precio_compra,
                    synced_at = now()
            """), products)

        if sales:
            await db.execute(text("""
                INSERT INTO bi_sales
                    (source_id, source_sale_id, fecha, tipo_comprobante, tipo_factura,
                     numero, punto_de_venta, total, neto, iva_importe, cod_cliente,
                     cod_vendedor, cod_empresa, moneda, cotizacion, anulada, raw)
                VALUES
                    (:source_id, :source_sale_id, :fecha, :tipo_comprobante, :tipo_factura,
                     :numero, :punto_de_venta, :total, :neto, :iva_importe, :cod_cliente,
                     :cod_vendedor, :cod_empresa, :moneda, :cotizacion, :anulada, :raw::jsonb)
                ON CONFLICT (source_id, source_sale_id) DO UPDATE
                SET total = EXCLUDED.total, anulada = EXCLUDED.anulada, synced_at = now()
            """), sales)

        if sale_items:
            await db.execute(text("""
                INSERT INTO bi_sale_items
                    (source_id, source_item_id, source_sale_id, fecha, cod_cliente,
                     cod_vendedor, cod_empresa, cod_articulo, detalle, cantidad, precio,
                     precio_con_iva, precio_compra_actual, iva_por, importe, cod_barra, raw)
                VALUES
                    (:source_id, :source_item_id, :source_sale_id, :fecha, :cod_cliente,
                     :cod_vendedor, :cod_empresa, :cod_articulo, :detalle, :cantidad, :precio,
                     :precio_con_iva, :precio_compra_actual, :iva_por, :importe, :cod_barra,
                     :raw::jsonb)
                ON CONFLICT (source_id, source_item_id) DO UPDATE
                SET importe = EXCLUDED.importe, synced_at = now()
            """), sale_items)

        await db.execute(
            text("UPDATE bi_data_sources SET last_sync_at = now() WHERE id = :id"),
            {"id": source_id},
        )
        await db.commit()

    now = datetime.now(timezone.utc)
    _last_sync[company.id] = now
    result = {
        "company": company.nombre,
        "db": company.db_url.rsplit("/", 1)[-1],
        "customers": len(customers),
        "products": len(products),
        "sales": len(sales),
        "sale_items": len(sale_items),
        "synced_at": now.isoformat(),
    }
    logger.info("Sync '%s' OK: %s", company.nombre, result)
    return result
