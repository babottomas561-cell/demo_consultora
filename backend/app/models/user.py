import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, func

from app.database import Base


class UserRole(enum.Enum):
    admin = "admin"
    cliente = "cliente"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # PostgreSQL crea un tipo ENUM nativo — solo acepta "admin" o "cliente".
    role = Column(Enum(UserRole), nullable=False, default=UserRole.cliente)

    # False deshabilita el acceso sin borrar el usuario ni su historial.
    is_active = Column(Boolean, nullable=False, default=True)

    # server_default delega el timestamp a PostgreSQL, no a Python.
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
