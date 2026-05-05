from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func

from app.database import Base


class BiVendedor(Base):
    __tablename__ = "bi_vendedores"
    __table_args__ = (UniqueConstraint("source_id", "cod_vendedor", name="uq_bi_vendedores_source"),)

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("bi_data_sources.id"), nullable=False, index=True)
    cod_vendedor = Column(Integer, nullable=False, index=True)
    nombre = Column(String(255), nullable=False)
    habilitado = Column(String(4), nullable=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
