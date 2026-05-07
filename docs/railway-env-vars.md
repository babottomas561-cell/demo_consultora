# Railway Environment Variables Guide

Esta es la guía de variables de entorno requeridas para el despliegue del proyecto en Railway.

## API Service (`services/api`)

- `DATABASE_URL`: (Generado automáticamente si conectas la API al servicio Postgres en Railway)
- `REDIS_URL`: (Generado automáticamente si conectas la API al servicio Redis en Railway)
- `SECRET_KEY`: String seguro para hashear los JWT (ej. genera uno con `openssl rand -hex 32`)
- `ENVIRONMENT`: `production`
- `ALGORITHM`: `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES`: `480`

## Worker Service (`services/worker`)

- `DATABASE_URL`: (Misma que la API, pero OJO: **debe usar psycopg2**, no asyncpg. Quítale el `+asyncpg` si Railway lo incluye por defecto)
- `REDIS_URL`: (Generado automáticamente conectando al mismo Redis)
- `ENVIRONMENT`: `production`

## Frontend Service (`services/frontend`)

- `VITE_API_URL`: La URL pública de la API de backend generada por Railway (ej. `https://api-service.up.railway.app`)
