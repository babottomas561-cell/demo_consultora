from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func

from app.database import Base


class SyncStatus(Base):
    __tablename__ = "sync_status"
    __table_args__ = (UniqueConstraint("company_id", "source_id", name="uq_sync_status_company_source"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    source_id = Column(Integer, ForeignKey("data_sources.id"), nullable=False, index=True)
    status = Column(String(30), nullable=False, default="idle")
    last_sync_started_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_finished_at = Column(DateTime(timezone=True), nullable=True)
    last_successful_sync_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(String, nullable=True)
    sales_count = Column(Integer, nullable=False, default=0)
    items_count = Column(Integer, nullable=False, default=0)
    customers_count = Column(Integer, nullable=False, default=0)
    products_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
