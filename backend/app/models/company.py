from sqlalchemy import Boolean, Column, DateTime, Integer, String, func

from app.database import Base


class Company(Base):
    """
    Empresa cliente de la plataforma.
    Cada Company tiene sus propias credenciales de Infomanager
    y sus datos sincronizados aislados via source_id en BiDataSource.
    """

    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)

    # Credenciales Infomanager — encriptación en Fase 5 real
    im_base_url = Column(String(512), nullable=True)
    im_client_id = Column(String(255), nullable=True)
    im_client_secret = Column(String(255), nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
