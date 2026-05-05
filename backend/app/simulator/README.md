# Infomanager API Simulator

Módulo interno del backend para probar el flujo de integración contra un contrato tipo Infomanager sin usar credenciales reales.

## Instalación

Desde la raíz del proyecto:

```bash
python3 -m venv .venv_fake_im
source .venv_fake_im/bin/activate
pip install -r backend/requirements.txt
```

## Correr integrado al backend

```bash
export ENABLE_SIMULATOR=true
export IM_BASE_URL=http://localhost:8000/simulator
uvicorn app.main:app --reload --port 8000 --app-dir backend
```

Las rutas quedan bajo `/simulator`:

- `POST /simulator/api/v1/auth/login`
- `GET /simulator/api/v1/empresas`
- `GET /simulator/api/v1/clientes`
- `GET /simulator/api/v1/articulos`
- `GET /simulator/api/v1/ventas`
- `GET /simulator/api/v1/ventas/items`

## Correr standalone para tests del simulador

```bash
uvicorn app.simulator.main:app --reload --port 9000 --app-dir backend
```

La API genera datos en `backend/app/simulator/generated_data/` al iniciar si los JSON no existen.
Para regenerarlos manualmente:

```bash
PYTHONPATH=backend python -c "from app.simulator.seed_data import load_data; load_data(force=True)"
```

## Credenciales demo

```json
{
  "client_id": "demo_client",
  "client_secret": "demo_secret"
}
```

El token Bearer simulado vence a las 24 horas.

## Login

```bash
curl -X POST http://localhost:8000/simulator/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"client_id":"demo_client","client_secret":"demo_secret"}'
```

Respuesta:

```json
{
  "access_token": "fake_access_token_xxx",
  "token_type": "bearer",
  "expires_in": 86400
}
```

## Endpoints

- `GET /api/v1/empresas`
- `GET /api/v1/clientes?page=1&limit=100`
- `GET /api/v1/clientes/{cod_cliente}`
- `GET /api/v1/articulos?page=1&limit=100`
- `GET /api/v1/articulos/{cod_articulo}`
- `GET /api/v1/vendedores`
- `GET /api/v1/rubros`
- `GET /api/v1/subrubros`
- `GET /api/v1/cotizaciones`
- `GET /api/v1/ventas?fechaDesde=20230101&fechaHasta=20230131&page=1&limit=100`
- `GET /api/v1/ventas/{id}`
- `GET /api/v1/ventas/items?fechaDesde=20230101&fechaHasta=20230131&page=1&limit=100`

Todos los endpoints de datos exigen:

```bash
Authorization: Bearer <token>
```

## Ejemplos

Guardar token:

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/simulator/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"client_id":"demo_client","client_secret":"demo_secret"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

Consultar empresas:

```bash
curl http://localhost:8000/simulator/api/v1/empresas \
  -H "Authorization: Bearer $TOKEN"
```

Consultar ventas por fecha:

```bash
curl "http://localhost:8000/simulator/api/v1/ventas?fechaDesde=20250101&fechaHasta=20250131&page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

Consultar ítems planos:

```bash
curl "http://localhost:8000/simulator/api/v1/ventas/items?fechaDesde=20250101&fechaHasta=20250131&page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

## Paginación

Página normal:

```bash
curl "http://localhost:8000/simulator/api/v1/clientes?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

Solo metadata de total:

```bash
curl "http://localhost:8000/simulator/api/v1/ventas/items?fechaDesde=20230101&fechaHasta=20251231&page=0&limit=0" \
  -H "Authorization: Bearer $TOKEN"
```

Respuesta:

```json
{
  "total": 12345
}
```

## Uso como IM_BASE_URL

Para probar un cliente externo contra este simulador:

```bash
IM_BASE_URL=http://localhost:8000/simulator
IM_CLIENT_ID=demo_client
IM_CLIENT_SECRET=demo_secret
```

El backend puede consumir este simulador interno usando `IM_BASE_URL` con el prefijo `/simulator`.
