from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.integrations.infomanager.client import InfomanagerApiClient
from app.models.company import Company
from app.models.data_source import DataSource
from app.models.sync_status import SyncStatus
from app.services.secrets import decrypt_secret
from app.services.tenant_database_manager import get_tenant_sessionmaker
from app.services.tenant_resolver import get_tenant_database

logger = logging.getLogger(__name__)

_last_sync: dict[int, datetime] = {}


def _date_range(company_id: int) -> tuple[date, date]:
    today = date.today()
    if company_id not in _last_sync:
        return today - timedelta(days=90), today
    return today - timedelta(days=1), today


def _yyyymmdd(value: date) -> str:
    return value.strftime("%Y%m%d")


def _sale_row(entry: dict[str, Any], customer_names: dict[str, str]) -> dict[str, Any]:
    raw = entry.get("venta", entry)
    external_id = str(raw.get("id"))
    customer_id = str(raw.get("cod_cliente") or "")
    return {
        "source": "infomanager",
        "external_id": external_id,
        "date": raw.get("fecha"),
        "customer_external_id": customer_id or None,
        "customer_name": customer_names.get(customer_id),
        "seller_external_id": str(raw.get("cod_vendedor")) if raw.get("cod_vendedor") is not None else None,
        "gross_total": float(raw.get("total") or 0),
        "net_total": float(raw.get("neto") or 0),
        "tax_total": float(raw.get("iva_importe") or 0),
        "cancelled": raw.get("anulada") == "S",
        "raw_payload": json.dumps(raw, ensure_ascii=False),
    }


def _item_row(raw: dict[str, Any]) -> dict[str, Any]:
    quantity = float(raw.get("cantidad") or 0)
    unit_price = float(raw.get("precio_con_iva") or raw.get("precio") or 0)
    unit_cost = float(raw.get("precio_compra_actual") or 0)
    return {
        "source": "infomanager",
        "external_id": str(raw.get("id")),
        "sale_external_id": str(raw.get("id_comprobante")),
        "product_external_id": str(raw.get("cod_articulo")) if raw.get("cod_articulo") is not None else None,
        "product_name": raw.get("detalle"),
        "quantity": quantity,
        "unit_price": unit_price,
        "unit_cost": unit_cost,
        "gross_total": float(raw.get("importe") or (unit_price * quantity)),
        "estimated_margin": (unit_price - unit_cost) * quantity,
        "raw_payload": json.dumps(raw, ensure_ascii=False),
    }


def _customer_row(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "source": "infomanager",
        "external_id": str(raw.get("cod_cliente")),
        "name": raw.get("nombre") or raw.get("razon_social") or "",
        "document": raw.get("cuit") or raw.get("numero_doc"),
        "raw_payload": json.dumps(raw, ensure_ascii=False),
    }


def _product_row(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "source": "infomanager",
        "external_id": str(raw.get("cod_articulo")),
        "name": raw.get("descripcion") or "",
        "category": str(raw.get("cod_rubro")) if raw.get("cod_rubro") is not None else None,
        "brand": None,
        "current_price": float(raw.get("precio_venta") or 0),
        "current_cost": float(raw.get("precio_compra") or 0),
        "raw_payload": json.dumps(raw, ensure_ascii=False),
    }


async def _upsert_source(db: AsyncSession, source: DataSource) -> None:
    await db.execute(
        text("""
            UPDATE bi_data_sources
            SET status = :status, raw_config = CAST(:raw_config AS JSONB), updated_at = now()
            WHERE source_type = :source_type AND external_name = :external_name
        """),
        {
            "source_type": source.source_type,
            "external_name": source.name,
            "status": source.status,
            "raw_config": json.dumps({"base_url": source.base_url, "client_id": source.client_id}),
        },
    )
    await db.execute(
        text("""
            INSERT INTO bi_data_sources (source_type, external_name, status, raw_config)
            SELECT :source_type, :external_name, :status, CAST(:raw_config AS JSONB)
            WHERE NOT EXISTS (
                SELECT 1 FROM bi_data_sources WHERE source_type = :source_type AND external_name = :external_name
            )
        """),
        {
            "source_type": source.source_type,
            "external_name": source.name,
            "status": source.status,
            "raw_config": json.dumps({"base_url": source.base_url, "client_id": source.client_id}),
        },
    )


async def _upsert_rows(db: AsyncSession, table: str, rows: list[dict[str, Any]], columns: list[str], conflict: str) -> int:
    if not rows:
        return 0
    column_sql = ", ".join(columns)
    value_sql = ", ".join([f":{column}" if column != "raw_payload" else "CAST(:raw_payload AS JSONB)" for column in columns])
    update_sql = ", ".join(
        [f"{column} = EXCLUDED.{column}" for column in columns if column not in {"source", "external_id"}]
        + ["updated_at = now()"]
    )
    await db.execute(
        text(f"""
            INSERT INTO {table} ({column_sql})
            VALUES ({value_sql})
            ON CONFLICT ({conflict}) DO UPDATE SET {update_sql}
        """),
        rows,
    )
    return len(rows)


