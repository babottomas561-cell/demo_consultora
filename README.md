# demo_consultora

## Variables de entorno

Backend:

```bash
DATABASE_URL=postgresql://usuario:password@host:5432/base_central
SECRET_KEY=una_clave_larga
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENABLE_SIMULATOR=true
IM_BASE_URL=http://localhost:8000/simulator
IM_CLIENT_ID=demo_client
IM_CLIENT_SECRET=demo_secret
IM_SYNC_INTERVAL_SECONDS=150
IM_SYNC_DAYS_INITIAL=90
PORT=8000
```

Frontend:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

En Railway, `DATABASE_URL` lo inyecta Railway Postgres. Para usar el simulador integrado en el mismo servicio:

```bash
ENABLE_SIMULATOR=true
IM_BASE_URL=https://tu-app.up.railway.app/simulator
```

## Arquitectura multiempresa

La plataforma usa una base central y una base PostgreSQL por cliente.

Base central:

- `users`
- `companies`
- `tenant_databases`
- `data_sources`
- `sync_status`

Base tenant por empresa:

- `bi_sales`
- `bi_sale_items`
- `bi_customers`
- `bi_products`
- `bi_data_sources`

El nombre técnico de la base tenant se genera una sola vez al crear la empresa:

```text
company_{company_id}_{slug_limpio}
```

Ejemplo:

```text
company_12_distribuidora_san_miguel
```

Reglas del slug: minúsculas, sin acentos, sin espacios, sin símbolos raros, con `_`, y con longitud acotada.

## Crear empresa

Endpoint:

```http
POST /admin/companies
Authorization: Bearer <admin_token>
```

Payload:

```json
{
  "name": "Distribuidora San Miguel S.A.",
  "slug": "distribuidora_san_miguel",
  "cuit": "30-00000000-1",
  "rubro": "distribución",
  "source_type": "infomanager",
  "source": {
    "base_url": "http://localhost:8000/simulator",
    "client_id": "demo_client",
    "client_secret": "demo_secret"
  },
  "status": "active"
}
```

El backend:

1. Crea `companies`.
2. Genera `database_name`.
3. Intenta `CREATE DATABASE`.
4. Ejecuta migraciones BI idempotentes.
5. Guarda `tenant_databases`.
6. Guarda `data_sources`.
7. Crea `sync_status`.

Los endpoints admin nunca devuelven `client_secret`; devuelven `masked_secret`.

## Sync por empresa

Ejecutar sync manual:

```http
POST /admin/companies/{company_id}/sync
Authorization: Bearer <admin_token>
```

Estado:

```http
GET /admin/companies/{company_id}/sync-status
Authorization: Bearer <admin_token>
```

Probar fuente:

```http
POST /admin/companies/{company_id}/test-source
Authorization: Bearer <admin_token>
```

El sync resuelve la DB tenant desde `tenant_databases` y hace upsert dentro de esa base. No escribe datos BI del cliente en la base central.

## Railway y CREATE DATABASE

La creación de bases tenant usa la conexión administrativa derivada de `DATABASE_URL` y verifica si el rol PostgreSQL tiene `CREATEDB` o `SUPERUSER`.

Si Railway no permite `CREATE DATABASE` con esa conexión, el provisioning deja la empresa/tenant en `failed` y guarda el error en `tenant_databases.last_error`. No se activa fallback automático a schemas porque la arquitectura definida es una base por cliente.

## Cómo correr tests de integración

Estos tests validan el pipeline real:

`Fake Infomanager API -> backend -> sync -> PostgreSQL -> endpoints BI`

Requisitos:

- PostgreSQL real accesible por `DATABASE_URL`
- Backend corriendo con el simulador integrado habilitado en `http://localhost:8000/simulator`
- No usan SQLite ni mocks

Levantar backend con simulador integrado:

```bash
export DATABASE_URL="postgresql://usuario:password@localhost:5432/demo_consultora_test"
export SECRET_KEY="test"
export ENABLE_SIMULATOR="true"
export IM_BASE_URL="http://localhost:8000/simulator"
export IM_CLIENT_ID="demo_client"
export IM_CLIENT_SECRET="demo_secret"

uvicorn app.main:app --reload --port 8000 --app-dir backend
```

Correr tests:

```bash
export DATABASE_URL="postgresql://usuario:password@localhost:5432/demo_consultora_test"
export SECRET_KEY="test"
export IM_BASE_URL="http://localhost:8000/simulator"
export IM_CLIENT_ID="demo_client"
export IM_CLIENT_SECRET="demo_secret"

pytest backend/app/tests/integration/
```

## Simulador Infomanager integrado

El backend puede exponer el simulador de Infomanager dentro del mismo servicio bajo el prefijo `/simulator`.

- API principal: `/api/v1/...`, `/bi/status`, `/health`
- Simulador: `/simulator/api/v1/...`
- Login del simulador: `POST /simulator/api/v1/auth/login`
- Health del simulador: `GET /simulator/health`

Activar o desactivar:

```bash
ENABLE_SIMULATOR=true   # registra rutas /simulator
ENABLE_SIMULATOR=false  # no registra rutas /simulator
```

Ejemplo de uso:

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/simulator/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"client_id":"demo_client","client_secret":"demo_secret"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl http://localhost:8000/simulator/api/v1/empresas \
  -H "Authorization: Bearer $TOKEN"
```

Para que el backend consuma este simulador interno:

```bash
IM_BASE_URL=http://localhost:8000/simulator
```

En Railway, usar la URL pública del mismo servicio:

```bash
IM_BASE_URL=https://tu-app.up.railway.app/simulator
```
