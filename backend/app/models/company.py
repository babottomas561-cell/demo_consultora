from sqlalchemy import Boolean, Column, DateTime, Integer, String, func

from app.database import Base


class Company(Base):
    """
    Empresa cliente de la plataforma.
    Cada Company tiene:
    - Sus propias credenciales de Infomanager (fuente de datos)
    - Su propia base de datos PostgreSQL (db_url)
    """

    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    slug = Column(String(64), unique=True, index=True, nullable=False)

    # Credenciales Infomanager de esta empresa
    im_base_url = Column(String(512), nullable=True)
    im_client_id = Column(String(255), nullable=True)
    im_client_secret = Column(String(255), nullable=True)

    # URL de la base de datos exclusiva de esta empresa
    # Ejemplo: postgresql://user:pass@host:5432/company_1
    db_url = Column(String(512), nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
