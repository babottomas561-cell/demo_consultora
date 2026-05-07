#!/bin/bash
set -e
echo "Running migrations..."
alembic -c migrations/central/alembic.ini upgrade head
echo "Starting API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
