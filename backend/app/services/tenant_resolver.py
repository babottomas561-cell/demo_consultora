from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant_database import TenantDatabase
from app.services.tenant_database_manager import get_tenant_sessionmaker


async def get_tenant_database(db: AsyncSession, company_id: int) -> TenantDatabase | None:
    result = await db.execute(
        select(TenantDatabase).where(
            TenantDatabase.company_id == company_id,
            TenantDatabase.status == "active",
        )
    )
    return result.scalar_one_or_none()


async def get_tenant_sessionmaker_for_company(db: AsyncSession, company_id: int):
    tenant = await get_tenant_database(db, company_id)
    if tenant is None:
        return None
    return get_tenant_sessionmaker(tenant.database_url)
