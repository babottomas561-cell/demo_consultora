# demo_consultora

## Cómo correr tests de integración

Estos tests validan el pipeline real:

`Fake Infomanager API -> backend -> sync -> PostgreSQL -> endpoints BI`

Requisitos:

- PostgreSQL real accesible por `DATABASE_URL`
- Simulador Infomanager corriendo en `http://localhost:9000`
- No usan SQLite ni mocks

Levantar simulador:

```bash
uvicorn tools.simulators.infomanager_api.main:app --reload --port 9000
```

Correr tests:

```bash
export DATABASE_URL="postgresql://usuario:password@localhost:5432/demo_consultora_test"
export SECRET_KEY="test"
export IM_BASE_URL="http://localhost:9000"
export IM_CLIENT_ID="demo_client"
export IM_CLIENT_SECRET="demo_secret"

pytest backend/app/tests/integration/
```
