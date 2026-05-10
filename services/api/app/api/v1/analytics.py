import io
from datetime import date, timedelta
from io import BytesIO
from typing import Optional, Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.v1.dashboard import get_tenant_schema
from app.core.database import get_db
from app.core.filters import GlobalFilters, get_global_filters, text_filter_clause


router = APIRouter()


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _prev_period(filters: GlobalFilters):
    length = (filters.hasta - filters.desde).days
    prev_hasta = filters.desde - timedelta(days=1)
    prev_desde = prev_hasta - timedelta(days=length)
    return prev_desde, prev_hasta + timedelta(days=1)


def _ventas_base_where(filters: GlobalFilters) -> str:
    """Base WHERE for ventas (dates + all array filters + anulada)."""
    return text_filter_clause("ventas", filters)


def _var_pct(actual: float, anterior: float) -> Optional[float]:
    if anterior and anterior != 0:
        return round((actual - anterior) / abs(anterior) * 100, 2)
    return None


def _kpi_obj(actual: float, anterior: Optional[float] = None):
    return {
        "actual": round(actual, 2),
        "anterior": round(anterior, 2) if anterior is not None else None,
        "variacion_pct": _var_pct(actual, anterior) if anterior is not None else None,
    }


async def _fetch_kpi_row(db: AsyncSession, where: str, params: dict) -> dict:
    row = (await db.execute(text(f"""
        SELECT
            COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN total ELSE 0 END),0)            AS fa_bruto,
            COALESCE(SUM(CASE WHEN tipo_comprobante IN ('NC','ND') THEN ABS(total) ELSE 0 END),0) AS nc_total,
            COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN COALESCE(neto::float, total/1.21) ELSE 0 END),0) AS neto_fa,
            COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN COALESCE(iva_importe::float,0) ELSE 0 END),0) AS iva_debito,
            COUNT(CASE WHEN tipo_comprobante='FA' THEN 1 END)                                 AS tickets,
            COUNT(DISTINCT CASE WHEN tipo_comprobante='FA' THEN cliente_id END)               AS clientes_unicos,
            COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN cantidad ELSE 0 END),0)         AS unidades,
            COALESCE(SUM(
              CASE WHEN precio_compra_actual IS NOT NULL
                   THEN (precio_unitario - precio_compra_actual::float) * cantidad
              ELSE 0 END),0)                                                                   AS margen_dolares,
            COALESCE(SUM(
              CASE WHEN precio_compra_actual IS NOT NULL THEN total ELSE 0 END),0)             AS total_con_costo
        FROM ventas
        WHERE {where}
    """), params)).mappings().one()
    return dict(row)


def quote_schema(schema_name: str) -> str:
    return '"' + schema_name.replace('"', '""') + '"'


async def set_tenant_search_path(db: AsyncSession, tenant_schema: str) -> None:
    await db.execute(text(f"SET search_path TO {quote_schema(tenant_schema)}"))


def money(value) -> float:
    return float(value or 0)


def resolve_dates(desde: Optional[str], hasta: Optional[str]):
    """Backward-compatible helper for tests and older callers."""
    hasta_d = date.fromisoformat(hasta) if hasta else date.today()
    desde_d = date.fromisoformat(desde) if desde else date.today() - timedelta(days=365)
    return desde_d, hasta_d + timedelta(days=1)


def previous_period_params(filters: GlobalFilters) -> dict:
    current_days = (filters.hasta_exclusive - filters.desde).days
    prev_hasta = filters.desde
    prev_desde = prev_hasta - timedelta(days=current_days)
    return {"prev_desde": prev_desde, "prev_hasta": prev_hasta, "offset_days": current_days}


def variation_payload(actual, anterior=None) -> dict:
    actual_value = money(actual)
    anterior_value = money(anterior)
    payload = {"actual": actual_value, "anterior": anterior_value}
    payload["variacion_pct"] = ((actual_value - anterior_value) / abs(anterior_value) * 100) if anterior_value else None
    return payload


def compra_filters_clause(
    filters: GlobalFilters,
    start_param: str = "desde",
    end_param: str = "hasta",
    include_provider: bool = False,
) -> str:
    clauses = [f"fecha >= :{start_param}", f"fecha < :{end_param}"]
    if filters.cod_articulo:
        clauses.append("producto_id = ANY(:cod_articulo_text)")
    if include_provider and filters.cod_cliente:
        clauses.append("proveedor_id = ANY(:proveedor_id_text)")
    return " AND ".join(clauses)


def compra_params(filters: GlobalFilters) -> dict:
    params = filters.sql_params()
    params["cod_articulo_text"] = [str(item) for item in filters.cod_articulo or []]
    params["proveedor_id_text"] = [str(item) for item in filters.cod_cliente or []]
    return params


def granularity_sql(granularidad: str) -> str:
    return {
        "dia": "day",
        "semana": "week",
        "mes": "month",
        "trimestre": "quarter",
    }.get(granularidad, "month")


async def query_compras_kpis(db: AsyncSession, filters: GlobalFilters) -> dict:
    params = {**compra_params(filters), **previous_period_params(filters), "today": date.today(), "today_30": date.today() + timedelta(days=30)}
    current_where = compra_filters_clause(filters)
    previous_where = compra_filters_clause(filters, "prev_desde", "prev_hasta")

    totals = (await db.execute(text(f"""
        WITH actual AS (
            SELECT
                COALESCE(SUM(total), 0) AS total_comprado,
                COALESCE(SUM(total * 0.21 / 1.21), 0) AS iva_credito_fiscal,
                COUNT(*) AS ordenes,
                COALESCE(SUM(cantidad), 0) AS unidades_compradas,
                COUNT(DISTINCT proveedor_id) AS proveedores_activos,
                CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(total), 0) / COUNT(*) ELSE 0 END AS ticket_promedio_compra
            FROM compras
            WHERE {current_where}
        ),
        anterior AS (
            SELECT
                COALESCE(SUM(total), 0) AS total_comprado,
                COALESCE(SUM(total * 0.21 / 1.21), 0) AS iva_credito_fiscal,
                COUNT(*) AS ordenes,
                COALESCE(SUM(cantidad), 0) AS unidades_compradas,
                COUNT(DISTINCT proveedor_id) AS proveedores_activos,
                CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(total), 0) / COUNT(*) ELSE 0 END AS ticket_promedio_compra
            FROM compras
            WHERE {previous_where}
        )
        SELECT actual.*, anterior.total_comprado AS total_comprado_anterior,
               anterior.iva_credito_fiscal AS iva_credito_fiscal_anterior,
               anterior.ordenes AS ordenes_anterior,
               anterior.unidades_compradas AS unidades_compradas_anterior,
               anterior.proveedores_activos AS proveedores_activos_anterior,
               anterior.ticket_promedio_compra AS ticket_promedio_compra_anterior
        FROM actual, anterior
    """), params)).mappings().one()

    deuda = (await db.execute(text("""
        SELECT COALESCE(SUM(GREATEST(saldo_acumulado, importe, 0)), 0) AS deuda_vencida
        FROM cuentas_corrientes_proveedores
        WHERE lower(tipo) IN ('factura', 'fc')
          AND fecha_vencimiento < :today
          AND saldo_acumulado > 0
    """), params)).mappings().one()

    proximos = (await db.execute(text("""
        SELECT COALESCE(SUM(GREATEST(saldo_acumulado, importe, 0)), 0) AS proximos_vencimientos_30d
        FROM cuentas_corrientes_proveedores
        WHERE lower(tipo) IN ('factura', 'fc')
          AND fecha_vencimiento >= :today
          AND fecha_vencimiento < :today_30
          AND saldo_acumulado > 0
    """), params)).mappings().one()

    return {
        "total_comprado": variation_payload(totals["total_comprado"], totals["total_comprado_anterior"]),
        "iva_credito_fiscal": variation_payload(totals["iva_credito_fiscal"], totals["iva_credito_fiscal_anterior"]),
        "ordenes": variation_payload(totals["ordenes"], totals["ordenes_anterior"]),
        "unidades_compradas": variation_payload(totals["unidades_compradas"], totals["unidades_compradas_anterior"]),
        "proveedores_activos": variation_payload(totals["proveedores_activos"], totals["proveedores_activos_anterior"]),
        "ticket_promedio_compra": variation_payload(totals["ticket_promedio_compra"], totals["ticket_promedio_compra_anterior"]),
        "deuda_vencida": {"actual": money(deuda["deuda_vencida"])},
        "proximos_vencimientos_30d": {"actual": money(proximos["proximos_vencimientos_30d"])},
    }


