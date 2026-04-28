from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr  # Pydantic valida que sea un email válido antes de llegar al router
    password: str    # Texto plano — auth_service la hashea, nunca se guarda así


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    is_active: bool
    created_at: datetime
    # hashed_password ausente — nunca se expone en ninguna respuesta

    model_config = {"from_attributes": True}  # Permite leer desde objetos SQLAlchemy


class Token(BaseModel):
    access_token: str
    token_type: str  # Siempre "bearer" — es el estándar OAuth2
