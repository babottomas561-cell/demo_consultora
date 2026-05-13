#!/bin/bash
set -e

echo "Running central migrations..."
alembic -c migrations/central/alembic.ini upgrade head

echo "Running tenant migrations for all company schemas..."
python3 - <<'PYEOF'
import asyncio
import os
import subprocess

db_url = os.environ.get("DATABASE_URL", "")
if not db_url:
    print("No DATABASE_URL — skipping tenant migrations")
    raise SystemExit(0)

# Convert to asyncpg-compatible URL
async_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
# Also need plain asyncpg URL (without +asyncpg for asyncpg.connect)
pg_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)

async def get_schemas():
    try:
        import asyncpg
        conn = await asyncpg.connect(pg_url)
        rows = await conn.fetch("SELECT tenant_schema FROM public.companies WHERE tenant_schema IS NOT NULL")
        await conn.close()
        return [r["tenant_schema"] for r in rows]
    except Exception as e:
        print(f"Could not query tenant schemas: {e}")
        return []

schemas = asyncio.run(get_schemas())
print(f"Found {len(schemas)} tenant schemas: {schemas}")

for schema in schemas:
    print(f"  Migrating schema: {schema}")
    result = subprocess.run(
        ["alembic", "-c", "migrations/tenant/alembic.ini", "-x", f"tenant={schema}", "upgrade", "head"],
        capture_output=True, text=True,
        cwd="/app"
    )
    if result.returncode != 0:
        print(f"  WARNING: migration failed for {schema}:\n{result.stderr}")
    else:
        out = result.stdout.strip()
        print(f"  OK: {schema}" + (f" — {out.split(chr(10))[-1]}" if out else ""))

PYEOF

echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