async def query_compras_temporal(db: AsyncSession, filters: GlobalFilters, granularidad: str = "mes") -> list[dict]:
    params = {**compra_params(filters), **previous_period_params(filters)}
    period = granularity_sql(granularidad)
    current_where = compra_filters_clause(filters)
    previous_where = compra_filters_clause(filters, "prev_desde", "prev_hasta")
    rows = (await db.execute(text(f"""
        WITH actual AS (
            SELECT date_trunc('{period}', fecha)::date AS periodo,
                   COALESCE(SUM(total), 0) AS total_comprado,
                   COUNT(*) AS ordenes
            FROM compras
            WHERE {current_where}
            GROUP BY 1
        ),
        anterior AS (
            SELECT date_trunc('{period}', fecha + (:offset_days * interval '1 day'))::date AS periodo,
                   COALESCE(SUM(total), 0) AS total_comprado_anterior
            FROM compras
            WHERE {previous_where}
            GROUP BY 1
        )
        SELECT actual.periodo,
               actual.total_comprado,
               actual.ordenes,
               COALESCE(anterior.total_comprado_anterior, 0) AS total_comprado_anterior
        FROM actual
        LEFT JOIN anterior USING (periodo)
        ORDER BY actual.periodo
    """), params)).mappings().all()
    return [{**dict(row), "periodo": row["periodo"].isoformat()} for row in rows]


async def query_compras_por_producto(db: AsyncSession, filters: GlobalFilters) -> list[dict]:
    params = compra_params(filters)
    where = compra_filters_clause(filters)
    total_row = (await db.execute(text(f"SELECT COALESCE(SUM(total), 0) AS total FROM compras WHERE {where}"), params)).mappings().one()
    total_compras = money(total_row["total"])
    rows = (await db.execute(text(f"""
        SELECT producto_id AS cod_articulo,
               COALESCE(MAX(producto_nombre), producto_id) AS nombre,
               COALESCE(SUM(cantidad), 0) AS unidades,
               COALESCE(SUM(total), 0) AS total_comprado,
               CASE WHEN SUM(cantidad) > 0 THEN SUM(total) / SUM(cantidad) ELSE 0 END AS precio_promedio,
               (ARRAY_AGG(precio_unitario ORDER BY fecha DESC))[1] AS ultimo_precio,
               (ARRAY_AGG(precio_unitario ORDER BY fecha ASC))[1] AS primer_precio,
               COUNT(DISTINCT proveedor_id) AS proveedores_distintos
        FROM compras
        WHERE {where}
        GROUP BY producto_id
        ORDER BY total_comprado DESC
        LIMIT 50
    """), params)).mappings().all()
    result = []
    for row in rows:
        primer = money(row["primer_precio"])
        ultimo = money(row["ultimo_precio"])
        result.append({
            **dict(row),
            "pct_total": (money(row["total_comprado"]) / total_compras * 100) if total_compras else 0,
            "variacion_precio_pct": ((ultimo - primer) / abs(primer) * 100) if primer else None,
        })
    return result


async def query_compras_por_proveedor(db: AsyncSession, filters: GlobalFilters) -> list[dict]:
    params = compra_params(filters)
    where = compra_filters_clause(filters)
    total_row = (await db.execute(text(f"SELECT COALESCE(SUM(total), 0) AS total FROM compras WHERE {where}"), params)).mappings().one()
    total_compras = money(total_row["total"])
    rows = (await db.execute(text(f"""
        SELECT proveedor_id,
               COALESCE(MAX(proveedor_nombre), proveedor_id) AS proveedor_nombre,
               COALESCE(SUM(total), 0) AS total_comprado,
               COUNT(*) AS ordenes,
               CASE WHEN SUM(cantidad) > 0 THEN SUM(total) / SUM(cantidad) ELSE 0 END AS precio_promedio,
               MAX(fecha)::date AS ultimo_pedido,
               (CURRENT_DATE - MAX(fecha)::date) AS dias_desde_ultimo_pedido,
               AVG(precio_unitario) FILTER (WHERE fecha >= :desde AND fecha < (:desde + ((:hasta - :desde) / 2))) AS precio_promedio_inicio,
               AVG(precio_unitario) FILTER (WHERE fecha >= (:desde + ((:hasta - :desde) / 2)) AND fecha < :hasta) AS precio_promedio_fin
        FROM compras
        WHERE {where}
        GROUP BY proveedor_id
        ORDER BY total_comprado DESC
        LIMIT 30
    """), params)).mappings().all()
    result = []
    for row in rows:
        inicio = money(row["precio_promedio_inicio"])
        fin = money(row["precio_promedio_fin"])
        result.append({
            **dict(row),
            "ultimo_pedido": row["ultimo_pedido"].isoformat() if row["ultimo_pedido"] else None,
            "pct_total": (money(row["total_comprado"]) / total_compras * 100) if total_compras else 0,
            "precio_promedio_variacion": ((fin - inicio) / abs(inicio) * 100) if inicio else None,
        })
    return result


async def query_compras_calendario_pagos(db: AsyncSession) -> list[dict]:
    today = date.today()
    rows = (await db.execute(text("""
        SELECT proveedor_nombre,
               fecha_vencimiento::date AS fecha_vencimiento,
               GREATEST(saldo_acumulado, importe, 0) AS importe,
               (fecha_vencimiento::date - :today) AS dias_para_vencer
        FROM cuentas_corrientes_proveedores
        WHERE lower(tipo) IN ('factura', 'fc')
          AND fecha_vencimiento >= :today
          AND fecha_vencimiento <= :today_90
          AND saldo_acumulado > 0
        ORDER BY fecha_vencimiento ASC
        LIMIT 200
    """), {"today": today, "today_90": today + timedelta(days=90)})).mappings().all()
    result = []
    for row in rows:
        days = int(row["dias_para_vencer"] or 0)
        if days <= 0:
            urgencia = "hoy"
        elif days <= 7:
            urgencia = "semana"
        elif days <= 30:
            urgencia = "mes"
        else:
            urgencia = "futuro"
        result.append({
            **dict(row),
            "fecha_vencimiento": row["fecha_vencimiento"].isoformat() if row["fecha_vencimiento"] else None,
            "urgencia": urgencia,
        })
    return result


async def query_compras_variacion_precios(db: AsyncSession, filters: GlobalFilters) -> list[dict]:
    params = compra_params(filters)
    where = compra_filters_clause(filters)
    rows = (await db.execute(text(f"""
        SELECT producto_id,
               COALESCE(MAX(producto_nombre), producto_id) AS nombre,
               (ARRAY_AGG(precio_unitario ORDER BY fecha ASC))[1] AS precio_inicio_periodo,
               (ARRAY_AGG(precio_unitario ORDER BY fecha DESC))[1] AS precio_fin_periodo,
               (ARRAY_AGG(proveedor_nombre ORDER BY fecha ASC))[1] AS proveedor_nombre,
               (ARRAY_AGG(proveedor_nombre ORDER BY fecha DESC))[1] AS ultimo_proveedor
        FROM compras
        WHERE {where}
        GROUP BY producto_id
        ORDER BY producto_id
    """), params)).mappings().all()
    result = []
    for row in rows:
        inicio = money(row["precio_inicio_periodo"])
        fin = money(row["precio_fin_periodo"])
        variacion = ((fin - inicio) / abs(inicio) * 100) if inicio else None
        result.append({**dict(row), "variacion_pct": variacion})
    return sorted(result, key=lambda item: item["variacion_pct"] or 0, reverse=True)


