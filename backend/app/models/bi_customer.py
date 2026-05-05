from sqlalchemy import JSON, Column, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint, func

from app.database import Base


class BiCustomer(Base):
    __tablename__ = "bi_customers"
    __table_args__ = (UniqueConstraint("source_id", "cod_cliente", name="uq_bi_customers_source_customer"),)

    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("bi_data_sources.id"), nullable=False, index=True)
    cod_cliente = Column(Integer, nullable=False, index=True)
    nombre = Column(String(255), nullable=False)
    razon_social = Column(String(255), nullable=True)
    categoria_iva = Column(String(20), nullable=True)
    cuit = Column(String(40), nullable=True)
    email = Column(String(255), nullable=True)
    cod_vendedor = Column(Integer, nullable=True, index=True)
    lista_precio = Column(Integer, nullable=True)
    domicilio = Column(String(255), nullable=True)
    telefonos = Column(String(120), nullable=True)
    condicion_venta = Column(Integer, nullable=True)
    fecha_alta = Column(Date, nullable=True)
    raw = Column(JSON, nullable=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
