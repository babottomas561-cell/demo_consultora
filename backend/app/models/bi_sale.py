from sqlalchemy import JSON, Column, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func

from app.database import Base


class BiSale(Base):
    __tablename__ = "bi_sales"
    __table_args__ = (UniqueConstraint("source_id", "source_sale_id", name="uq_bi_sales_source_sale"),)

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("bi_data_sources.id"), nullable=False, index=True)
    source_sale_id = Column(Integer, nullable=False, index=True)
    fecha = Column(Date, nullable=False, index=True)
    tipo_comprobante = Column(String(8), nullable=True)
    tipo_factura = Column(String(4), nullable=True)
    numero = Column(Integer, nullable=True)
    punto_de_venta = Column(Integer, nullable=True)
    total = Column(Float, nullable=False, default=0)
    neto = Column(Float, nullable=True)
    iva_importe = Column(Float, nullable=True)
    cod_cliente = Column(Integer, nullable=True, index=True)
    cod_vendedor = Column(Integer, nullable=True, index=True)
    cod_empresa = Column(Integer, nullable=True, index=True)
    moneda = Column(String(4), nullable=True)
    cotizacion = Column(Float, nullable=True)
    anulada = Column(String(4), nullable=True)
    raw = Column(JSON, nullable=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