async def query_compras_transacciones(db: AsyncSession, filters: GlobalFilters, page: int = 1, limit: int = 50) -> dict:
    params = compra_params(filters)
    where = compra_filters_clause(filters)
    total = (await db.execute(text(f"SELECT COUNT(*) AS total FROM compras WHERE {where}"), params)).mappings().one()["total"]
    safe_page = max(page, 1)
    safe_limit = min(max(limit, 1), 500)
    params.update({"offset": (safe_page - 1) * safe_limit, "limit": safe_limit})
    rows = (await db.execute(text(f"""
        SELECT id, fecha::date AS fecha, proveedor_id, proveedor_nombre, producto_id, producto_nombre,
               cantidad, precio_unitario, total, total * 0.21 / 1.21 AS iva
        FROM compras
        WHERE {where}
        ORDER BY fecha DESC, id DESC
        OFFSET :offset
        LIMIT :limit
    """), params)).mappings().all()
    return {
        "page": safe_page,
        "limit": safe_limit,
        "total": total,
        "data": [{**dict(row), "fecha": row["fecha"].isoformat() if row["fecha"] else None} for row in rows],
    }


@router.get("/ventas/resumen")
async def ventas_resumen(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    params = filters.sql_params()
    ventas_where = text_filter_clause("ventas", filters)

    totals = (await db.execute(text(f"""
        SELECT
            COALESCE(SUM(total), 0) AS total_ventas,
            COALESCE(SUM(cantidad), 0) AS unidades,
            COUNT(*) AS transacciones,
            COUNT(DISTINCT cliente_id) AS clientes
        FROM ventas
        WHERE {ventas_where}
    """), params)).mappings().one()
    series = (await db.execute(text(f"""
        SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS periodo,
               COALESCE(SUM(total), 0) AS total,
               COUNT(*) AS transacciones
        FROM ventas
        WHERE {ventas_where}
        GROUP BY 1
        ORDER BY 1
    """), params)).mappings().all()
    top_productos = (await db.execute(text(f"""
        SELECT producto_id, COALESCE(MAX(producto_nombre), producto_id) AS producto_nombre,
               COALESCE(SUM(total), 0) AS total,
               COALESCE(SUM(cantidad), 0) AS unidades
        FROM ventas
        WHERE {ventas_where}
        GROUP BY producto_id
        ORDER BY total DESC
        LIMIT 10
    """), params)).mappings().all()
    top_clientes = (await db.execute(text(f"""
        SELECT cliente_id, COALESCE(MAX(cliente_nombre), cliente_id) AS cliente_nombre,
               COUNT(*) AS transacciones,
               COALESCE(SUM(total), 0) AS facturacion,
               CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(total), 0) / COUNT(*) ELSE 0 END AS ticket_promedio
        FROM ventas
        WHERE {ventas_where}
        GROUP BY cliente_id
        ORDER BY facturacion DESC
        LIMIT 10
    """), params)).mappings().all()

    total_ventas = money(totals["total_ventas"])
    transacciones = totals["transacciones"]
    ticket_promedio = total_ventas / transacciones if transacciones else 0

    return {
        "summary": {
            "total_ventas": total_ventas,
            "unidades": money(totals["unidades"]),
            "transacciones": transacciones,
            "clientes": totals["clientes"],
            "ticket_promedio": ticket_promedio,
        },
        "series": [dict(row) for row in series],
        "top_productos": [
            {**dict(row), "porcentaje": (money(row["total"]) / total_ventas * 100) if total_ventas else 0}
            for row in top_productos
        ],
        "top_clientes": [dict(row) for row in top_clientes],
    }


@router.get("/compras/resumen")
async def compras_resumen(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    params = filters.sql_params()
    compras_where = text_filter_clause("compras", filters)
    ventas_where = text_filter_clause("ventas", filters)

    totals = (await db.execute(text(f"""
        SELECT
            COALESCE(SUM(total), 0) AS total_compras,
            COALESCE(SUM(cantidad), 0) AS unidades,
            COUNT(*) AS ordenes,
            COUNT(DISTINCT proveedor_id) AS proveedores
        FROM compras
        WHERE {compras_where}
    """), params)).mappings().one()

    total_ventas_row = (await db.execute(text(f"""
        SELECT COALESCE(SUM(total), 0) AS total FROM ventas
        WHERE {ventas_where}
    """), params)).mappings().one()

    series = (await db.execute(text(f"""
        SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS periodo,
               COALESCE(SUM(total), 0) AS total,
               COUNT(*) AS ordenes
        FROM compras
        WHERE {compras_where}
        GROUP BY 1
        ORDER BY 1
    """), params)).mappings().all()
    top_proveedores = (await db.execute(text(f"""
        SELECT proveedor_id, proveedor_nombre,
               COALESCE(SUM(total), 0) AS total,
               COUNT(*) AS ordenes
        FROM compras
        WHERE {compras_where}
        GROUP BY proveedor_id, proveedor_nombre
        ORDER BY total DESC
        LIMIT 10
    """), params)).mappings().all()
    top_productos = (await db.execute(text(f"""
        SELECT producto_id, COALESCE(MAX(producto_nombre), producto_id) AS producto_nombre,
               COALESCE(SUM(cantidad), 0) AS cantidad,
               COALESCE(SUM(total), 0) AS total
        FROM compras
        WHERE {compras_where}
        GROUP BY producto_id
        ORDER BY total DESC
        LIMIT 10
    """), params)).mappings().all()

    total_compras = money(totals["total_compras"])
    total_ventas = money(total_ventas_row["total"])
    ratio_compra_venta = (total_compras / total_ventas * 100) if total_ventas else 0
    margen_bruto = ((total_ventas - total_compras) / total_ventas * 100) if total_ventas else 0

    return {
        "summary": {
            "total_compras": total_compras,
            "unidades": money(totals["unidades"]),
            "ordenes": totals["ordenes"],
            "proveedores": totals["proveedores"],
            "ratio_compra_venta": round(ratio_compra_venta, 1),
            "margen_bruto": round(margen_bruto, 1),
        },
        "series": [dict(row) for row in series],
        "top_proveedores": [
            {**dict(row), "porcentaje": (money(row["total"]) / total_compras * 100) if total_compras else 0}
            for row in top_proveedores
        ],
        "top_productos": [dict(row) for row in top_productos],
    }


@router.get("/compras/kpis")
async def compras_kpis(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    return await query_compras_kpis(db, filters)


@router.get("/compras/temporal")
async def compras_temporal(
    company_id: int = None,
    granularidad: str = "mes",
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    return {"series": await query_compras_temporal(db, filters, granularidad)}


@router.get("/compras/por-producto")
async def compras_por_producto(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    return {"productos": await query_compras_por_producto(db, filters)}


@router.get("/compras/por-proveedor")
async def compras_por_proveedor(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    return {"proveedores": await query_compras_por_proveedor(db, filters)}


@router.get("/compras/calendario-pagos")
async def compras_calendario_pagos(
    company_id: int = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    return {"vencimientos": await query_compras_calendario_pagos(db)}


@router.get("/compras/variacion-precios")
async def compras_variacion_precios(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    return {"productos": await query_compras_variacion_precios(db, filters)}


@router.get("/compras/transacciones")
async def compras_transacciones(
    company_id: int = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=500),
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    return await query_compras_transacciones(db, filters, page, limit)


@router.get("/compras/exportar")
async def compras_exportar(
    company_id: int = None,
    granularidad: str = "mes",
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    workbook = Workbook()
    workbook.remove(workbook.active)

    def add_sheet(title: str, rows: list[dict]):
        sheet = workbook.create_sheet(title)
        if not rows:
            sheet.append(["Sin datos"])
            return
        headers = list(rows[0].keys())
        sheet.append(headers)
        for row in rows:
            sheet.append([row.get(header) for header in headers])

    kpis = await query_compras_kpis(db, filters)
    add_sheet("KPIs", [
        {"kpi": key, **value}
        for key, value in kpis.items()
    ])
    add_sheet("Temporal", await query_compras_temporal(db, filters, granularidad))
    add_sheet("Productos", await query_compras_por_producto(db, filters))
    add_sheet("Proveedores", await query_compras_por_proveedor(db, filters))
    add_sheet("Calendario Pagos", await query_compras_calendario_pagos(db))
    add_sheet("Variacion Precios", await query_compras_variacion_precios(db, filters))
    add_sheet("Transacciones", (await query_compras_transacciones(db, filters, 1, 500))["data"])

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    headers = {"Content-Disposition": 'attachment; filename="compras_analytics.xlsx"'}
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@router.get("/resultado/resumen")
async def resultado_resumen(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    params = filters.sql_params()
    ventas_where = text_filter_clause("ventas", filters)
    compras_where = text_filter_clause("compras", filters)
    caja_where = text_filter_clause("movimientos_caja", filters)

    totals = (await db.execute(text(f"""
        WITH ventas_total AS (
            SELECT COALESCE(SUM(total), 0) AS total FROM ventas WHERE {ventas_where}
        ),
        compras_total AS (
            SELECT COALESCE(SUM(total), 0) AS total FROM compras WHERE {compras_where}
        ),
        gastos_total AS (
            SELECT COALESCE(SUM(ABS(importe)), 0) AS total
            FROM movimientos_caja
            WHERE tipo = 'gasto' AND {caja_where}
        )
        SELECT ventas_total.total AS ingresos,
               compras_total.total AS costo_mercaderia,
               gastos_total.total AS gastos,
               ventas_total.total - compras_total.total - gastos_total.total AS resultado
        FROM ventas_total, compras_total, gastos_total
    """), params)).mappings().one()
    series = (await db.execute(text(f"""
        WITH meses AS (
            SELECT date_trunc('month', fecha) AS mes FROM ventas WHERE {ventas_where}
            UNION
            SELECT date_trunc('month', fecha) AS mes FROM compras WHERE {compras_where}
            UNION
            SELECT date_trunc('month', fecha) AS mes FROM movimientos_caja WHERE {caja_where}
        ),
        ventas_mes AS (
            SELECT date_trunc('month', fecha) AS mes, SUM(total) AS ingresos
            FROM ventas WHERE {ventas_where} GROUP BY 1
        ),
        compras_mes AS (
            SELECT date_trunc('month', fecha) AS mes, SUM(total) AS compras
            FROM compras WHERE {compras_where} GROUP BY 1
        ),
        gastos_mes AS (
            SELECT date_trunc('month', fecha) AS mes, SUM(ABS(importe)) AS gastos
            FROM movimientos_caja WHERE tipo = 'gasto' AND {caja_where} GROUP BY 1
        )
        SELECT to_char(meses.mes, 'YYYY-MM') AS periodo,
               COALESCE(ventas_mes.ingresos, 0) AS ingresos,
               COALESCE(compras_mes.compras, 0) AS compras,
               COALESCE(gastos_mes.gastos, 0) AS gastos,
               COALESCE(ventas_mes.ingresos, 0) - COALESCE(compras_mes.compras, 0) - COALESCE(gastos_mes.gastos, 0) AS resultado,
               CASE WHEN COALESCE(ventas_mes.ingresos, 0) > 0
                    THEN ((COALESCE(ventas_mes.ingresos, 0) - COALESCE(compras_mes.compras, 0)) / COALESCE(ventas_mes.ingresos, 0)) * 100
                    ELSE 0
               END AS margen_pct
        FROM meses
        LEFT JOIN ventas_mes USING (mes)
        LEFT JOIN compras_mes USING (mes)
        LEFT JOIN gastos_mes USING (mes)
        ORDER BY periodo
    """), params)).mappings().all()

    ingresos = money(totals["ingresos"])
    resultado = money(totals["resultado"])

    return {
        "summary": {
            "ingresos": ingresos,
            "costo_mercaderia": money(totals["costo_mercaderia"]),
            "gastos": money(totals["gastos"]),
            "resultado": resultado,
            "margen_resultado": (resultado / ingresos) if ingresos else 0,
        },
        "series": [dict(row) for row in series],
    }


@router.get("/clientes/resumen")
async def clientes_resumen(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    params = filters.sql_params()
    clientes_where = text_filter_clause("cuentas_corrientes_clientes", filters)

    totals = (await db.execute(text(f"""
        SELECT
            COUNT(DISTINCT cliente_id) AS clientes_con_movimiento,
            COALESCE(SUM(CASE WHEN tipo = 'factura' THEN importe ELSE 0 END), 0) AS facturado,
            COALESCE(SUM(CASE WHEN tipo = 'recibo' THEN ABS(importe) ELSE 0 END), 0) AS cobrado,
            COALESCE(SUM(importe), 0) AS saldo_total
        FROM cuentas_corrientes_clientes
        WHERE {clientes_where}
    """), params)).mappings().one()
    top_saldos = (await db.execute(text(f"""
        SELECT cliente_id, cliente_nombre, MAX(fecha) AS ultimo_movimiento,
               COALESCE(SUM(importe), 0) AS saldo
        FROM cuentas_corrientes_clientes
        WHERE {clientes_where}
        GROUP BY cliente_id, cliente_nombre
        ORDER BY saldo DESC
        LIMIT 10
    """), params)).mappings().all()
    ageing = (await db.execute(text("""
        SELECT
            COALESCE(SUM(CASE WHEN fecha_vencimiento < now() AND fecha_vencimiento >= now() - interval '30 days' THEN GREATEST(importe, 0) ELSE 0 END), 0) AS vencido_0_30,
            COALESCE(SUM(CASE WHEN fecha_vencimiento < now() - interval '30 days' AND fecha_vencimiento >= now() - interval '60 days' THEN GREATEST(importe, 0) ELSE 0 END), 0) AS vencido_31_60,
            COALESCE(SUM(CASE WHEN fecha_vencimiento < now() - interval '60 days' AND fecha_vencimiento >= now() - interval '90 days' THEN GREATEST(importe, 0) ELSE 0 END), 0) AS vencido_61_90,
            COALESCE(SUM(CASE WHEN fecha_vencimiento < now() - interval '90 days' THEN GREATEST(importe, 0) ELSE 0 END), 0) AS vencido_90_plus,
            COALESCE(SUM(CASE WHEN fecha_vencimiento >= now() THEN GREATEST(importe, 0) ELSE 0 END), 0) AS corriente
        FROM cuentas_corrientes_clientes
        WHERE tipo = 'factura'
    """))).mappings().one()

    # Check which clients have overdue debt
    clientes_vencidos = set()
    vencidos_rows = (await db.execute(text("""
        SELECT DISTINCT cliente_id
        FROM cuentas_corrientes_clientes
        WHERE tipo = 'factura' AND fecha_vencimiento < now() AND importe > 0
    """))).all()
    for row in vencidos_rows:
        clientes_vencidos.add(row[0])

    return {
        "summary": {
            "clientes_con_movimiento": totals["clientes_con_movimiento"],
            "facturado": money(totals["facturado"]),
            "cobrado": money(totals["cobrado"]),
            "saldo_total": money(totals["saldo_total"]),
            "vencido": money(ageing["vencido_0_30"]) + money(ageing["vencido_31_60"]) + money(ageing["vencido_61_90"]) + money(ageing["vencido_90_plus"]),
            "a_vencer": money(ageing["corriente"]),
        },
        "ageing": {
            "corriente": money(ageing["corriente"]),
            "vencido_0_30": money(ageing["vencido_0_30"]),
            "vencido_31_60": money(ageing["vencido_31_60"]),
            "vencido_61_90": money(ageing["vencido_61_90"]),
            "vencido_90_plus": money(ageing["vencido_90_plus"]),
        },
        "top_saldos": [
            {
                **dict(row),
                "ultimo_movimiento": row["ultimo_movimiento"].isoformat() if row["ultimo_movimiento"] else None,
                "estado": "vencido" if row["cliente_id"] in clientes_vencidos else "al_dia",
            }
            for row in top_saldos
        ],
    }


@router.get("/proveedores/resumen")
async def proveedores_resumen(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    params = filters.sql_params()
    proveedores_where = text_filter_clause("cuentas_corrientes_proveedores", filters)

    totals = (await db.execute(text(f"""
        SELECT
            COUNT(DISTINCT proveedor_id) AS proveedores_con_movimiento,
            COALESCE(SUM(CASE WHEN tipo = 'factura' THEN importe ELSE 0 END), 0) AS facturado,
            COALESCE(SUM(CASE WHEN tipo = 'pago' THEN ABS(importe) ELSE 0 END), 0) AS pagado,
            COALESCE(SUM(importe), 0) AS saldo_total
        FROM cuentas_corrientes_proveedores
        WHERE {proveedores_where}
    """), params)).mappings().one()
    top_saldos = (await db.execute(text(f"""
        SELECT proveedor_id, proveedor_nombre, MAX(fecha) AS ultimo_movimiento,
               COALESCE(SUM(importe), 0) AS saldo
        FROM cuentas_corrientes_proveedores
        WHERE {proveedores_where}
        GROUP BY proveedor_id, proveedor_nombre
        ORDER BY saldo DESC
        LIMIT 10
    """), params)).mappings().all()
    proximos_vencimientos = (await db.execute(text("""
        SELECT proveedor_id, proveedor_nombre, comprobante_id, fecha_vencimiento, importe
        FROM cuentas_corrientes_proveedores
        WHERE tipo = 'factura' AND fecha_vencimiento IS NOT NULL
              AND fecha_vencimiento >= now()
              AND fecha_vencimiento <= now() + interval '30 days'
        ORDER BY fecha_vencimiento
        LIMIT 15
    """))).mappings().all()

    return {
        "summary": {
            "proveedores_con_movimiento": totals["proveedores_con_movimiento"],
            "facturado": money(totals["facturado"]),
            "pagado": money(totals["pagado"]),
            "saldo_total": money(totals["saldo_total"]),
        },
        "top_saldos": [
            {
                **dict(row),
                "ultimo_movimiento": row["ultimo_movimiento"].isoformat() if row["ultimo_movimiento"] else None,
            }
            for row in top_saldos
        ],
        "proximos_vencimientos": [
            {
                **dict(row),
                "fecha_vencimiento": row["fecha_vencimiento"].isoformat() if row["fecha_vencimiento"] else None,
            }
            for row in proximos_vencimientos
        ],
    }


@router.get("/caja/resumen")
async def caja_resumen(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    params = filters.sql_params()
    caja_where = text_filter_clause("movimientos_caja", filters)

    totals = (await db.execute(text(f"""
        SELECT
            COALESCE(SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END), 0) AS ingresos,
            COALESCE(SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END), 0) AS egresos,
            COALESCE(SUM(importe), 0) AS saldo_neto,
            COUNT(*) AS movimientos
        FROM movimientos_caja
        WHERE {caja_where}
    """), params)).mappings().one()
    series = (await db.execute(text(f"""
        SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS periodo,
               COALESCE(SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END), 0) AS cobros,
               COALESCE(SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END), 0) AS pagos,
               COALESCE(SUM(importe), 0) AS saldo_neto
        FROM movimientos_caja
        WHERE {caja_where}
        GROUP BY 1
        ORDER BY 1
    """), params)).mappings().all()

    # Build cumulative saldo
    saldo_acum = 0
    series_with_acum = []
    for row in series:
        d = dict(row)
        saldo_acum += d["saldo_neto"]
        d["saldo_acumulado"] = saldo_acum
        series_with_acum.append(d)

    ultimos_movimientos = (await db.execute(text(f"""
        SELECT fecha, tipo, descripcion, importe, saldo_acumulado
        FROM movimientos_caja
        WHERE {caja_where}
        ORDER BY fecha DESC
        LIMIT 15
    """), params)).mappings().all()

    return {
        "summary": {
            "ingresos": money(totals["ingresos"]),
            "egresos": money(totals["egresos"]),
            "saldo_neto": money(totals["saldo_neto"]),
            "movimientos": totals["movimientos"],
        },
        "series": series_with_acum,
        "ultimos_movimientos": [
            {
                **dict(row),
                "fecha": row["fecha"].isoformat() if row["fecha"] else None,
            }
            for row in ultimos_movimientos
        ],
    }


@router.get("/stock/resumen")
async def stock_resumen(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    params = filters.sql_params()
    compras_where = text_filter_clause("compras", filters)
    ventas_where = text_filter_clause("ventas", filters)

    stock = (await db.execute(text(f"""
        WITH compradas AS (
            SELECT producto_id,
                   COALESCE(MAX(producto_nombre), producto_id) AS producto_nombre,
                   COALESCE(SUM(cantidad), 0) AS unidades_compradas,
                   CASE WHEN SUM(cantidad) > 0 THEN SUM(total) / SUM(cantidad) ELSE 0 END AS precio_unitario_promedio
            FROM compras
            WHERE {compras_where}
            GROUP BY producto_id
        ),
        vendidas AS (
            SELECT producto_id,
                   COALESCE(SUM(cantidad), 0) AS unidades_vendidas
            FROM ventas
            WHERE {ventas_where}
            GROUP BY producto_id
        )
        SELECT c.producto_id,
               c.producto_nombre,
               c.unidades_compradas,
               COALESCE(v.unidades_vendidas, 0) AS unidades_vendidas,
               c.unidades_compradas - COALESCE(v.unidades_vendidas, 0) + 5000 AS stock_estimado,
               c.precio_unitario_promedio,
               (c.unidades_compradas - COALESCE(v.unidades_vendidas, 0) + 5000) * c.precio_unitario_promedio AS valor_stock_estimado
        FROM compradas c
        LEFT JOIN vendidas v USING (producto_id)
        ORDER BY valor_stock_estimado DESC
    """), params)).mappings().all()

    stock_list = []
    for row in stock:
        s = dict(row)
        est = s["stock_estimado"]
        if est <= 0:
            s["estado"] = "sin_stock"
        elif est <= 100:
            s["estado"] = "bajo"
        else:
            s["estado"] = "ok"
        stock_list.append(s)

    total_articulos = len(stock_list)
    articulos_con_stock = sum(1 for s in stock_list if s["stock_estimado"] > 0)
    articulos_sin_stock = total_articulos - articulos_con_stock
    valor_inventario = sum(max(s["valor_stock_estimado"], 0) for s in stock_list)

    return {
        "total_articulos": total_articulos,
        "articulos_con_stock": articulos_con_stock,
        "articulos_sin_stock": articulos_sin_stock,
        "valor_inventario_estimado": round(valor_inventario, 2),
        "stock_por_producto": stock_list,
    }


@router.get("/vendedores/resumen")
async def vendedores_resumen(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)
    params = filters.sql_params()
    ventas_where = text_filter_clause("ventas", filters)

    VENDEDORES = [
        {"id": "V001", "nombre": "Lucas García"},
        {"id": "V002", "nombre": "María López"},
        {"id": "V003", "nombre": "Carlos Ruiz"},
        {"id": "V004", "nombre": "Ana Martínez"},
        {"id": "V005", "nombre": "Diego Fernández"},
    ]

    # Get all client sales summaries within the date range
    client_sales = (await db.execute(text(f"""
        SELECT cliente_id,
               COUNT(*) AS transacciones,
               COALESCE(SUM(total), 0) AS facturacion
        FROM ventas
        WHERE {ventas_where}
        GROUP BY cliente_id
    """), params)).mappings().all()

    # Deterministic assignment: hash(cliente_id) mod 5
    vendedor_data = {v["id"]: {
        "vendedor_id": v["id"],
        "vendedor_nombre": v["nombre"],
        "clientes_atendidos": 0,
        "transacciones": 0,
        "facturacion_total": 0.0,
    } for v in VENDEDORES}

    for row in client_sales:
        idx = hash(row["cliente_id"]) % len(VENDEDORES)
        vid = VENDEDORES[idx]["id"]
        vendedor_data[vid]["clientes_atendidos"] += 1
        vendedor_data[vid]["transacciones"] += row["transacciones"]
        vendedor_data[vid]["facturacion_total"] += float(row["facturacion"])

    total_facturacion = sum(v["facturacion_total"] for v in vendedor_data.values())

    result = []
    for v in sorted(vendedor_data.values(), key=lambda x: x["facturacion_total"], reverse=True):
        v["ticket_promedio"] = v["facturacion_total"] / v["transacciones"] if v["transacciones"] else 0
        v["porcentaje_del_total"] = (v["facturacion_total"] / total_facturacion * 100) if total_facturacion else 0
        result.append(v)

    return {"vendedores": result}


# ══════════════════════════════════════════════════════════════════════════════
# FASE 3: Panel Ventas — endpoints dedicados
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/ventas/kpis")
async def ventas_kpis(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    params = filters.sql_params()
    where = _ventas_base_where(filters)

    row = await _fetch_kpi_row(db, where, params)

    fa = money(row["fa_bruto"])
    nc = money(row["nc_total"])
    neto_fa = money(row["neto_fa"])
    iva = money(row["iva_debito"])
    tickets = int(row["tickets"] or 0)
    clientes = int(row["clientes_unicos"] or 0)
    unidades = money(row["unidades"])
    margen_d = money(row["margen_dolares"])
    total_con_costo = money(row["total_con_costo"])
    facturado_neto = fa - nc
    ticket_prom = facturado_neto / tickets if tickets else 0
    tasa_dev = (nc / fa * 100) if fa else 0
    margen_pct = (margen_d / total_con_costo * 100) if total_con_costo else 0

    # previous period
    ant: dict[str, Optional[float]] = {}
    if filters.comparar_anterior:
        prev_desde, prev_hasta = _prev_period(filters)
        prev_params = dict(params)
        prev_params["desde"] = prev_desde
        prev_params["hasta"] = prev_hasta
        prev_row = await _fetch_kpi_row(db, where, prev_params)
        ant_fa = money(prev_row["fa_bruto"])
        ant_nc = money(prev_row["nc_total"])
        ant_neto_fa = money(prev_row["neto_fa"])
        ant["facturado_neto"] = ant_fa - ant_nc
        ant["facturado_bruto"] = ant_fa
        ant["iva_debito"] = money(prev_row["iva_debito"])
        ant["tickets"] = int(prev_row["tickets"] or 0)
        ant["ticket_promedio"] = ant["facturado_neto"] / ant["tickets"] if ant["tickets"] else 0
        ant["unidades"] = money(prev_row["unidades"])
        ant["tasa_devolucion"] = (ant_nc / ant_fa * 100) if ant_fa else 0
        ant["clientes_unicos"] = int(prev_row["clientes_unicos"] or 0)
        ant_margen_d = money(prev_row["margen_dolares"])
        ant_total_con_costo = money(prev_row["total_con_costo"])
        ant["margen_bruto_pct"] = (ant_margen_d / ant_total_con_costo * 100) if ant_total_con_costo else 0

    return {
        "facturado_neto": _kpi_obj(facturado_neto, ant.get("facturado_neto")),
        "facturado_bruto": _kpi_obj(fa, ant.get("facturado_bruto")),
        "iva_debito": _kpi_obj(iva, ant.get("iva_debito")),
        "tickets": _kpi_obj(tickets, ant.get("tickets")),
        "ticket_promedio": _kpi_obj(ticket_prom, ant.get("ticket_promedio")),
        "unidades": _kpi_obj(unidades, ant.get("unidades")),
        "tasa_devolucion": _kpi_obj(round(tasa_dev, 2), ant.get("tasa_devolucion")),
        "clientes_unicos": _kpi_obj(clientes, ant.get("clientes_unicos")),
        "margen_bruto_pct": _kpi_obj(round(margen_pct, 2), ant.get("margen_bruto_pct")),
    }


@router.get("/ventas/temporal")
async def ventas_temporal(
    company_id: int = None,
    granularidad: Literal["dia", "semana", "mes", "trimestre"] = "mes",
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    trunc_map = {
        "dia": "day", "semana": "week", "mes": "month", "trimestre": "quarter"
    }
    trunc = trunc_map.get(granularidad, "month")
    params = filters.sql_params()
    where = _ventas_base_where(filters)

    series = (await db.execute(text(f"""
        SELECT
            to_char(date_trunc('{trunc}', fecha), 'YYYY-MM-DD') AS periodo,
            COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN total ELSE 0 END),0)
              - COALESCE(SUM(CASE WHEN tipo_comprobante IN ('NC','ND') THEN ABS(total) ELSE 0 END),0) AS facturado,
            COUNT(CASE WHEN tipo_comprobante='FA' THEN 1 END)                                         AS tickets,
            COALESCE(SUM(CASE WHEN tipo_comprobante IN ('NC','ND') THEN ABS(total) ELSE 0 END),0)    AS devoluciones
        FROM ventas
        WHERE {where}
        GROUP BY 1
        ORDER BY 1
    """), params)).mappings().all()

    result = [dict(r) for r in series]

    if filters.comparar_anterior:
        prev_desde, prev_hasta = _prev_period(filters)
        prev_params = dict(params)
        prev_params["desde"] = prev_desde
        prev_params["hasta"] = prev_hasta
        prev_series = (await db.execute(text(f"""
            SELECT
                to_char(date_trunc('{trunc}', fecha), 'YYYY-MM-DD') AS periodo,
                COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN total ELSE 0 END),0)
                  - COALESCE(SUM(CASE WHEN tipo_comprobante IN ('NC','ND') THEN ABS(total) ELSE 0 END),0) AS facturado,
                COUNT(CASE WHEN tipo_comprobante='FA' THEN 1 END) AS tickets
            FROM ventas
            WHERE {where}
            GROUP BY 1
            ORDER BY 1
        """), prev_params)).mappings().all()
        prev_map = {r["periodo"]: dict(r) for r in prev_series}
        for i, row in enumerate(result):
            # Align by index (same position in period)
            prev_vals = list(prev_map.values())
            if i < len(prev_vals):
                row["facturado_anterior"] = prev_vals[i]["facturado"]
                row["tickets_anterior"] = prev_vals[i]["tickets"]

    return {"series": result}


@router.get("/ventas/productos")
async def ventas_productos(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    params = filters.sql_params()
    where = _ventas_base_where(filters)

    total_row = (await db.execute(text(f"""
        SELECT COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN total ELSE 0 END),0) AS total_fa
        FROM ventas WHERE {where}
    """), params)).mappings().one()
    total_fa = money(total_row["total_fa"]) or 1

    ranking_rows = (await db.execute(text(f"""
        SELECT
            producto_id,
            COALESCE(MAX(producto_nombre), producto_id)                                    AS nombre,
            COALESCE(MAX(cod_rubro), 0)                                                    AS cod_rubro,
            COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN cantidad ELSE 0 END), 0)    AS unidades,
            COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN total ELSE 0 END), 0)       AS facturado,
            COUNT(DISTINCT CASE WHEN tipo_comprobante='FA' THEN cliente_id END)           AS clientes_unicos,
            COUNT(CASE WHEN tipo_comprobante='FA' THEN 1 END)                             AS tickets,
            COALESCE(SUM(
              CASE WHEN precio_compra_actual IS NOT NULL
                   THEN (precio_unitario - precio_compra_actual::float) * cantidad
              ELSE 0 END), 0)                                                              AS margen_dolares,
            COALESCE(SUM(CASE WHEN precio_compra_actual IS NOT NULL THEN total ELSE 0 END), 0) AS total_con_costo
        FROM ventas
        WHERE {where}
        GROUP BY producto_id
        ORDER BY facturado DESC
        LIMIT 100
    """), params)).mappings().all()

    ranking = []
    acumulado = 0.0
    for r in ranking_rows:
        d = dict(r)
        d["facturado"] = money(d["facturado"])
        d["margen_dolares"] = money(d["margen_dolares"])
        tc = money(d["total_con_costo"])
        d["margen_pct"] = round(d["margen_dolares"] / tc * 100, 1) if tc else 0
        d["ticket_promedio"] = d["facturado"] / d["tickets"] if d["tickets"] else 0
        d["pct_total"] = round(d["facturado"] / total_fa * 100, 2)
        acumulado += d["pct_total"]
        d["acumulado_pct"] = round(acumulado, 2)
        del d["total_con_costo"]
        ranking.append(d)

    rubros_rows = (await db.execute(text(f"""
        SELECT
            cod_rubro,
            COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN total ELSE 0 END), 0) AS facturado,
            COUNT(CASE WHEN tipo_comprobante='FA' THEN 1 END)                        AS tickets
        FROM ventas
        WHERE {where} AND cod_rubro IS NOT NULL
        GROUP BY cod_rubro
        ORDER BY facturado DESC
    """), params)).mappings().all()

    rubro_names = {}
    try:
        rn_rows = (await db.execute(text("SELECT cod_rubro, nombre FROM rubros"))).mappings().all()
        rubro_names = {r["cod_rubro"]: r["nombre"] for r in rn_rows}
    except Exception:
        pass

    rubros = []
    for r in rubros_rows:
        d = dict(r)
        d["facturado"] = money(d["facturado"])
        d["pct_total"] = round(d["facturado"] / total_fa * 100, 2)
        d["nombre"] = rubro_names.get(d["cod_rubro"], f"Rubro {d['cod_rubro']}")
        rubros.append(d)

    pareto = [
        {"producto": r["nombre"], "facturado": r["facturado"], "acumulado_pct": r["acumulado_pct"]}
        for r in ranking[:20]
    ]

    return {"ranking": ranking, "por_rubro": rubros, "pareto": pareto}


@router.get("/ventas/por-vendedor")
async def ventas_por_vendedor(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    params = filters.sql_params()
    where = _ventas_base_where(filters)

    vendedor_names = {}
    cuotas = {}
    try:
        vd_rows = (await db.execute(text(
            "SELECT cod_vendedor, nombre, cuota_mensual FROM vendedores"
        ))).mappings().all()
        for r in vd_rows:
            vendedor_names[r["cod_vendedor"]] = r["nombre"]
            cuotas[r["cod_vendedor"]] = float(r["cuota_mensual"] or 0)
    except Exception:
        pass

    ventas_rows = (await db.execute(text(f"""
        SELECT
            cod_vendedor,
            COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN total ELSE 0 END)
              - SUM(CASE WHEN tipo_comprobante IN ('NC','ND') THEN ABS(total) ELSE 0 END), 0) AS facturado_neto,
            COUNT(CASE WHEN tipo_comprobante='FA' THEN 1 END)                                  AS tickets,
            COUNT(DISTINCT CASE WHEN tipo_comprobante='FA' THEN cliente_id END)               AS clientes_unicos,
            COALESCE(SUM(
              CASE WHEN precio_compra_actual IS NOT NULL
                   THEN (precio_unitario - precio_compra_actual::float) * cantidad
              ELSE 0 END), 0)                                                                  AS margen_dolares,
            COALESCE(SUM(CASE WHEN precio_compra_actual IS NOT NULL THEN total ELSE 0 END), 0) AS total_con_costo
        FROM ventas
        WHERE {where} AND cod_vendedor IS NOT NULL
        GROUP BY cod_vendedor
        ORDER BY facturado_neto DESC
    """), params)).mappings().all()

    presupuestos_rows = []
    try:
        pres_where = "fecha >= :desde AND fecha < :hasta AND cod_vendedor IS NOT NULL"
        if not filters.incluir_anuladas:
            pres_where += " AND (anulada IS NULL OR anulada <> 'S')"
        presupuestos_rows = (await db.execute(text(f"""
            SELECT cod_vendedor,
                   COUNT(*) AS emitidos,
                   COUNT(CASE WHEN confirmado THEN 1 END) AS confirmados
            FROM presupuestos
            WHERE {pres_where}
            GROUP BY cod_vendedor
        """), {"desde": params["desde"], "hasta": params["hasta"]})).mappings().all()
    except Exception:
        pass

    pres_map = {r["cod_vendedor"]: dict(r) for r in presupuestos_rows}
    total_facturado = sum(money(r["facturado_neto"]) for r in ventas_rows) or 1

    result = []
    for r in ventas_rows:
        d = dict(r)
        fn = money(d["facturado_neto"])
        tk = int(d["tickets"] or 0)
        tc = money(d["total_con_costo"])
        md = money(d["margen_dolares"])
        pres = pres_map.get(d["cod_vendedor"], {})
        emitidos = int(pres.get("emitidos", 0))
        confirmados = int(pres.get("confirmados", 0))

        result.append({
            "cod_vendedor": d["cod_vendedor"],
            "nombre_vendedor": vendedor_names.get(d["cod_vendedor"], f"Vendedor {d['cod_vendedor']}"),
            "facturado_neto": fn,
            "tickets": tk,
            "ticket_promedio": fn / tk if tk else 0,
            "clientes_unicos": int(d["clientes_unicos"] or 0),
            "margen_dolares": md,
            "margen_pct": round(md / tc * 100, 1) if tc else 0,
            "pct_del_total": round(fn / total_facturado * 100, 2),
            "presupuestos_emitidos": emitidos,
            "presupuestos_confirmados": confirmados,
            "tasa_conversion": round(confirmados / emitidos * 100, 1) if emitidos else 0,
            "cuota_mensual": cuotas.get(d["cod_vendedor"], 0),
        })

    return {"vendedores": result}


@router.get("/ventas/por-cliente")
async def ventas_por_cliente(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    params = filters.sql_params()
    where = _ventas_base_where(filters)

    rows = (await db.execute(text(f"""
        SELECT
            cliente_id,
            COALESCE(MAX(cliente_nombre), cliente_id)                                        AS cliente_nombre,
            COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN total ELSE 0 END)
              - SUM(CASE WHEN tipo_comprobante IN ('NC','ND') THEN ABS(total) ELSE 0 END),0) AS facturado_neto,
            COUNT(CASE WHEN tipo_comprobante='FA' THEN 1 END)                                AS tickets,
            MAX(fecha)                                                                        AS ultima_compra,
            MIN(fecha)                                                                        AS primera_compra_periodo,
            COALESCE(SUM(
              CASE WHEN precio_compra_actual IS NOT NULL
                   THEN (precio_unitario - precio_compra_actual::float) * cantidad
              ELSE 0 END),0)                                                                 AS margen_dolares,
            COALESCE(SUM(CASE WHEN precio_compra_actual IS NOT NULL THEN total ELSE 0 END),0) AS total_con_costo,
            MODE() WITHIN GROUP (ORDER BY condicion_venta_tipo)                               AS condicion_predominante
        FROM ventas
        WHERE {where} AND tipo_comprobante='FA'
        GROUP BY cliente_id
        ORDER BY facturado_neto DESC
        LIMIT 200
    """), params)).mappings().all()

    # primera compra histórica para detectar clientes nuevos
    nuevos_set: set = set()
    try:
        hist_rows = (await db.execute(text(f"""
            SELECT DISTINCT cliente_id
            FROM ventas
            WHERE fecha < :desde AND tipo_comprobante='FA'
        """), {"desde": params["desde"]})).all()
        historicos = {r[0] for r in hist_rows}
        nuevos_set = {r["cliente_id"] for r in rows if r["cliente_id"] not in historicos}
    except Exception:
        pass

    today = date.today()
    total_facturado = sum(money(r["facturado_neto"]) for r in rows) or 1

    # ABC classification
    total_ordenado = sorted(rows, key=lambda r: money(r["facturado_neto"]), reverse=True)
    acumulado = 0.0
    abc_map = {}
    for r in total_ordenado:
        acumulado += money(r["facturado_neto"]) / total_facturado * 100
        if acumulado <= 80:
            abc_map[r["cliente_id"]] = "A"
        elif acumulado <= 95:
            abc_map[r["cliente_id"]] = "B"
        else:
            abc_map[r["cliente_id"]] = "C"

    result = []
    for r in rows:
        d = dict(r)
        fn = money(d["facturado_neto"])
        tk = int(d["tickets"] or 0)
        tc = money(d["total_con_costo"])
        md = money(d["margen_dolares"])
        ultima = d["ultima_compra"]
        dias_sin_comprar = (today - ultima.date()).days if ultima else None

        result.append({
            "cod_cliente": d["cliente_id"],
            "cliente_nombre": d["cliente_nombre"],
            "facturado_neto": fn,
            "tickets": tk,
            "ticket_promedio": fn / tk if tk else 0,
            "pct_total": round(fn / total_facturado * 100, 2),
            "margen_dolares": md,
            "margen_pct": round(md / tc * 100, 1) if tc else 0,
            "condicion_venta_predominante": d.get("condicion_predominante"),
            "ultima_compra": ultima.isoformat() if ultima else None,
            "dias_sin_comprar": dias_sin_comprar,
            "es_nuevo": d["cliente_id"] in nuevos_set,
            "segmento": abc_map.get(d["cliente_id"], "C"),
        })

    # ABC summary
    abc_summary = {"A": {"clientes": 0, "facturado": 0.0}, "B": {"clientes": 0, "facturado": 0.0}, "C": {"clientes": 0, "facturado": 0.0}}
    for r in result:
        seg = r["segmento"]
        abc_summary[seg]["clientes"] += 1
        abc_summary[seg]["facturado"] += r["facturado_neto"]

    return {"clientes": result, "abc_summary": abc_summary}


@router.get("/ventas/por-comprobante")
async def ventas_por_comprobante(
    company_id: int = None,
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    params = filters.sql_params()
    where = _ventas_base_where(filters)

    tipo_rows = (await db.execute(text(f"""
        SELECT tipo_comprobante,
               COUNT(*)                           AS cantidad,
               COALESCE(SUM(ABS(total)), 0)       AS importe
        FROM ventas WHERE {where}
        GROUP BY tipo_comprobante ORDER BY importe DESC
    """), params)).mappings().all()

    factura_rows = (await db.execute(text(f"""
        SELECT COALESCE(tipo_factura,'?') AS tipo_factura,
               COUNT(*)                  AS cantidad,
               COALESCE(SUM(total), 0)  AS importe
        FROM ventas WHERE {where} AND tipo_comprobante='FA'
        GROUP BY tipo_factura ORDER BY importe DESC
    """), params)).mappings().all()

    condicion_rows = (await db.execute(text(f"""
        SELECT COALESCE(condicion_venta_tipo::text,'?') AS condicion,
               COUNT(*)                               AS cantidad,
               COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN total ELSE 0 END),0) AS importe
        FROM ventas WHERE {where}
        GROUP BY condicion ORDER BY importe DESC
    """), params)).mappings().all()

    pdv_rows = (await db.execute(text(f"""
        SELECT COALESCE(punto_de_venta::text,'?') AS punto_de_venta,
               COUNT(CASE WHEN tipo_comprobante='FA' THEN 1 END) AS tickets,
               COALESCE(SUM(CASE WHEN tipo_comprobante='FA' THEN total ELSE 0 END),0) AS facturado
        FROM ventas WHERE {where}
        GROUP BY punto_de_venta ORDER BY facturado DESC
    """), params)).mappings().all()

    total_fa = sum(money(r["importe"]) for r in tipo_rows if r["tipo_comprobante"] == "FA") or 1

    return {
        "por_tipo": [{"tipo": r["tipo_comprobante"], "cantidad": int(r["cantidad"]), "importe": money(r["importe"])} for r in tipo_rows],
        "por_tipo_factura": [{"tipo": r["tipo_factura"], "cantidad": int(r["cantidad"]), "importe": money(r["importe"])} for r in factura_rows],
        "por_condicion_venta": [{"condicion": r["condicion"], "cantidad": int(r["cantidad"]), "importe": money(r["importe"])} for r in condicion_rows],
        "por_punto_de_venta": [{"punto": r["punto_de_venta"], "tickets": int(r["tickets"]), "facturado": money(r["facturado"]), "pct_total": round(money(r["facturado"]) / total_fa * 100, 1)} for r in pdv_rows],
    }


@router.get("/ventas/transacciones")
async def ventas_transacciones(
    company_id: int = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, le=200),
    sort_by: str = Query(default="fecha"),
    sort_dir: Literal["asc", "desc"] = "desc",
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    params = filters.sql_params()
    where = _ventas_base_where(filters)

    safe_sort = {
        "fecha", "total", "cliente_id", "cliente_nombre", "tipo_comprobante",
        "punto_de_venta", "cod_vendedor", "neto", "iva_importe", "cantidad"
    }
    sort_col = sort_by if sort_by in safe_sort else "fecha"
    direction = "ASC" if sort_dir == "asc" else "DESC"
    offset = (page - 1) * limit
    params["limit"] = limit
    params["offset"] = offset

    total_count = (await db.execute(text(f"SELECT COUNT(*) FROM ventas WHERE {where}"), params)).scalar()

    rows = (await db.execute(text(f"""
        SELECT id, fecha, tipo_comprobante, tipo_factura, punto_de_venta,
               cliente_id, cliente_nombre, cod_vendedor,
               COALESCE(neto::float, total/1.21) AS neto,
               COALESCE(iva_importe::float, total - total/1.21) AS iva_importe,
               total, condicion_venta_tipo, cod_deposito, anulada,
               producto_id, producto_nombre, cantidad, precio_unitario,
               COALESCE(precio_compra_actual::float, 0) AS precio_compra_actual,
               COALESCE(descuento_porc::float, 0) AS descuento_porc
        FROM ventas
        WHERE {where}
        ORDER BY {sort_col} {direction}
        LIMIT :limit OFFSET :offset
    """), params)).mappings().all()

    return {
        "total": int(total_count),
        "page": page,
        "limit": limit,
        "pages": -(-int(total_count) // limit),
        "rows": [
            {**dict(r), "fecha": r["fecha"].isoformat() if r["fecha"] else None}
            for r in rows
        ],
    }


@router.get("/ventas/exportar")
async def ventas_exportar(
    company_id: int = None,
    formato: Literal["excel", "csv"] = "excel",
    filters: GlobalFilters = Depends(get_global_filters),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        import openpyxl
        HAS_OPENPYXL = True
    except ImportError:
        HAS_OPENPYXL = False

    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    params = filters.sql_params()
    where = _ventas_base_where(filters)

    kpi_row = await _fetch_kpi_row(db, where, params)
    fa = money(kpi_row["fa_bruto"])
    nc = money(kpi_row["nc_total"])
    fn = fa - nc

    rows = (await db.execute(text(f"""
        SELECT fecha, tipo_comprobante, tipo_factura, punto_de_venta,
               cliente_id, cliente_nombre, cod_vendedor,
               COALESCE(neto::float, total/1.21) AS neto,
               COALESCE(iva_importe::float, 0)    AS iva_importe,
               total, condicion_venta_tipo, anulada,
               producto_id, producto_nombre, cantidad, precio_unitario,
               COALESCE(precio_compra_actual::float,0) AS precio_compra_actual
        FROM ventas
        WHERE {where}
        ORDER BY fecha DESC
        LIMIT 10000
    """), params)).mappings().all()

    if formato == "csv":
        import csv as csv_mod
        buf = io.StringIO()
        writer = csv_mod.DictWriter(buf, fieldnames=[
            "fecha","tipo_comprobante","tipo_factura","punto_de_venta",
            "cliente_id","cliente_nombre","cod_vendedor","neto","iva_importe",
            "total","condicion_venta_tipo","anulada",
            "producto_id","producto_nombre","cantidad","precio_unitario","precio_compra_actual"
        ])
        writer.writeheader()
        for r in rows:
            d = dict(r)
            d["fecha"] = d["fecha"].isoformat() if d["fecha"] else ""
            writer.writerow(d)
        return StreamingResponse(
            io.BytesIO(buf.getvalue().encode("utf-8-sig")),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=ventas.csv"},
        )

    # Excel fallback: if openpyxl not installed, fall back to CSV
    if not HAS_OPENPYXL:
        return {"error": "openpyxl no disponible, use formato=csv"}

    from openpyxl import Workbook
    wb = Workbook()

    # KPIs sheet
    ws_kpi = wb.active
    ws_kpi.title = "KPIs"
    ws_kpi.append(["Métrica", "Valor"])
    ws_kpi.append(["Facturado Neto", fn])
    ws_kpi.append(["Facturado Bruto FA", fa])
    ws_kpi.append(["Devoluciones NC/ND", nc])
    ws_kpi.append(["IVA Débito", money(kpi_row["iva_debito"])])
    ws_kpi.append(["Tickets", int(kpi_row["tickets"] or 0)])
    ws_kpi.append(["Clientes únicos", int(kpi_row["clientes_unicos"] or 0)])
    ws_kpi.append(["Unidades", money(kpi_row["unidades"])])

    # Transacciones sheet
    ws_tx = wb.create_sheet("Transacciones")
    headers = ["Fecha","Tipo","Letra","Pto.Vta","Cliente ID","Cliente","Vendedor",
               "Neto","IVA","Total","Condición","Anulada","Producto","Descripción","Cantidad","Precio U.","Costo U."]
    ws_tx.append(headers)
    for r in rows:
        ws_tx.append([
            r["fecha"].isoformat() if r["fecha"] else "",
            r["tipo_comprobante"], r["tipo_factura"], r["punto_de_venta"],
            r["cliente_id"], r["cliente_nombre"], r["cod_vendedor"],
            r["neto"], r["iva_importe"], r["total"], r["condicion_venta_tipo"], r["anulada"],
            r["producto_id"], r["producto_nombre"], r["cantidad"], r["precio_unitario"], r["precio_compra_actual"],
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=ventas.xlsx"},
    )
