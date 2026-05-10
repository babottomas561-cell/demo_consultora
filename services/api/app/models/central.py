from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint, func
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    tenant_schema = Column(String, unique=True, nullable=False)
    is_provisioned = Column(Boolean, default=False)
    erp_type = Column(String, nullable=False)
    erp_config = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="company")
    connectors = relationship("CompanyConnector", back_populates="company", cascade="all, delete-orphan")


class CompanyConnector(Base):
    __tablename__ = "company_connectors"
    __table_args__ = (
        UniqueConstraint("company_id", "connector_type", name="uq_company_connector_type"),
        {"schema": "public"},
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("public.companies.id", ondelete="CASCADE"), nullable=False, index=True)
    connector_type = Column(String, default="INFOMANAGER", nullable=False)
    client_id = Column(String, nullable=False)
    client_secret = Column(String, nullable=False)
    access_token = Column(String, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    base_url = Column(String, default="https://impedidos.infomanager.com.ar", nullable=False)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    sync_status = Column(String, default="pending", nullable=False)
    sync_error = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=lambda: datetime.now(timezone.utc))

    company = relationship("Company", back_populates="connectors")

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    company_id = Column(Integer, ForeignKey("public.companies.id"), nullable=True)

    company = relationship("Company", back_populates="users")
    saved_views = relationship("SavedView", back_populates="user", cascade="all, delete-orphan")


class SavedView(Base):
    __tablename__ = "saved_views"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("public.users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    panel = Column(String, nullable=True)
    filters = Column(JSON, nullable=False)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="saved_views")
