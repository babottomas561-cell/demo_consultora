from sqlalchemy import Column, Date, DateTime, Float, Integer, String, func

from app.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String, index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    product = Column(String, index=True, nullable=False)
    category = Column(String, index=True, nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    unit_cost = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    seller = Column(String, index=True, nullable=False)
    customer_name = Column(String, index=True, nullable=False)
    city = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
