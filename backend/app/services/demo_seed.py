from datetime import date, timedelta
from random import Random

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sale import Sale

CLIENT_ID = "sanmiguel"

PRODUCTS = [
    ("Yerba mate 1kg", "Almacen", 1850, 1280),
    ("Azucar 1kg", "Almacen", 980, 690),
    ("Aceite girasol 900ml", "Almacen", 1620, 1120),
    ("Fideos secos 500g", "Almacen", 760, 510),
    ("Arroz largo fino 1kg", "Almacen", 1180, 820),
    ("Gaseosa cola 2.25l", "Bebidas", 1450, 970),
    ("Agua mineral 2l", "Bebidas", 820, 530),
    ("Jugo en polvo", "Bebidas", 230, 140),
    ("Leche larga vida 1l", "Lacteos", 1120, 790),
    ("Queso cremoso kg", "Lacteos", 6200, 4650),
    ("Detergente 750ml", "Limpieza", 980, 640),
    ("Lavandina 1l", "Limpieza", 690, 420),
]

CUSTOMERS = [
    "Autoservicio El Parque",
    "Despensa La Norte",
    "Super San Martin",
    "Kiosco Plaza",
    "Mercadito Don Raul",
    "Almacen Laprida",
    "Mini Market Central",
    "Despensa Los Pinos",
    "Drugstore 24",
    "Autoservicio Belgrano",
]

SELLERS = ["Lucia", "Martin", "Carolina", "Diego"]
CITIES = ["San Miguel de Tucuman", "Yerba Buena", "Tafi Viejo", "Banda del Rio Sali"]


async def seed_demo_sales_if_empty(db: AsyncSession) -> int:
    result = await db.execute(select(func.count()).select_from(Sale).where(Sale.client_id == CLIENT_ID))
    existing = result.scalar_one()
    if existing:
        return 0

    rng = Random(20260429)
    today = date.today()
    start_date = today - timedelta(days=365)
    rows: list[Sale] = []

    for day_offset in range(366):
        current_date = start_date + timedelta(days=day_offset)
        weekday = current_date.weekday()
        month_factor = 1.18 if current_date.month in (3, 4, 8, 12) else 1.0
        weekday_factor = 0.72 if weekday == 6 else 1.12 if weekday in (4, 5) else 1.0
        daily_orders = max(4, int(rng.randint(7, 15) * month_factor * weekday_factor))

        for _ in range(daily_orders):
            product, category, base_price, base_cost = rng.choice(PRODUCTS)
            inflation_factor = 1 + (day_offset / 365) * 1.45
            price = round(base_price * inflation_factor * rng.uniform(0.96, 1.06), 2)
            cost = round(base_cost * inflation_factor * rng.uniform(0.97, 1.05), 2)
            quantity = rng.randint(2, 18)
            rows.append(
                Sale(
                    client_id=CLIENT_ID,
                    date=current_date,
                    product=product,
                    category=category,
                    quantity=quantity,
                    unit_price=price,
                    unit_cost=cost,
                    total=round(price * quantity, 2),
                    seller=rng.choice(SELLERS),
                    customer_name=rng.choice(CUSTOMERS),
                    city=rng.choice(CITIES),
                )
            )

    db.add_all(rows)
    await db.commit()
    return len(rows)
