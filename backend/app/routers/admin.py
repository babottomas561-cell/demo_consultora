from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.integrations.infomanager.client import InfomanagerApiClient
from app.integrations.infomanager.company_sync import sync_company
from app.models.company import Company
from app.models.data_source import DataSource
from app.models.sync_status import SyncStatus
from app.models.tenant_database import TenantDatabase
from app.models.user import User, UserRole
from app.schemas.admin_company import CompanyCreateRequest
from app.services.auth_service import create_access_token, hash_password
from app.services.company_provisioning_service import provision_company
from app.services.secrets import decrypt_secret, mask_secret

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo admins")
    return current_user


class BootstrapRequest(BaseModel):
    email: EmailStr
    password: str


class AssignUserToCompany(BaseModel):
    user_id: int
    company_id: int


@router.post("/bootstrap", status_code=status.HTTP_201_CREATED)
async def bootstrap_admin(data: BootstrapRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.role == UserRole.admin))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ya existe un admin.")

    existing_email = await db.execute(select(User).where(User.email == data.email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    admin = User(email=data.email, hashed_password=hash_password(data.password), role=UserRole.admin)
    db.add(admin)
    await db.commit()
    await db.refresh(admin)

    token = create_access_token(user_id=admin.id, role=admin.role.value)
    return {"email": admin.email, "role": admin.role.value, "access_token": token, "token_type": "bearer"}


def _company_payload(company: Company, tenant: TenantDatabase | None, source: DataSource | None, sync: SyncStatus | None) -> dict:
    return {
        "id": company.id,
        "name": company.name,
        "slug": company.slug,
        "cuit": company.cuit,
        "rubro": company.business_type,
        "status": company.status,
        "database_name": tenant.database_name if tenant else None,
        "source_type": source.source_type if source else None,
        "source_status": source.status if source else None,
        "sync_status": sync.status if sync else None,
        "last_successful_sync_at": sync.last_successful_sync_at.isoformat() if sync and sync.last_successful_sync_at else None,
    }


async def _company_related(db: AsyncSession, company_id: int):
    tenant = (await db.execute(select(TenantDatabase).where(TenantDatabase.company_id == company_id))).scalar_one_or_none()
    source = (await db.execute(select(DataSource).where(DataSource.company_id == company_id))).scalar_one_or_none()
    sync = None
    if source:
        sync = (
            await db.execute(
                select(SyncStatus).where(SyncStatus.company_id == company_id, SyncStatus.source_id == source.id)
            )
        ).scalar_one_or_none()
    return tenant, source, sync


@router.post("/companies", status_code=status.HTTP_201_CREATED)
async def create_company(
    data: CompanyCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    try:
        result = await provision_company(db, data)
    except PermissionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Provisioning failed: {exc}") from exc

    payload = _company_payload(
        result["company"],
        result["tenant_database"],
        result["data_source"],
        result["sync_status"],
    )
    payload["provisioning_status"] = result["provisioning_status"]
    return payload


@router.get("/companies")
async def list_companies(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(Company).order_by(Company.created_at))
    companies = result.scalars().all()
    rows = []
    for company in companies:
        rows.append(_company_payload(company, *(await _company_related(db, company.id))))
    return rows


@router.get("/companies/{company_id}")
async def get_company(company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    tenant, source, sync = await _company_related(db, company_id)
    payload = _company_payload(company, tenant, source, sync)
    payload["tenant_database"] = {
        "database_name": tenant.database_name,
        "status": tenant.status,
        "last_migration_at": tenant.last_migration_at.isoformat() if tenant.last_migration_at else None,
        "last_error": tenant.last_error,
    } if tenant else None
    payload["data_source"] = {
        "id": source.id,
        "source_type": source.source_type,
        "name": source.name,
        "base_url": source.base_url,
        "client_id": source.client_id,
        "masked_secret": mask_secret(source.client_secret),
        "status": source.status,
        "last_test_at": source.last_test_at.isoformat() if source.last_test_at else None,
        "last_error": source.last_error,
    } if source else None
    return payload


@router.post("/companies/{company_id}/assign-user")
async def assign_user_to_company(
    company_id: int,
    data: AssignUserToCompany,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = await db.get(User, data.user_id)
    company = await db.get(Company, company_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    user.company_id = company_id
    await db.commit()
    return {"message": f"Usuario '{user.email}' asignado a '{company.name}'"}


@router.post("/companies/{company_id}/sync")
async def trigger_company_sync(company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await sync_company(company_id, db)
    return {"ok": True, "result": result}


@router.get("/companies/{company_id}/sync-status")
async def get_company_sync_status(company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    _tenant, source, sync = await _company_related(db, company_id)
    if not sync:
        return {"company_id": company_id, "status": "not_configured"}
    return {
        "company_id": company_id,
        "source_id": source.id if source else None,
        "status": sync.status,
        "last_sync_started_at": sync.last_sync_started_at.isoformat() if sync.last_sync_started_at else None,
        "last_sync_finished_at": sync.last_sync_finished_at.isoformat() if sync.last_sync_finished_at else None,
        "last_successful_sync_at": sync.last_successful_sync_at.isoformat() if sync.last_successful_sync_at else None,
        "last_error": sync.last_error,
        "sales_count": sync.sales_count,
        "items_count": sync.items_count,
        "customers_count": sync.customers_count,
        "products_count": sync.products_count,
    }


@router.post("/companies/{company_id}/test-source")
async def test_company_source(company_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    source = (await db.execute(select(DataSource).where(DataSource.company_id == company_id))).scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Fuente no encontrada")
    if source.source_type != "infomanager":
        raise HTTPException(status_code=400, detail="Solo infomanager soportado por ahora")

    client = InfomanagerApiClient(source.base_url, source.client_id, decrypt_secret(source.client_secret))
    try:
        await client.login()
        source.status = "active"
        source.last_test_at = datetime.now(timezone.utc)
        source.last_error = None
        await db.commit()
        return {"ok": True, "status": "active"}
    except Exception as exc:
        source.status = "error"
        source.last_test_at = datetime.now(timezone.utc)
        source.last_error = str(exc)
        await db.commit()
        return {"ok": False, "error": str(exc)}
    finally:
        await client.close()
