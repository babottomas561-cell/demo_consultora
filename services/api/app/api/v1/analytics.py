from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.v1.dashboard import get_tenant_schema
from app.core.database import get_db


router = APIRouter()


def quote_schema(schema_name: str) -> str:
    return '"' + schema_name.replace('"', '""') + '"'


async def set_tenant_search_path(db: AsyncSession, tenant_schema: str) -> None:
    await db.execute(text(f"SET search_path TO {quote_schema(tenant_schema)}"))


def money(value) -> float:
    return float(value or 0)


@router.get("/ventas/resumen")
async def ventas_resumen(
    company_id: int = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    totals = (await db.execute(text("""
        SELECT
            COALESCE(SUM(total), 0) AS total_ventas,
            COALESCE(SUM(cantidad), 0) AS unidades,
            COUNT(*) AS transacciones,
            COUNT(DISTINCT cliente_id) AS clientes
        FROM ventas
    """))).mappings().one()
    series = (await db.execute(text("""
        SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS periodo,
               COALESCE(SUM(total), 0) AS total,
               COUNT(*) AS transacciones
        FROM ventas
        GROUP BY 1
        ORDER BY 1
    """))).mappings().all()
    top_productos = (await db.execute(text("""
        SELECT producto_id, producto_id AS producto_nombre,
               COALESCE(SUM(total), 0) AS total,
               COALESCE(SUM(cantidad), 0) AS unidades
        FROM ventas
        GROUP BY producto_id
        ORDER BY total DESC
        LIMIT 10
    """))).mappings().all()

    return {
        "summary": {
            "total_ventas": money(totals["total_ventas"]),
            "unidades": money(totals["unidades"]),
            "transacciones": totals["transacciones"],
            "clientes": totals["clientes"],
        },
        "series": [dict(row) for row in series],
        "top_productos": [dict(row) for row in top_productos],
    }


@router.get("/compras/resumen")
async def compras_resumen(
    company_id: int = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    totals = (await db.execute(text("""
        SELECT
            COALESCE(SUM(total), 0) AS total_compras,
            COALESCE(SUM(cantidad), 0) AS unidades,
            COUNT(*) AS ordenes,
            COUNT(DISTINCT proveedor_id) AS proveedores
        FROM compras
    """))).mappings().one()
    series = (await db.execute(text("""
        SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS periodo,
               COALESCE(SUM(total), 0) AS total,
               COUNT(*) AS ordenes
        FROM compras
        GROUP BY 1
        ORDER BY 1
    """))).mappings().all()
    top_proveedores = (await db.execute(text("""
        SELECT proveedor_id, proveedor_nombre,
               COALESCE(SUM(total), 0) AS total,
               COUNT(*) AS ordenes
        FROM compras
        GROUP BY proveedor_id, proveedor_nombre
        ORDER BY total DESC
        LIMIT 10
    """))).mappings().all()

    return {
        "summary": {
            "total_compras": money(totals["total_compras"]),
            "unidades": money(totals["unidades"]),
            "ordenes": totals["ordenes"],
            "proveedores": totals["proveedores"],
        },
        "series": [dict(row) for row in series],
        "top_proveedores": [dict(row) for row in top_proveedores],
    }


@router.get("/resultado/resumen")
async def resultado_resumen(
    company_id: int = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    totals = (await db.execute(text("""
        WITH ventas_total AS (
            SELECT COALESCE(SUM(total), 0) AS total FROM ventas
        ),
        compras_total AS (
            SELECT COALESCE(SUM(total), 0) AS total FROM compras
        ),
        gastos_total AS (
            SELECT COALESCE(SUM(ABS(importe)), 0) AS total
            FROM movimientos_caja
            WHERE tipo = 'gasto'
        )
        SELECT ventas_total.total AS ingresos,
               compras_total.total AS costo_mercaderia,
               gastos_total.total AS gastos,
               ventas_total.total - compras_total.total - gastos_total.total AS resultado
        FROM ventas_total, compras_total, gastos_total
    """))).mappings().one()
    series = (await db.execute(text("""
        WITH meses AS (
            SELECT date_trunc('month', fecha) AS mes FROM ventas
            UNION
            SELECT date_trunc('month', fecha) AS mes FROM compras
            UNION
            SELECT date_trunc('month', fecha) AS mes FROM movimientos_caja
        ),
        ventas_mes AS (
            SELECT date_trunc('month', fecha) AS mes, SUM(total) AS ingresos
            FROM ventas GROUP BY 1
        ),
        compras_mes AS (
            SELECT date_trunc('month', fecha) AS mes, SUM(total) AS compras
            FROM compras GROUP BY 1
        ),
        gastos_mes AS (
            SELECT date_trunc('month', fecha) AS mes, SUM(ABS(importe)) AS gastos
            FROM movimientos_caja WHERE tipo = 'gasto' GROUP BY 1
        )
        SELECT to_char(meses.mes, 'YYYY-MM') AS periodo,
               COALESCE(ventas_mes.ingresos, 0) AS ingresos,
               COALESCE(compras_mes.compras, 0) AS compras,
               COALESCE(gastos_mes.gastos, 0) AS gastos,
               COALESCE(ventas_mes.ingresos, 0) - COALESCE(compras_mes.compras, 0) - COALESCE(gastos_mes.gastos, 0) AS resultado
        FROM meses
        LEFT JOIN ventas_mes USING (mes)
        LEFT JOIN compras_mes USING (mes)
        LEFT JOIN gastos_mes USING (mes)
        ORDER BY periodo
    """))).mappings().all()

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
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    totals = (await db.execute(text("""
        SELECT
            COUNT(DISTINCT cliente_id) AS clientes_con_movimiento,
            COALESCE(SUM(CASE WHEN tipo = 'factura' THEN importe ELSE 0 END), 0) AS facturado,
            COALESCE(SUM(CASE WHEN tipo = 'recibo' THEN ABS(importe) ELSE 0 END), 0) AS cobrado,
            COALESCE(SUM(importe), 0) AS saldo_total
        FROM cuentas_corrientes_clientes
    """))).mappings().one()
    top_saldos = (await db.execute(text("""
        SELECT cliente_id, cliente_nombre, MAX(fecha) AS ultimo_movimiento,
               COALESCE(SUM(importe), 0) AS saldo
        FROM cuentas_corrientes_clientes
        GROUP BY cliente_id, cliente_nombre
        ORDER BY saldo DESC
        LIMIT 10
    """))).mappings().all()
    ageing = (await db.execute(text("""
        SELECT
            SUM(CASE WHEN fecha_vencimiento < now() THEN GREATEST(importe, 0) ELSE 0 END) AS vencido,
            SUM(CASE WHEN fecha_vencimiento >= now() THEN GREATEST(importe, 0) ELSE 0 END) AS a_vencer
        FROM cuentas_corrientes_clientes
        WHERE tipo = 'factura'
    """))).mappings().one()

    return {
        "summary": {
            "clientes_con_movimiento": totals["clientes_con_movimiento"],
            "facturado": money(totals["facturado"]),
            "cobrado": money(totals["cobrado"]),
            "saldo_total": money(totals["saldo_total"]),
            "vencido": money(ageing["vencido"]),
            "a_vencer": money(ageing["a_vencer"]),
        },
        "top_saldos": [
            {
                **dict(row),
                "ultimo_movimiento": row["ultimo_movimiento"].isoformat() if row["ultimo_movimiento"] else None,
            }
            for row in top_saldos
        ],
    }


@router.get("/proveedores/resumen")
async def proveedores_resumen(
    company_id: int = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    totals = (await db.execute(text("""
        SELECT
            COUNT(DISTINCT proveedor_id) AS proveedores_con_movimiento,
            COALESCE(SUM(CASE WHEN tipo = 'factura' THEN importe ELSE 0 END), 0) AS facturado,
            COALESCE(SUM(CASE WHEN tipo = 'pago' THEN ABS(importe) ELSE 0 END), 0) AS pagado,
            COALESCE(SUM(importe), 0) AS saldo_total
        FROM cuentas_corrientes_proveedores
    """))).mappings().one()
    top_saldos = (await db.execute(text("""
        SELECT proveedor_id, proveedor_nombre, MAX(fecha) AS ultimo_movimiento,
               COALESCE(SUM(importe), 0) AS saldo
        FROM cuentas_corrientes_proveedores
        GROUP BY proveedor_id, proveedor_nombre
        ORDER BY saldo DESC
        LIMIT 10
    """))).mappings().all()
    proximos_pagos = (await db.execute(text("""
        SELECT proveedor_id, proveedor_nombre, comprobante_id, fecha_vencimiento, importe
        FROM cuentas_corrientes_proveedores
        WHERE tipo = 'factura' AND fecha_vencimiento IS NOT NULL
        ORDER BY fecha_vencimiento
        LIMIT 10
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
        "proximos_pagos": [
            {
                **dict(row),
                "fecha_vencimiento": row["fecha_vencimiento"].isoformat() if row["fecha_vencimiento"] else None,
            }
            for row in proximos_pagos
        ],
    }


@router.get("/caja/resumen")
async def caja_resumen(
    company_id: int = None,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    totals = (await db.execute(text("""
        SELECT
            COALESCE(SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END), 0) AS ingresos,
            COALESCE(SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END), 0) AS egresos,
            COALESCE(SUM(importe), 0) AS saldo_neto,
            COUNT(*) AS movimientos
        FROM movimientos_caja
    """))).mappings().one()
    series = (await db.execute(text("""
        SELECT to_char(date_trunc('month', fecha), 'YYYY-MM') AS periodo,
               COALESCE(SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END), 0) AS ingresos,
               COALESCE(SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END), 0) AS egresos,
               COALESCE(SUM(importe), 0) AS saldo_neto
        FROM movimientos_caja
        GROUP BY 1
        ORDER BY 1
    """))).mappings().all()
    ultimos_movimientos = (await db.execute(text("""
        SELECT fecha, tipo, descripcion, importe, saldo_acumulado
        FROM movimientos_caja
        ORDER BY fecha DESC
        LIMIT 15
    """))).mappings().all()

    return {
        "summary": {
            "ingresos": money(totals["ingresos"]),
            "egresos": money(totals["egresos"]),
            "saldo_neto": money(totals["saldo_neto"]),
            "movimientos": totals["movimientos"],
        },
        "series": [dict(row) for row in series],
        "ultimos_movimientos": [
            {
                **dict(row),
                "fecha": row["fecha"].isoformat() if row["fecha"] else None,
            }
            for row in ultimos_movimientos
        ],
    }
