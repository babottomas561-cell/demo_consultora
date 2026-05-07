# demo_consultora

SaaS de Business Intelligence y Motor de Decisión Financiera.
Se conecta a ERPs de empresas (Infomanager, Tango, Excel, SQL directo),
extrae datos transaccionales y los procesa con modelos econométricos y de ML
para mostrar un dashboard de toma de decisiones.

## Stack tecnológico
- Backend: Python 3.11 + FastAPI + SQLAlchemy async (asyncpg)
- Worker: Celery + Redis
- Frontend: React 18 + Vite + Zustand + Recharts
- Base de datos: PostgreSQL
- Deploy: Railway (5 servicios)

## Arquitectura multi-tenant
Cada cliente del SaaS tiene su propio schema de PostgreSQL aislado.
Cuando el admin registra una empresa nueva, el sistema crea automáticamente
un schema dedicado (ej: `tenant_distribuidora_juarez`) dentro de la misma base de datos.

### Schemas en la DB:
- `public` → datos administrativos (users, companies)
- `tenant_N` → datos exclusivos de cada cliente (ventas, clientes, simulation_results)

## Migraciones con Alembic (Local y Desarrollo)

Dado que utilizamos una arquitectura Multi-Tenant con Schemas, hay **DOS** entornos de migración aislados:

### 1. Migraciones Centrales (Schema: `public`)
Se corren una sola vez al configurar el proyecto o cuando se modifican los modelos `central.py`.

```bash
# Correr las migraciones para crear las tablas base
PYTHONPATH=services/api alembic -c infra/migrations/central/alembic.ini upgrade head

# Autogenerar una nueva migración si cambiaste models/central.py
PYTHONPATH=services/api alembic -c infra/migrations/central/alembic.ini revision --autogenerate -m "nombre_del_cambio"
```

### 2. Migraciones Tenant (Schema: `tenant_N`)
Las migraciones tenant se ejecutan **automáticamente** por el backend cuando llamas a `POST /api/v1/companies`. El backend se encarga de crear el schema y correr la migración.

Si necesitas correr una migración tenant **manualmente** para un cliente específico:
```bash
# Correr migración en un tenant en particular
PYTHONPATH=services/api alembic -c infra/migrations/tenant/alembic.ini -x tenant=tenant_distribuidora_juarez upgrade head

# Autogenerar una nueva migración si cambiaste models/tenant.py
# (Necesitas un schema de prueba creado en la DB, por ejemplo 'public' o 'test_tenant')
PYTHONPATH=services/api alembic -c infra/migrations/tenant/alembic.ini -x tenant=public revision --autogenerate -m "agregue_columna_ventas"
```
