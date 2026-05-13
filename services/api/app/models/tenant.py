from sqlalchemy import BigInteger, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Float, Boolean, UniqueConstraint, func
from sqlalchemy.ext.declarative import declared_attr
from app.core.database import Base

class TenantBase(Base):
    __abstract__ = True
    # Schema will be set dynamically via search_path during session

class Cliente(TenantBase):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String, unique=True, nullable=False)
    nombre = Column(String, nullable=False)
    segmento = Column(String, nullable=True)
    churn_risk = Column(Float, nullable=True)

class Venta(TenantBase):
    __tablename__ = "ventas"
    __table_args__ = (
        UniqueConstraint('fecha', 'cliente_id', 'producto_id', 'tipo_comprobante', name='idx_venta_unica'),
    )

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, nullable=False)
    cliente_id = Column(String, nullable=False)
    producto_id = Column(String, nullable=False)
    cantidad = Column(Float, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    total_real = Column(Float, nullable=True) # Deflactado
    created_at = Column(DateTime, default=func.now(), server_default=func.now(), nullable=False)
    tipo_comprobante = Column(String, default='FA', server_default='FA')
    tipo_factura = Column(String, nullable=True)
    punto_de_venta = Column(Integer, nullable=True)
    cod_vendedor = Column(Integer, nullable=True)
    cod_empresa = Column(Integer, default=1, server_default='1')
    tag = Column(String, default='S', server_default='S')
    condicion_venta_tipo = Column(Integer, nullable=True)
    neto = Column(Numeric, nullable=True)
    iva_importe = Column(Numeric, nullable=True)
    anulada = Column(String, default='N', server_default='N')
    cod_deposito = Column(Integer, nullable=True)
    cod_rubro = Column(Integer, nullable=True)
    cod_subrubro = Column(Integer, nullable=True)
    precio_compra_actual = Column(Numeric, nullable=True)
    descuento_porc = Column(Numeric, default=0, server_default='0')

class SimulationResult(TenantBase):
    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, index=True)
    params_hash = Column(String, unique=True, nullable=False)
    p10 = Column(Float)
    p25 = Column(Float)
    p50 = Column(Float)
    p75 = Column(Float)
    p90 = Column(Float)
    mean = Column(Float)
    std_dev = Column(Float)
    prob_below_zero = Column(Float)

class Compra(TenantBase):
    __tablename__ = "compras"
    __table_args__ = (
        UniqueConstraint('fecha', 'proveedor_id', 'producto_id', name='idx_compra_unica'),
    )

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, nullable=False)
    proveedor_id = Column(String, nullable=False)
    proveedor_nombre = Column(String, nullable=False)
    producto_id = Column(String, nullable=False)
    producto_nombre = Column(String, nullable=False)
    cantidad = Column(Float, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    created_at = Column(DateTime, default=func.now(), server_default=func.now(), nullable=False)

class CuentaCorrienteCliente(TenantBase):
    __tablename__ = "cuentas_corrientes_clientes"
    __table_args__ = (
        UniqueConstraint('comprobante_id', 'tipo', name='idx_cta_cte_cliente_unica'),
    )

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(String, nullable=False)
    cliente_nombre = Column(String, nullable=False)
    comprobante_id = Column(String, nullable=True) # ID o nro de factura
    tipo = Column(String, nullable=False) # factura, recibo, nota_credito
    fecha = Column(DateTime, nullable=False)
    importe = Column(Float, nullable=False) # positivo (a favor de la empresa), negativo (pagos)
    saldo_acumulado = Column(Float, nullable=False)
    fecha_vencimiento = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), server_default=func.now(), nullable=False)

class CuentaCorrienteProveedor(TenantBase):
    __tablename__ = "cuentas_corrientes_proveedores"
    __table_args__ = (
        UniqueConstraint('comprobante_id', 'tipo', name='idx_cta_cte_proveedor_unica'),
    )

    id = Column(Integer, primary_key=True, index=True)
    proveedor_id = Column(String, nullable=False)
    proveedor_nombre = Column(String, nullable=False)
    comprobante_id = Column(String, nullable=True)
    tipo = Column(String, nullable=False) # factura, pago, nota_credito
    fecha = Column(DateTime, nullable=False)
    importe = Column(Float, nullable=False) # positivo (deuda de la empresa), negativo (pagos)
    saldo_acumulado = Column(Float, nullable=False)
    fecha_vencimiento = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now(), server_default=func.now(), nullable=False)

class MovimientoCaja(TenantBase):
    __tablename__ = "movimientos_caja"
    __table_args__ = (
        UniqueConstraint('fecha', 'tipo', 'descripcion', 'importe', name='idx_movimiento_caja_unico'),
    )

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, nullable=False)
    tipo = Column(String, nullable=False) # cobro, pago, gasto
    descripcion = Column(String, nullable=True)
    importe = Column(Float, nullable=False) # positivo (ingreso), negativo (egreso)
    saldo_acumulado = Column(Float, nullable=False)
    created_at = Column(DateTime, default=func.now(), server_default=func.now(), nullable=False)

class Vendedor(TenantBase):
    __tablename__ = "vendedores"

    cod_vendedor = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    email = Column(String, nullable=True)
    habilitado = Column(Boolean, default=True, server_default='true')
    cuota_mensual = Column(Numeric, nullable=True)

class PuntoDeVenta(TenantBase):
    __tablename__ = "puntos_de_venta"

    id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    cod_empresa = Column(Integer, nullable=True)
    habilitado = Column(Boolean, default=True, server_default='true')

class Rubro(TenantBase):
    __tablename__ = "rubros"

    cod_rubro = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)

class Subrubro(TenantBase):
    __tablename__ = "subrubros"

    cod_subrubro = Column(Integer, primary_key=True)
    cod_rubro = Column(Integer, ForeignKey("rubros.cod_rubro"), nullable=True)
    nombre = Column(String, nullable=False)

class Presupuesto(TenantBase):
    __tablename__ = "presupuestos"

    id = Column(BigInteger, primary_key=True)
    fecha = Column(Date, nullable=True)
    cod_cliente = Column(Integer, nullable=True)
    cliente_nombre = Column(String, nullable=True)
    cod_vendedor = Column(Integer, nullable=True)
    total = Column(Numeric, nullable=True)
    confirmado = Column(Boolean, default=False, server_default='false')
    fecha_conversion = Column(Date, nullable=True)
    venta_id = Column(BigInteger, nullable=True)

class Recibo(TenantBase):
    __tablename__ = "recibos"

    id = Column(BigInteger, primary_key=True)
    fecha = Column(Date, nullable=True)
    cod_cliente = Column(Integer, nullable=True)
    cliente_nombre = Column(String, nullable=True)
    forma_pago = Column(String, nullable=True)
    importe = Column(Numeric, nullable=True)
    factura_id = Column(BigInteger, nullable=True)
    tarjeta_numero = Column(String, nullable=True)
    tarjeta_cupon = Column(String, nullable=True)

class Stock(TenantBase):
    __tablename__ = "stock"

    cod_articulo = Column(Integer, primary_key=True)
    cod_deposito = Column(Integer, primary_key=True)
    cantidad = Column(Numeric, nullable=True)
    stock_minimo = Column(Numeric, default=0, server_default='0')
    precio_compra_actual = Column(Numeric, nullable=True)
    ultima_actualizacion = Column(DateTime, default=func.now(), server_default=func.now())

class Deposito(TenantBase):
    __tablename__ = "depositos"

    cod_deposito = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    habilitado = Column(Boolean, default=True, server_default='true')
