from sqlalchemy import Boolean, Column, DateTime, Integer, String, func

from app.database import Base


class Company(Base):
    """
    Empresa cliente de la plataforma.
    Cada Company tiene:
    - Sus propias credenciales de Infomanager
    - Un schema PostgreSQL exclusivo (company_{id}) con sus tablas BI
    """

    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    slug = Column(String(64), unique=True, index=True, nullable=False)  # para el nombre del schema

    # Credenciales Infomanager de esta empresa
    im_base_url = Column(String(512), nullable=True)
    im_client_id = Column(String(255), nullable=True)
    im_client_secret = Column(String(255), nullable=True)

    # Schema PostgreSQL asignado: "company_{id}"
    db_schema = Column(String(128), nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
