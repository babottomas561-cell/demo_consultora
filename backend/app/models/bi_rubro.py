from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func

from app.database import Base


class BiRubro(Base):
    __tablename__ = "bi_rubros"
    __table_args__ = (UniqueConstraint("source_id", "cod_rubro", name="uq_bi_rubros_source"),)

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("bi_data_sources.id"), nullable=False, index=True)
    cod_rubro = Column(Integer, nullable=False, index=True)
    descripcion = Column(String(255), nullable=False)
    synced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
