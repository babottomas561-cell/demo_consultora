from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func

from app.database import Base


class TenantDatabase(Base):
    __tablename__ = "tenant_databases"
    __table_args__ = (
        UniqueConstraint("company_id", name="uq_tenant_databases_company_id"),
        UniqueConstraint("database_name", name="uq_tenant_databases_database_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    database_name = Column(String(120), nullable=False)
    database_url = Column(String(1024), nullable=False)
    status = Column(String(30), nullable=False, default="provisioning")
    last_error = Column(String, nullable=True)
    last_migration_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
