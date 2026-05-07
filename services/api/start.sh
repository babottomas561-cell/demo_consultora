#!/bin/bash
echo "Running migrations..."
alembic -c migrations/central/alembic.ini upgrade head
echo "Starting API..."
uvicorn app.main:app --host 0.0.0.0 --port 8000
