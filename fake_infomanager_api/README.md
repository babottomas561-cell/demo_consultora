# Fake Infomanager API

API local para probar el flujo de integración contra un contrato tipo Infomanager sin usar credenciales reales.

## Instalación

Desde la raíz del proyecto:

```bash
python3 -m venv .venv_fake_im
source .venv_fake_im/bin/activate
pip install -r fake_infomanager_api/requirements.txt
```

## Correr la API

```bash
uvicorn fake_infomanager_api.main:app --reload --port 9000
```

La API genera datos en `fake_infomanager_api/generated_data/` al iniciar si los JSON no existen.
Para regenerarlos manualmente:

```bash
python -c "from fake_infomanager_api.seed_data import load_data; load_data(force=True)"
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
curl -X POST http://localhost:9000/api/v1/auth/login \
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
TOKEN=$(curl -s -X POST http://localhost:9000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"client_id":"demo_client","client_secret":"demo_secret"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

Consultar empresas:

```bash
curl http://localhost:9000/api/v1/empresas \
  -H "Authorization: Bearer $TOKEN"
```

Consultar ventas por fecha:

```bash
curl "http://localhost:9000/api/v1/ventas?fechaDesde=20250101&fechaHasta=20250131&page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

Consultar ítems planos:

```bash
curl "http://localhost:9000/api/v1/ventas/items?fechaDesde=20250101&fechaHasta=20250131&page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

## Paginación

Página normal:

```bash
curl "http://localhost:9000/api/v1/clientes?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

Solo metadata de total:

```bash
curl "http://localhost:9000/api/v1/ventas/items?fechaDesde=20230101&fechaHasta=20251231&page=0&limit=0" \
  -H "Authorization: Bearer $TOKEN"
```

Respuesta:

```json
{
  "total": 12345
}
```

## Uso como IM_BASE_URL

Para probar un cliente externo contra esta fake API:

```bash
IM_BASE_URL=http://localhost:9000
IM_CLIENT_ID=demo_client
IM_CLIENT_SECRET=demo_secret
```

Esta fase no conecta todavía el backend principal ni crea tablas BI. Solo expone una API local externa con autenticación, paginación y datos simulados de 36 meses.
