from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection


CENTRAL_MIGRATIONS = [
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS name VARCHAR(255)",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS cuit VARCHAR(40)",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_type VARCHAR(120)",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active'",
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()",
    "UPDATE companies SET name = COALESCE(name, nombre) WHERE name IS NULL",
    "UPDATE companies SET status = COALESCE(status, CASE WHEN is_active THEN 'active' ELSE 'inactive' END, 'active') WHERE status IS NULL",
]


async def run_central_migrations(conn: AsyncConnection) -> None:
    for migration in CENTRAL_MIGRATIONS:
        await conn.execute(text(migration))
