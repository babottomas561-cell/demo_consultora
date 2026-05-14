# Infomanager Drilldown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add document-level traceability for customer/provider balances, payments applied to invoices, seller commissions on collected amounts, and keep Railway tenant data backfilled.

**Architecture:** Reuse existing tenant schema and analytics panel patterns. Add normalized tenant tables for customer documents, customer payments, provider documents, provider payments, and seller commissions; sync them from real Infomanager report endpoints and expose dedicated analytics endpoints/widgets.

**Tech Stack:** FastAPI, SQLAlchemy/Alembic, psycopg2 worker, React/Vite/Zustand, Railway Postgres.

---

### Task 1: Tenant document schema

**Files:**
- Create: `services/api/migrations/tenant/versions/2026_5_13_2100-g1h2i3j4k5l6_add_infomanager_document_drilldown.py`
- Modify: `services/api/app/models/tenant.py`
- Test: `services/api/tests/test_tenant_analytics_models.py`

- [ ] Add failing tests asserting tables exist and contain unique constraints for customer/provider documents and payment allocations.
- [ ] Add SQLAlchemy models and Alembic migration.
- [ ] Run `pytest services/api/tests/test_tenant_analytics_models.py -q`.

### Task 2: Infomanager mapping

**Files:**
- Modify: `services/worker/connectors/infomanager.py`
- Modify: `services/worker/tasks/sync_infomanager.py`
- Test: `services/worker/tests/test_infomanager_connector.py`

- [ ] Add failing connector tests for pending customer documents, paid customer documents, provider documents, and seller commission aggregation.
- [ ] Map `/api/v1/reportes/comprob_pendientes_clientes`, `/api/v1/reportes/facturas_con_recibos`, and `/api/v1/reportes/facturas_compras`.
- [ ] Insert/upsert the new rows during `sync_company`.
- [ ] Run `pytest services/worker/tests -q`.

### Task 3: Analytics endpoints

**Files:**
- Modify: `services/api/app/api/v1/analytics.py`
- Test: `services/api/tests/test_analytics_routes.py`

- [ ] Add route registration tests for `/clientes/{id}/comprobantes`, `/proveedores/{id}/comprobantes`, and `/vendedores/comisiones`.
- [ ] Return document rows with nested payments and totals.
- [ ] Run API tests.

### Task 4: Frontend widgets

**Files:**
- Create widgets under `services/frontend/src/features/analytics/clientes/widgets`, `proveedores/widgets`, `vendedores/widgets`.
- Modify widget catalog `index.js` files.
- Modify data contexts to fetch lazy drilldown/comissions endpoints.

- [ ] Add widgets to catalogs so the editor can add them.
- [ ] Render tables with expandable or compact document/payment rows.
- [ ] Run `npm run build`.

### Task 5: Railway backfill

**Files:**
- No committed file required unless adding a reusable script is simpler.

- [ ] Apply tenant migration to every provisioned tenant.
- [ ] Run targeted backfill for every Infomanager connector, including `Test IMP 02`.
- [ ] Verify counts and sample data in Railway Postgres.

### Task 6: Final verification

- [ ] Run `pytest services/api/tests services/worker/tests -q`.
- [ ] Run `npm run build`.
- [ ] Commit and push to `main`.
