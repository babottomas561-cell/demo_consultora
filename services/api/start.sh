#!/bin/bash
set -e

echo "Running central migrations..."
alembic -c migrations/central/alembic.ini upgrade head

echo "Running tenant migrations for all company schemas..."
# Query all tenant schemas and apply migrations for each
python3 - <<'PYEOF'
import os
import subprocess
import psycopg2

db_url = os.environ.get("DATABASE_URL", "")
if not db_url:
    print("No DATABASE_URL — skipping tenant migrations")
    raise SystemExit(0)

# Convert asyncpg URL to sync psycopg2 URL if needed
sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

try:
    conn = psycopg2.connect(sync_url)
    cur = conn.cursor()
    cur.execute("SELECT tenant_schema FROM public.companies WHERE tenant_schema IS NOT NULL")
    schemas = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
except Exception as e:
    print(f"Could not query tenant schemas: {e}")
    raise SystemExit(0)

print(f"Found {len(schemas)} tenant schemas: {schemas}")
for schema in schemas:
    print(f"  Migrating schema: {schema}")
    result = subprocess.run(
        ["alembic", "-c", "migrations/tenant/alembic.ini", "-x", f"tenant={schema}", "upgrade", "head"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  WARNING: migration failed for {schema}: {result.stderr}")
    else:
        print(f"  OK: {schema}")

PYEOF

echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
