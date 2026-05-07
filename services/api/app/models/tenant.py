from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, UniqueConstraint, func
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
        UniqueConstraint('fecha', 'cliente_id', 'producto_id', name='idx_venta_unica'),
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
