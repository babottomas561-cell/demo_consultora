from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.integrations.infomanager.adapter import adapt_customer, adapt_product, adapt_sale, adapt_sale_item
from app.integrations.infomanager.client import InfomanagerApiClient
from app.models.bi_customer import BiCustomer
from app.models.bi_data_source import BiDataSource
from app.models.bi_product import BiProduct
from app.models.bi_sale import BiSale
from app.models.bi_sale_item import BiSaleItem

logger = logging.getLogger(__name__)

_last_sync_at: datetime | None = None
im_client = InfomanagerApiClient(settings.im_base_url, settings.im_client_id, settings.im_client_secret)


def _date_range() -> tuple[date, date]:
    today = date.today()
    if _last_sync_at is None:
        return today - timedelta(days=settings.im_sync_days_initial), today
    return today - timedelta(days=1), today


def _yyyymmdd(value: date) -> str:
    return value.strftime("%Y%m%d")


async def ensure_data_source(db: AsyncSession) -> BiDataSource:
    result = await db.execute(select(BiDataSource).where(BiDataSource.name == "infomanager"))
    source = result.scalar_one_or_none()
    if source:
        if source.base_url != settings.im_base_url:
            source.base_url = settings.im_base_url
        return source

    source = BiDataSource(
        name="infomanager",
        source_type="erp",
        base_url=settings.im_base_url,
        status="active",
    )
    db.add(source)
    await db.flush()
    return source


async def _upsert(db: AsyncSession, model, rows: list[dict], conflict_columns: list[str], update_columns: list[str]) -> int:
    if not rows:
        return 0
    statement = insert(model).values(rows)
    excluded = statement.excluded
    update_values = {column: getattr(excluded, column) for column in update_columns if column != "synced_at"}
    if "synced_at" in model.__table__.columns:
        update_values["synced_at"] = func.now()
    statement = statement.on_conflict_do_update(
        index_elements=conflict_columns,
        set_=update_values,
    )
    await db.execute(statement)
    return len(rows)


async def sync_infomanager(db: AsyncSession) -> dict[str, int | str]:
    global _last_sync_at

    source = await ensure_data_source(db)
    fecha_desde, fecha_hasta = _date_range()
    fecha_desde_im = _yyyymmdd(fecha_desde)
    fecha_hasta_im = _yyyymmdd(fecha_hasta)

    clientes_raw = await im_client.get_clientes()
    articulos_raw = await im_client.get_articulos()
    ventas_raw = await im_client.get_ventas(fecha_desde_im, fecha_hasta_im)
    items_raw = await im_client.get_venta_items(fecha_desde_im, fecha_hasta_im)

    customers = [adapt_customer(row, source.id) for row in clientes_raw]
    products = [adapt_product(row, source.id) for row in articulos_raw]
    sales = [adapt_sale(row, source.id) for row in ventas_raw]
    sale_items = [adapt_sale_item(row, source.id) for row in items_raw]

    await _upsert(
        db,
        BiCustomer,
        customers,
        ["source_id", "cod_cliente"],
        [
            "nombre",
            "razon_social",
            "categoria_iva",
            "cuit",
            "email",
            "cod_vendedor",
            "lista_precio",
            "domicilio",
            "telefonos",
            "condicion_venta",
            "fecha_alta",
            "raw",
            "synced_at",
        ],
    )
    await _upsert(
        db,
        BiProduct,
        products,
        ["source_id", "cod_articulo"],
        [
            "descripcion",
            "descripcion_corta",
            "cod_rubro",
            "cod_subrubro",
            "cod_barra",
            "iva",
            "moneda",
            "precio_compra",
            "precio_venta",
            "habilitado",
            "raw",
            "synced_at",
        ],
    )
    await _upsert(
        db,
        BiSale,
        sales,
        ["source_id", "source_sale_id"],
        [
            "fecha",
            "tipo_comprobante",
            "tipo_factura",
            "numero",
            "punto_de_venta",
            "total",
            "neto",
            "iva_importe",
            "cod_cliente",
            "cod_vendedor",
            "cod_empresa",
            "moneda",
            "cotizacion",
            "anulada",
            "raw",
            "synced_at",
        ],
    )
    await _upsert(
        db,
        BiSaleItem,
        sale_items,
        ["source_id", "source_item_id"],
        [
            "source_sale_id",
            "fecha",
            "cod_cliente",
            "cod_vendedor",
            "cod_empresa",
            "cod_articulo",
            "detalle",
            "cantidad",
            "precio",
            "precio_con_iva",
            "precio_compra_actual",
            "iva_por",
            "importe",
            "cod_barra",
            "raw",
            "synced_at",
        ],
    )

    now = datetime.now(timezone.utc)
    source.last_sync_at = now
    source.status = "active"
    _last_sync_at = now
    await db.commit()

    result = {
        "customers": len(customers),
        "products": len(products),
        "sales": len(sales),
        "sale_items": len(sale_items),
        "fecha_desde": fecha_desde.isoformat(),
        "fecha_hasta": fecha_hasta.isoformat(),
    }
    logger.info("Infomanager BI sync OK: %s", result)
    return result


async def get_bi_status(db: AsyncSession) -> dict:
    source_result = await db.execute(select(BiDataSource).where(BiDataSource.name == "infomanager"))
    source = source_result.scalar_one_or_none()

    async def count(model) -> int:
        result = await db.execute(select(func.count()).select_from(model))
        return int(result.scalar_one())

    return {
        "im_enabled": bool(settings.im_base_url and settings.im_client_id and settings.im_client_secret),
        "base_url": settings.im_base_url,
        "source": {
            "id": source.id if source else None,
            "name": source.name if source else "infomanager",
            "status": source.status if source else "not_synced",
            "last_sync_at": source.last_sync_at.isoformat() if source and source.last_sync_at else None,
        },
        "last_sync_at": _last_sync_at.isoformat() if _last_sync_at else None,
        "counts": {
            "bi_customers": await count(BiCustomer),
            "bi_products": await count(BiProduct),
            "bi_sales": await count(BiSale),
            "bi_sale_items": await count(BiSaleItem),
            "bi_data_sources": await count(BiDataSource),
        },
    }
