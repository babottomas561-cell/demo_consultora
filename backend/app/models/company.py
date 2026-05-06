from sqlalchemy import Boolean, Column, DateTime, Integer, String, func

from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(80), unique=True, index=True, nullable=False)
    cuit = Column(String(40), nullable=True)
    business_type = Column(String(120), nullable=True)
    status = Column(String(30), nullable=False, default="active")
    legacy_nombre = Column("nombre", String(255), nullable=True)
    legacy_im_base_url = Column("im_base_url", String(512), nullable=True)
    legacy_im_client_id = Column("im_client_id", String(255), nullable=True)
    legacy_im_client_secret = Column("im_client_secret", String(255), nullable=True)
    legacy_db_url = Column("db_url", String(1024), nullable=True)
    legacy_is_active = Column("is_active", Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    @property
    def nombre(self) -> str:
        return self.name

    @nombre.setter
    def nombre(self, value: str) -> None:
        self.name = value
        self.legacy_nombre = value

    @property
    def is_active(self) -> bool:
        return self.status == "active"

    @is_active.setter
    def is_active(self, value: bool) -> None:
        self.status = "active" if value else "inactive"
        self.legacy_is_active = value
