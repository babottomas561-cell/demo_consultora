from celery import Celery
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.config import settings
from app.core.database import get_db
from app.models.central import Company, CompanyConnector
from app.schemas.connectors import ConnectorCreate, ConnectorResponse


router = APIRouter()


def dispatch_infomanager_sync(company_id: int, connector_id: int) -> None:
    celery_client = Celery(
        "api_client",
        broker=settings.REDIS_URL,
        backend=settings.REDIS_URL,
    )
    celery_client.send_task(
        "tasks.sync_infomanager.sync_company",
        args=[company_id, connector_id],
    )


async def _get_company(db: AsyncSession, company_id: int) -> Company:
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


async def _get_connector(db: AsyncSession, company_id: int) -> CompanyConnector:
    result = await db.execute(
        select(CompanyConnector).where(
            CompanyConnector.company_id == company_id,
            CompanyConnector.connector_type == "INFOMANAGER",
        )
    )
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    return connector


@router.post("", response_model=ConnectorResponse, status_code=status.HTTP_201_CREATED)
async def create_connector(
    connector_in: ConnectorCreate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    await _get_company(db, connector_in.company_id)
    connector_type = connector_in.connector_type.upper()
    if connector_type != "INFOMANAGER":
        raise HTTPException(status_code=400, detail="Only INFOMANAGER connector is supported")

    result = await db.execute(
        select(CompanyConnector).where(
            CompanyConnector.company_id == connector_in.company_id,
            CompanyConnector.connector_type == connector_type,
        )
    )
    connector = result.scalar_one_or_none()
    if connector:
        connector.client_id = connector_in.client_id
        connector.client_secret = connector_in.client_secret
        connector.base_url = connector_in.base_url
        connector.access_token = None
        connector.token_expires_at = None
        connector.sync_status = "pending"
        connector.sync_error = None
    else:
        connector = CompanyConnector(
            company_id=connector_in.company_id,
            connector_type=connector_type,
            client_id=connector_in.client_id,
            client_secret=connector_in.client_secret,
            base_url=connector_in.base_url,
            sync_status="pending",
        )
        db.add(connector)

    await db.commit()
    await db.refresh(connector)
    dispatch_infomanager_sync(connector.company_id, connector.id)
    return connector


@router.get("/{company_id}", response_model=ConnectorResponse)
async def get_connector(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    return await _get_connector(db, company_id)


@router.post("/{company_id}/sync", response_model=ConnectorResponse)
async def sync_connector(
    company_id: int,
    force: bool = False,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    connector = await _get_connector(db, company_id)
    if connector.sync_status == "running" and not force:
        return connector

    connector.sync_status = "pending"
    connector.sync_error = None
    await db.commit()
    await db.refresh(connector)
    dispatch_infomanager_sync(connector.company_id, connector.id)
    return connector


@router.post("/{company_id}/reset-sync", response_model=ConnectorResponse)
async def reset_sync_status(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """Force-reset a stuck sync (status=running) back to idle."""
    connector = await _get_connector(db, company_id)
    connector.sync_status = "idle"
    connector.sync_error = "manually reset"
    await db.commit()
    await db.refresh(connector)
    return connector


@router.delete("/{company_id}")
async def delete_connector(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin),
):
    connector = await _get_connector(db, company_id)
    await db.delete(connector)
    await db.commit()
    return {"message": "Connector deleted"}
