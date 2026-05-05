from sqlalchemy import JSON, Column, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func

from app.database import Base


class BiSaleItem(Base):
    __tablename__ = "bi_sale_items"
    __table_args__ = (UniqueConstraint("source_id", "source_item_id", name="uq_bi_sale_items_source_item"),)

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("bi_data_sources.id"), nullable=False, index=True)
    source_item_id = Column(Integer, nullable=False, index=True)
    source_sale_id = Column(Integer, nullable=False, index=True)
    fecha = Column(Date, nullable=True, index=True)
    cod_cliente = Column(Integer, nullable=True, index=True)
    cod_vendedor = Column(Integer, nullable=True, index=True)
    cod_empresa = Column(Integer, nullable=True, index=True)
    cod_articulo = Column(Integer, nullable=True, index=True)
    detalle = Column(String(255), nullable=True)
    cantidad = Column(Float, nullable=False, default=0)
    precio = Column(Float, nullable=True)
    precio_con_iva = Column(Float, nullable=True)
    precio_compra_actual = Column(Float, nullable=True)
    iva_por = Column(Float, nullable=True)
    importe = Column(Float, nullable=True)
    cod_barra = Column(String(80), nullable=True)
    raw = Column(JSON, nullable=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
