from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select


BACKEND_ROOT = Path(__file__).resolve().parents[3]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL is required for integration tests and must point to PostgreSQL.")
if not database_url.startswith(("postgresql://", "postgresql+asyncpg://")):
    raise RuntimeError("Integration tests require PostgreSQL. SQLite or other databases are not allowed.")

os.environ.setdefault("IM_BASE_URL", "http://localhost:8000/simulator")
os.environ.setdefault("IM_CLIENT_ID", "demo_client")
os.environ.setdefault("IM_CLIENT_SECRET", "demo_secret")

from app.config import settings
from app.database import AsyncSessionLocal, Base, engine
from app.integrations.infomanager import sync_service
from app.integrations.infomanager.client import InfomanagerApiClient
from app.main import app
from app.models.bi_customer import BiCustomer
from app.models.bi_product import BiProduct
from app.models.bi_sale import BiSale
from app.models.bi_sale_item import BiSaleItem


pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
async def integration_environment():
    settings.im_base_url = os.environ["IM_BASE_URL"].rstrip("/")
    settings.im_client_id = os.environ["IM_CLIENT_ID"]
    settings.im_client_secret = os.environ["IM_CLIENT_SECRET"]
    settings.im_sync_days_initial = max(settings.im_sync_days_initial, 1300)
    sync_service.im_client.base_url = settings.im_base_url
    sync_service.im_client.client_id = settings.im_client_id
    sync_service.im_client.client_secret = settings.im_client_secret
    sync_service._last_sync_at = None

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{settings.im_base_url}/health")
            response.raise_for_status()
    except Exception as exc:
        raise RuntimeError(f"Infomanager simulator is required at {settings.im_base_url}") from exc

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield


@pytest.fixture
def api_client():
    return TestClient(app)


async def _count(db, model) -> int:
    result = await db.execute(select(func.count()).select_from(model))
    return int(result.scalar_one())


async def _sync_and_measure(db) -> tuple[dict, float]:
    start = time.perf_counter()
    result = await sync_service.sync_infomanager(db)
    elapsed = time.perf_counter() - start
    print(
        "Infomanager sync result: "
        f"sales={result['sales']} items={result['sale_items']} "
        f"customers={result['customers']} products={result['products']} elapsed={elapsed:.2f}s"
    )
    return result, elapsed


async def test_login_to_integrated_infomanager_simulator_returns_token():
    client = InfomanagerApiClient(settings.im_base_url, settings.im_client_id, settings.im_client_secret)
    try:
        token = await client.login()
    finally:
        await client.close()

    assert token
    assert token.startswith("fake_access_token_")


async def test_full_sync_ingests_data_into_postgresql():
    async with AsyncSessionLocal() as db:
        result, elapsed = await _sync_and_measure(db)

        sales_count = await _count(db, BiSale)
        items_count = await _count(db, BiSaleItem)
        customers_count = await _count(db, BiCustomer)
        products_count = await _count(db, BiProduct)

    print(
        "BI table counts after sync: "
        f"sales={sales_count} items={items_count} customers={customers_count} products={products_count} "
        f"elapsed={elapsed:.2f}s"
    )

    assert result["sales"] > 0
    assert result["sale_items"] > 0
    assert result["customers"] > 0
    assert result["products"] > 0
    assert sales_count > 0
    assert items_count > 0
    assert customers_count > 0
    assert products_count > 0


async def test_sync_upsert_does_not_duplicate_sales():
    async with AsyncSessionLocal() as db:
        await _sync_and_measure(db)
        count_1 = await _count(db, BiSale)

        sync_service._last_sync_at = None
        await _sync_and_measure(db)
        count_2 = await _count(db, BiSale)

    print(f"BI sales count after repeated sync: first={count_1} second={count_2}")

    assert count_1 > 0
    assert count_1 == count_2


async def test_bi_status_endpoint_reports_ingested_data(api_client):
    async with AsyncSessionLocal() as db:
        await _sync_and_measure(db)

    response = api_client.get("/bi/status")

    assert response.status_code == 200
    payload = response.json()
    print(f"/bi/status counts: {payload['counts']}")
    assert payload["counts"]["bi_sales"] > 0
    assert payload["counts"]["bi_sale_items"] > 0
    assert payload["counts"]["bi_customers"] > 0
    assert payload["counts"]["bi_products"] > 0
