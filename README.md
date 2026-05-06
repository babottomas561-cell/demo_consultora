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
