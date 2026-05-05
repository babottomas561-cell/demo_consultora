from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func

from app.database import Base


class BiProduct(Base):
    __tablename__ = "bi_products"
    __table_args__ = (UniqueConstraint("source_id", "cod_articulo", name="uq_bi_products_source_product"),)

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("bi_data_sources.id"), nullable=False, index=True)
    cod_articulo = Column(Integer, nullable=False, index=True)
    descripcion = Column(String(255), nullable=False)
    descripcion_corta = Column(String(255), nullable=True)
    cod_rubro = Column(Integer, nullable=True, index=True)
    cod_subrubro = Column(Integer, nullable=True, index=True)
    cod_barra = Column(String(80), nullable=True)
    iva = Column(Float, nullable=True)
    moneda = Column(String(4), nullable=True)
    precio_compra = Column(Float, nullable=True)
    precio_venta = Column(Float, nullable=True)
    habilitado = Column(String(4), nullable=True)
    raw = Column(JSON, nullable=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
