from __future__ import annotations

import logging
import re
import unicodedata
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.data_source import DataSource
from app.models.sync_status import SyncStatus
from app.models.tenant_database import TenantDatabase
from app.schemas.admin_company import CompanyCreateRequest
from app.services import tenant_database_manager
from app.services.secrets import encrypt_secret

logger = logging.getLogger(__name__)


def slugify_company_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", normalized.lower()).strip("_")
    slug = re.sub(r"_+", "_", slug)
    slug = re.sub(r"_(s_a|sa|srl|s_r_l|s_a_s|sas)$", "", slug)
    return (slug or "company")[:60]


def generate_database_name(company_id: int, slug: str) -> str:
    clean_slug = slugify_company_name(slug)[:70]
    return f"company_{company_id}_{clean_slug}"[:120]


async def ensure_unique_slug(db: AsyncSession, raw_slug: str) -> str:
    base = slugify_company_name(raw_slug)
    slug = base
    counter = 1
    while True:
        result = await db.execute(select(Company.id).where(Company.slug == slug))
        if result.scalar_one_or_none() is None:
            return slug
        suffix = f"_{counter}"
        slug = f"{base[:80 - len(suffix)]}{suffix}"
        counter += 1


async def provision_company(db: AsyncSession, payload: CompanyCreateRequest) -> dict:
    logger.info("creating company name=%s", payload.name)
    source_payload = payload.source
    rubro = payload.rubro or payload.business_type
    slug = await ensure_unique_slug(db, payload.slug or payload.name)
    logger.info("generated slug=%s", slug)

    company = Company(
        name=payload.name,
        legacy_nombre=payload.name,
        slug=slug,
        cuit=payload.cuit,
        business_type=rubro,
        status="provisioning",
        legacy_is_active=False,
    )
    db.add(company)
    await db.flush()

    database_name = generate_database_name(company.id, slug)
    logger.info("generated database_name=%s", database_name)
    tenant = TenantDatabase(
        company_id=company.id,
        database_name=database_name,
        database_url=tenant_database_manager.build_tenant_database_url(database_name),
        status="provisioning",
    )
    db.add(tenant)
    await db.flush()

    try:
        logger.info("creating tenant database company_id=%s database_name=%s", company.id, database_name)
        create_result = await tenant_database_manager.create_database(database_name)
        tenant.database_url = create_result.database_url

        logger.info("running tenant migrations company_id=%s database_name=%s", company.id, database_name)
        await tenant_database_manager.run_tenant_migrations(tenant.database_url)
        tenant.last_migration_at = datetime.now(timezone.utc)
        tenant.status = "active"
        tenant.last_error = None

        logger.info("creating data source company_id=%s source_type=%s", company.id, payload.source_type)
        source = DataSource(
            company_id=company.id,
            source_type=payload.source_type,
            name=payload.source_type,
            base_url=source_payload.base_url if source_payload else None,
            client_id=source_payload.client_id if source_payload else None,
            client_secret=encrypt_secret(source_payload.client_secret if source_payload else None),
            status="active",
        )
        db.add(source)
        await db.flush()

        sync = SyncStatus(company_id=company.id, source_id=source.id, status="idle")
        db.add(sync)

        company.status = payload.status
        company.legacy_is_active = payload.status == "active"
        await db.commit()
        await db.refresh(company)
        logger.info("provisioning completed company_id=%s", company.id)

        return {
            "company": company,
            "tenant_database": tenant,
            "data_source": source,
            "sync_status": sync,
            "provisioning_status": "completed",
        }
    except Exception as exc:
        logger.error("provisioning failed company_id=%s error=%s", company.id, exc, exc_info=True)
        company.status = "failed"
        tenant.status = "failed"
        tenant.last_error = str(exc)
        await db.commit()
        raise
