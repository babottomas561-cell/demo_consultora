# demo_consultora — BI Engine

## Estado actual (Mayo 2026)

Sistema SaaS de Business Intelligence deployado en producción en Railway.
Multi-tenant con PostgreSQL schemas, auth JWT y paneles analíticos con filtros globales de fecha.

### URLs de producción

- **Frontend:** https://frontend-production-0ec5.up.railway.app
- **API:** https://api-production-26e7.up.railway.app
- **API Docs:** https://api-production-26e7.up.railway.app/docs

### Paneles implementados

| # | Panel | Ruta | Descripción |
|---|-------|------|-------------|
| 1 | Dashboard | `/dashboard` | KPIs generales del tenant |
| 2 | Ventas | `/analytics/ventas` | Facturación, top productos, top clientes, ticket promedio |
| 3 | Compras | `/analytics/compras` | Costo mercadería, ratio compra/venta, top proveedores |
| 4 | Resultado | `/analytics/resultado` | Margen bruto, ingresos vs costos vs gastos |
| 5 | Stock | `/analytics/stock` | Inventario estimado por producto |
| 6 | Vendedores | `/analytics/vendedores` | Ranking por facturación |
| 7 | Clientes / Cta Cte | `/analytics/clientes` | Saldos, aging de deuda, estado por cliente |
| 8 | Proveedores / Cta Cte | `/analytics/proveedores` | Saldos, próximos vencimientos 30 días |
| 9 | Caja | `/analytics/caja` | Flujo de cobros y pagos, saldo acumulado |

### Features implementadas

- Multi-tenant con PostgreSQL schemas (Alembic migrations por tenant)
- Auth JWT (primer usuario = admin automático)
- Filtros globales de fecha estilo Power BI (Hoy / Semana / Mes / Trimestre / Año / Custom)
- Datos demo de comercio de indumentaria (tenant_demo1, tenant_demo2)
- Sincronización de Excel con bulk insert
- Deploy automático desde GitHub → Railway
- Gráficos Recharts con ejes legibles ($1.2M, $450K) y tooltips formateados
- Donut de aging de deuda, badges de estado, barras de progreso

### Stack técnico

- **Backend:** Python 3.11 + FastAPI + SQLAlchemy async + Alembic
- **Frontend:** React 18 + Vite + Recharts + Zustand + TailwindCSS
- **DB:** PostgreSQL 15 (Railway)
- **Worker:** Celery + Redis
- **Deploy:** Railway (auto-deploy on push to main)

### Próximos pasos

- [ ] Conector real Infomanager (client_id + client_secret)
- [ ] Panel Contexto Macro (BCRA + INDEC APIs)
- [ ] Filtros cruzados por cliente/producto/vendedor
- [ ] Login con Google OAuth
- [ ] Panel Presupuestos
- [ ] Export a PDF/Excel

---

## Comandos útiles

### Correr seed en Railway

```bash
DATABASE_URL="postgresql://postgres:rGwnkEpjfQbQKsTIgERKfXqMyyahwUsU@trolley.proxy.rlwy.net:41729/railway" \
.venv/bin/python scripts/seed_demo.py tenant_demo1
```

### Correr migraciones en Railway

```bash
DATABASE_URL="postgresql://postgres:rGwnkEpjfQbQKsTIgERKfXqMyyahwUsU@trolley.proxy.rlwy.net:41729/railway" \
PYTHONPATH=. .venv/bin/python \
-m alembic -c services/api/migrations/tenant/alembic.ini \
-x tenant=tenant_demo1 upgrade head
```

### Desarrollo local

```bash
# Levantar servicios
docker-compose up -d

# API
cd services/api && uvicorn app.main:app --reload --port 8000

# Worker
cd services/worker && celery -A worker_app.celery_app worker

# Frontend
cd services/frontend && npm run dev
```

### Historial reciente

```
56fe500 feat: global date filter bar Power BI style
c57d60e fix: stock inicial estimado y tooltip margen porcentaje
c8e65be feat: improve all analytics panels + add stock and vendedores panels
94eeb97 feat: add producto_nombre and cliente_nombre to ventas table
f5292b0 fix: remove non-existent producto_nombre column from ventas query
8249e2d fix: trigger new Railway deploy after auth fix
1287617 feat: 6 analytics panels with demo data
d6e3ee2 feat: implement active company selector for admin dashboard
```
