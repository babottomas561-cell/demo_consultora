from sqlalchemy import Column, Float, Integer, String

from app.database import Base


class ImVentaItem(Base):
    """Ítem de un comprobante de venta. Clave para calcular margen real por artículo."""

    __tablename__ = "im_venta_items"

    id = Column(Integer, primary_key=True, index=True)
    im_id = Column(Integer, unique=True, index=True, nullable=False)       # ID del ítem en Infomanager
    im_venta_id = Column(Integer, index=True, nullable=False)              # FK a im_ventas.im_id

    cod_articulo = Column(Integer, index=True, nullable=True)
    cantidad = Column(Float, nullable=False, default=0)

    precio_orig = Column(Float, nullable=True)
    precio = Column(Float, nullable=True)                  # precio neto sin IVA
    precio_con_iva = Column(Float, nullable=True)          # precio final al cliente
    precio_compra_actual = Column(Float, nullable=True)    # costo real — base del margen

    iva_por = Column(Float, nullable=True)                 # 0, 10.5, 21, 27
    importe = Column(Float, nullable=True)                 # total del ítem
    descuento_porc = Column(Float, nullable=True)

    detalle = Column(String, nullable=True)                # descripción del artículo
