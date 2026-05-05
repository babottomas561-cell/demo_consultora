from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint, func

from app.database import Base


class BiDataSource(Base):
    __tablename__ = "bi_data_sources"
    __table_args__ = (UniqueConstraint("name", name="uq_bi_data_sources_name"),)

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False)
    source_type = Column(String(40), nullable=False)
    base_url = Column(String(255), nullable=True)
    status = Column(String(30), nullable=False, default="active")
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
