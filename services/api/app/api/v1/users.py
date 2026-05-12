from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.central import User, Company
from app.schemas.user import UserCreateAdmin, UserUpdate, UserResponse
from app.api.deps import get_current_admin

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
async def list_users(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).filter(User.company_id == company_id))
    return result.scalars().all()


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user_in: UserCreateAdmin,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    company = await db.get(Company, user_in.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    existing = await db.execute(select(User).filter(User.email == user_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_admin=user_in.is_admin,
        company_id=user_in.company_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if user_in.email is not None:
        existing = await db.execute(
            select(User).filter(User.email == user_in.email, User.id != user_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="El email ya está en uso")
        user.email = user_in.email

    if user_in.password is not None:
        user.hashed_password = get_password_hash(user_in.password)

    if user_in.is_admin is not None:
        user.is_admin = user_in.is_admin

    if user_in.company_id is not None:
        company = await db.get(Company, user_in.company_id)
        if not company:
            raise HTTPException(status_code=404, detail="Empresa no encontrada")
        user.company_id = user_in.company_id

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    if current_admin.id == user_id:
        raise HTTPException(status_code=400, detail="No podés eliminar tu propio usuario")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    await db.delete(user)
    await db.commit()
