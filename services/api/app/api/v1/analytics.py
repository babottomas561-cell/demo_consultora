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
        SELECT producto_id, COALESCE(MAX(producto_nombre), producto_id) AS producto_nombre,
               COALESCE(SUM(total), 0) AS total,
               COALESCE(SUM(cantidad), 0) AS unidades
        FROM ventas
        GROUP BY producto_id
        ORDER BY total DESC
        LIMIT 10
    """))).mappings().all()
    top_clientes = (await db.execute(text("""
        SELECT cliente_id, COALESCE(MAX(cliente_nombre), cliente_id) AS cliente_nombre,
               COUNT(*) AS transacciones,
               COALESCE(SUM(total), 0) AS facturacion,
               CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(total), 0) / COUNT(*) ELSE 0 END AS ticket_promedio
        FROM ventas
        GROUP BY cliente_id
        ORDER BY facturacion DESC
        LIMIT 10
    """))).mappings().all()

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

    total_ventas_row = (await db.execute(text("""
        SELECT COALESCE(SUM(total), 0) AS total FROM ventas
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
    top_productos = (await db.execute(text("""
        SELECT producto_id, COALESCE(MAX(producto_nombre), producto_id) AS producto_nombre,
               COALESCE(SUM(cantidad), 0) AS cantidad,
               COALESCE(SUM(total), 0) AS total
        FROM compras
        GROUP BY producto_id
        ORDER BY total DESC
        LIMIT 10
    """))).mappings().all()

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
               COALESCE(SUM(CASE WHEN importe > 0 THEN importe ELSE 0 END), 0) AS cobros,
               COALESCE(SUM(CASE WHEN importe < 0 THEN ABS(importe) ELSE 0 END), 0) AS pagos,
               COALESCE(SUM(importe), 0) AS saldo_neto
        FROM movimientos_caja
        GROUP BY 1
        ORDER BY 1
    """))).mappings().all()

    # Build cumulative saldo
    saldo_acum = 0
    series_with_acum = []
    for row in series:
        d = dict(row)
        saldo_acum += d["saldo_neto"]
        d["saldo_acumulado"] = saldo_acum
        series_with_acum.append(d)

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
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    stock = (await db.execute(text("""
        WITH compradas AS (
            SELECT producto_id,
                   COALESCE(MAX(producto_nombre), producto_id) AS producto_nombre,
                   COALESCE(SUM(cantidad), 0) AS unidades_compradas,
                   CASE WHEN SUM(cantidad) > 0 THEN SUM(total) / SUM(cantidad) ELSE 0 END AS precio_unitario_promedio
            FROM compras
            GROUP BY producto_id
        ),
        vendidas AS (
            SELECT producto_id,
                   COALESCE(SUM(cantidad), 0) AS unidades_vendidas
            FROM ventas
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
    """))).mappings().all()

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
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await set_tenant_search_path(db, tenant_schema)

    VENDEDORES = [
        {"id": "V001", "nombre": "Lucas García"},
        {"id": "V002", "nombre": "María López"},
        {"id": "V003", "nombre": "Carlos Ruiz"},
        {"id": "V004", "nombre": "Ana Martínez"},
        {"id": "V005", "nombre": "Diego Fernández"},
    ]

    # Get all client sales summaries
    client_sales = (await db.execute(text("""
        SELECT cliente_id,
               COUNT(*) AS transacciones,
               COALESCE(SUM(total), 0) AS facturacion
        FROM ventas
        GROUP BY cliente_id
    """))).mappings().all()

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
