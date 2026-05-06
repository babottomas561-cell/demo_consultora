from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.models.central import Company
from app.schemas.company import CompanyCreate, CompanyResponse
import re

router = APIRouter()

def sanitize_tenant_name(name: str) -> str:
    slug = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
    return f"tenant_{slug}"

@router.post("/", response_model=CompanyResponse)
async def create_company(company_in: CompanyCreate, db: AsyncSession = Depends(get_db)):
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
    
    # Later: Run alembic migrations specifically on this schema using a worker task
    
    new_company.is_provisioned = True
    await db.commit()
    await db.refresh(new_company)

    return new_company