async def sync_company(company_id: int, central_db: AsyncSession) -> dict:
    logger.info("sync started company_id=%s", company_id)
    company = await central_db.get(Company, company_id)
    if not company:
        raise ValueError(f"Company {company_id} not found")

    source = (
        await central_db.execute(
            select(DataSource).where(
                DataSource.company_id == company_id,
                DataSource.status == "active",
            )
        )
    ).scalar_one_or_none()
    if not source:
        raise ValueError(f"Company {company_id} has no active data source")
    logger.info("source selected company_id=%s source_type=%s", company_id, source.source_type)

    sync_status = (
        await central_db.execute(
            select(SyncStatus).where(SyncStatus.company_id == company_id, SyncStatus.source_id == source.id)
        )
    ).scalar_one_or_none()
    if not sync_status:
        sync_status = SyncStatus(company_id=company_id, source_id=source.id, status="running")
        central_db.add(sync_status)
        await central_db.flush()

    sync_status.status = "running"
    sync_status.last_sync_started_at = datetime.now(timezone.utc)
    sync_status.last_error = None
    await central_db.commit()

    try:
        tenant = await get_tenant_database(central_db, company_id)
        if not tenant:
            raise ValueError(f"Company {company_id} has no active tenant database")
        logger.info("tenant database resolved company_id=%s database_name=%s", company_id, tenant.database_name)

        if source.source_type != "infomanager":
            raise ValueError(f"Source type {source.source_type} is not implemented")

        client = InfomanagerApiClient(source.base_url, source.client_id, decrypt_secret(source.client_secret))
        fecha_desde, fecha_hasta = _date_range(company_id)
        try:
            customers_raw = await client.get_clientes()
            products_raw = await client.get_articulos()
            sales_raw = await client.get_ventas(_yyyymmdd(fecha_desde), _yyyymmdd(fecha_hasta))
            items_raw = await client.get_venta_items(_yyyymmdd(fecha_desde), _yyyymmdd(fecha_hasta))
        finally:
            await client.close()

        customer_names = {str(row.get("cod_cliente")): row.get("nombre") for row in customers_raw}
        customers = [_customer_row(row) for row in customers_raw]
        products = [_product_row(row) for row in products_raw]
        sales = [_sale_row(row, customer_names) for row in sales_raw]
        items = [_item_row(row) for row in items_raw]

        sessionmaker = get_tenant_sessionmaker(tenant.database_url)
        async with sessionmaker() as tenant_db:
            await _upsert_source(tenant_db, source)
            customers_count = await _upsert_rows(
                tenant_db,
                "bi_customers",
                customers,
                ["source", "external_id", "name", "document", "raw_payload"],
                "source, external_id",
            )
            logger.info("customers synced company_id=%s count=%s", company_id, customers_count)
            products_count = await _upsert_rows(
                tenant_db,
                "bi_products",
                products,
                ["source", "external_id", "name", "category", "brand", "current_price", "current_cost", "raw_payload"],
                "source, external_id",
            )
            logger.info("products synced company_id=%s count=%s", company_id, products_count)
            sales_count = await _upsert_rows(
                tenant_db,
                "bi_sales",
                sales,
                [
                    "source",
                    "external_id",
                    "date",
                    "customer_external_id",
                    "customer_name",
                    "seller_external_id",
                    "gross_total",
                    "net_total",
                    "tax_total",
                    "cancelled",
                    "raw_payload",
                ],
                "source, external_id",
            )
            logger.info("sales synced company_id=%s count=%s", company_id, sales_count)
            items_count = await _upsert_rows(
                tenant_db,
                "bi_sale_items",
                items,
                [
                    "source",
                    "external_id",
                    "sale_external_id",
                    "product_external_id",
                    "product_name",
                    "quantity",
                    "unit_price",
                    "unit_cost",
                    "gross_total",
                    "estimated_margin",
                    "raw_payload",
                ],
                "source, external_id",
            )
            logger.info("items synced company_id=%s count=%s", company_id, items_count)
            await tenant_db.commit()

        now = datetime.now(timezone.utc)
        _last_sync[company_id] = now
        sync_status.status = "success"
        sync_status.last_sync_finished_at = now
        sync_status.last_successful_sync_at = now
        sync_status.sales_count = sales_count
        sync_status.items_count = items_count
        sync_status.customers_count = customers_count
        sync_status.products_count = products_count
        sync_status.last_error = None
        await central_db.commit()
        logger.info("sync completed company_id=%s", company_id)

        return {
            "company_id": company_id,
            "database_name": tenant.database_name,
            "customers": customers_count,
            "products": products_count,
            "sales": sales_count,
            "items": items_count,
            "synced_at": now.isoformat(),
        }
    except Exception as exc:
        logger.error("sync failed company_id=%s error=%s", company_id, exc, exc_info=True)
        sync_status.status = "failed"
        sync_status.last_sync_finished_at = datetime.now(timezone.utc)
        sync_status.last_error = str(exc)
        await central_db.commit()
        raise
