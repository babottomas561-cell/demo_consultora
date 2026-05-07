from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from app.core.database import get_db
from app.core.tenant import run_tenant_migrations
from app.models.central import Company
from app.schemas.company import CompanyCreate, CompanyResponse
from app.api.deps import get_current_admin
from typing import List
import re

router = APIRouter()

def sanitize_tenant_name(name: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
    return f"tenant_{slug}"

@router.post("/", response_model=CompanyResponse)
async def create_company(
    company_in: CompanyCreate, 
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    tenant_schema = sanitize_tenant_name(company_in.name)
    
    # Placeholder: In a real app we'd also check if the schema exists
    new_company = Company(
        name=company_in.name,
        tenant_schema=tenant_schema,
        erp_type=company_in.erp_type,
        erp_config=company_in.erp_config,
        is_provisioned=False
    )
    
    db.add(new_company)
    await db.commit()
    await db.refresh(new_company)
    
    # Create the schema dynamically
    await db.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{tenant_schema}"'))
    await db.commit()  # Must commit so the other connection (Alembic) sees it
    
    # Run alembic migrations specifically on this schema using a worker task / threadpool
    try:
        await run_in_threadpool(run_tenant_migrations, tenant_schema)
    except Exception as e:
        # We might want to handle this gracefully or delete the schema
        print(f"Failed to run migrations for {tenant_schema}: {e}")
        raise HTTPException(status_code=500, detail="Error provisioning tenant database schema")
    
    new_company.is_provisioned = True
    await db.commit()
    await db.refresh(new_company)
    
    if company_in.erp_type == "infomanager_demo":
        from celery import Celery
        from app.core.config import settings
        celery_client = Celery(
            "api_client",
            broker=settings.REDIS_URL,
            backend=settings.REDIS_URL,
        )
        # Parse months from config or default to 12
        meses = 12
        if company_in.erp_config and "meses" in company_in.erp_config:
            meses = int(company_in.erp_config["meses"])
        celery_client.send_task(
            "tasks.demo_seed.seed_tenant_demo",
            args=[tenant_schema, meses]
        )

    return new_company

@router.get("/", response_model=List[CompanyResponse])
async def list_companies(
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    result = await db.execute(select(Company))
    return result.scalars().all()

@router.delete("/{company_id}")
async def delete_company(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    result = await db.execute(select(Company).filter(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Drop schema
    await db.execute(text(f'DROP SCHEMA IF EXISTS "{company.tenant_schema}" CASCADE'))
    
    await db.delete(company)
    await db.commit()
    return {"message": "Company deleted"}
