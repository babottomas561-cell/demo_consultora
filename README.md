# demo_consultora

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
