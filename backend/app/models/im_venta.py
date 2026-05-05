from sqlalchemy import Column, Date, DateTime, Float, Integer, String, func

from app.database import Base


class ImVenta(Base):
    """Cabecera de comprobante de venta sincronizada desde Infomanager."""

    __tablename__ = "im_ventas"

    id = Column(Integer, primary_key=True, index=True)
    im_id = Column(Integer, unique=True, index=True, nullable=False)  # ID interno de Infomanager

    fecha = Column(Date, index=True, nullable=False)
    tipo_comprobante = Column(String(4), nullable=False)   # FA, NC, ND, PR, RE
    tipo_factura = Column(String(2), nullable=True)        # A, B, C, X
    numero = Column(Integer, nullable=True)
    punto_de_venta = Column(Integer, nullable=True)

    total = Column(Float, nullable=False, default=0)
    neto = Column(Float, nullable=True)
    iva_importe = Column(Float, nullable=True)
    no_grabado = Column(Float, nullable=True)

    cod_cliente = Column(Integer, index=True, nullable=True)
    cod_vendedor = Column(Integer, index=True, nullable=True)
    cod_empresa = Column(Integer, index=True, nullable=False)

    moneda = Column(String(2), nullable=True)
    cotizacion = Column(Float, nullable=True)
    condicion_venta_tipo = Column(Integer, nullable=True)  # 1:Efectivo 2:CC 3:Tarjeta 4:Otros

    anulada = Column(String(1), nullable=False, default="N")  # S/N

    synced_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
