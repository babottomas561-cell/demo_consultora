"""
Endpoints de administración — solo para el rol admin.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.company import Company
from app.models.user import User, UserRole
from app.services.auth_service import create_access_token, hash_password
from app.services.company_service import get_or_create_company

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo admins")
    return current_user


# ─────────────────────────────────────── bootstrap

class BootstrapRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/bootstrap", status_code=status.HTTP_201_CREATED)
async def bootstrap_admin(data: BootstrapRequest, db: AsyncSession = Depends(get_db)):
    """
    Crea el primer usuario admin.
    Solo funciona si no existe ningún admin en la BD todavía — después devuelve 409.
    """
    existing = await db.execute(select(User).where(User.role == UserRole.admin))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un admin. Usá /auth/login para ingresar.",
        )

    existing_email = await db.execute(select(User).where(User.email == data.email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    admin = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.admin,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)

    token = create_access_token(user_id=admin.id, role=admin.role.value)
    return {
        "message": "Admin creado. Copia el token o usá /auth/login cuando necesites uno nuevo.",
        "email": admin.email,
        "role": admin.role.value,
        "access_token": token,
        "token_type": "bearer",
    }


# ─────────────────────────────────────── companies

class CompanyCreate(BaseModel):
    nombre: str
    im_base_url: str = "http://localhost:8080/simulator"
    im_client_id: str = "demo_client"
    im_client_secret: str = "demo_secret"


class AssignUserToCompany(BaseModel):
    user_id: int
    company_id: int


@router.post("/companies", status_code=status.HTTP_201_CREATED)
async def create_company(
    data: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Crea una empresa nueva:
    1. Registra en la tabla companies (BD global)
    2. Crea una base de datos PostgreSQL exclusiva: company_{id}
    3. Crea todas las tablas BI en esa nueva BD
    4. El sync loop la detecta y empieza a sincronizar desde Infomanager
    """
    company = await get_or_create_company(
        db=db,
        nombre=data.nombre,
        im_base_url=data.im_base_url,
        im_client_id=data.im_client_id,
        im_client_secret=data.im_client_secret,
    )
    return {
        "id": company.id,
        "nombre": company.nombre,
        "slug": company.slug,
        "db_name": company.db_url.rsplit("/", 1)[-1] if company.db_url else None,
        "im_base_url": company.im_base_url,
        "is_active": company.is_active,
        "message": f"Empresa creada. BD exclusiva 'company_{company.id}' lista. El sync arranca en los próximos minutos.",
    }


@router.get("/companies")
async def list_companies(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(Company).order_by(Company.created_at))
    companies = result.scalars().all()
    return [
        {
            "id": c.id,
            "nombre": c.nombre,
            "slug": c.slug,
            "db_name": c.db_url.rsplit("/", 1)[-1] if c.db_url else None,
            "im_base_url": c.im_base_url,
            "is_active": c.is_active,
        }
        for c in companies
    ]


@router.post("/companies/{company_id}/assign-user")
async def assign_user_to_company(
    company_id: int,
    data: AssignUserToCompany,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Asigna un usuario a una empresa para que vea sus dashboards."""
    user = await db.get(User, data.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    user.company_id = company_id
    await db.commit()
    return {"message": f"Usuario '{user.email}' asignado a '{company.nombre}'"}


@router.post("/companies/{company_id}/sync")
async def trigger_company_sync(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Dispara un sync manual para una empresa específica."""
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    if not company.db_url:
        raise HTTPException(status_code=400, detail="Empresa sin BD configurada")

    from app.integrations.infomanager.company_sync import sync_company
    try:
        result = await sync_company(company)
        return {"ok": True, "result": result}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
