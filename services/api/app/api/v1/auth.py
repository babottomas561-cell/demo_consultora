from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.central import User, Company
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    result = await db.execute(select(User).filter(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if this is the first user in the database
    count_result = await db.execute(select(func.count()).select_from(User))
    user_count = count_result.scalar()
    
    is_admin = (user_count == 0) # True if first user, False otherwise

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_admin=is_admin
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == user_in.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    tenant_schema = None
    if user.company_id:
        company_result = await db.execute(select(Company).filter(Company.id == user.company_id))
        company = company_result.scalar_one_or_none()
        if company:
            tenant_schema = company.tenant_schema

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "is_admin": user.is_admin,
            "company_id": user.company_id,
            "tenant_schema": tenant_schema
        }
    )
    return {"access_token": access_token, "token_type": "bearer"}
