from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from app.database import Base


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    source_type = Column(String(40), nullable=False)
    name = Column(String(120), nullable=False)
    base_url = Column(String(512), nullable=True)
    client_id = Column(String(255), nullable=True)
    client_secret = Column(String(1024), nullable=True)
    status = Column(String(30), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_test_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(String, nullable=True)
