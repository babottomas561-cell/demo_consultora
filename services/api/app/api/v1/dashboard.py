from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, desc, extract
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.central import Company
from app.models.tenant import Venta, Cliente
from datetime import datetime

router = APIRouter()

async def get_tenant_schema(current_user, db: AsyncSession, company_id: int = None):
    target_company_id = company_id if (company_id and current_user.is_admin) else current_user.company_id
    if not target_company_id:
        raise HTTPException(status_code=400, detail="User not associated with a company")

    result = await db.execute(select(Company).filter(Company.id == target_company_id))
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return company.tenant_schema

def get_month_start(dt, months_offset=0):
    m = dt.month - months_offset
    y = dt.year
    while m <= 0:
        m += 12
        y -= 1
    return datetime(y, m, 1)

def get_next_month_start(dt):
    m = dt.month + 1
    y = dt.year
    if m > 12:
        m = 1
        y += 1
    return datetime(y, m, 1)

async def _resolve_reference_month(db):
    """Find the last month with sales data. Falls back to current month."""
    now = datetime.now()
    start_of_month = get_month_start(now, 0)

    check = await db.execute(
        select(func.count(Venta.id)).where(Venta.fecha >= start_of_month)
    )
    if (check.scalar() or 0) > 0:
        return start_of_month

    result = await db.execute(select(func.max(Venta.fecha)))
    max_fecha = result.scalar()
    if max_fecha:
        return datetime(max_fecha.year, max_fecha.month, 1)
    return start_of_month

@router.get("/kpis")
async def get_kpis(
    company_id: int = None,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await db.execute(text(f'SET search_path TO "{tenant_schema}"'))

    ref_month = await _resolve_reference_month(db)
    ref_month_end = get_next_month_start(ref_month)
    prev_month = get_month_start(ref_month, 1)
    is_current = ref_month.month == datetime.now().month and ref_month.year == datetime.now().year

    result_ventas_mes = await db.execute(
        select(func.sum(Venta.total)).where(
            Venta.fecha >= ref_month, Venta.fecha < ref_month_end
        )
    )
    total_ventas_mes = result_ventas_mes.scalar() or 0.0

    result_ventas_mes_ant = await db.execute(
        select(func.sum(Venta.total)).where(
            Venta.fecha >= prev_month,
            Venta.fecha < ref_month
        )
    )
    total_ventas_mes_anterior = result_ventas_mes_ant.scalar() or 0.0

    result_clientes = await db.execute(
        select(func.count(func.distinct(Venta.cliente_id)))
    )
    total_clientes = result_clientes.scalar() or 0

    result_trans = await db.execute(select(func.count(Venta.id)))
    total_transacciones = result_trans.scalar() or 0

    result_sync = await db.execute(select(func.max(Venta.created_at)))
    ultimo_sync = result_sync.scalar()

    start_of_6_months = get_month_start(ref_month, 5)

    mes_expr = func.to_char(Venta.fecha, text("'YYYY-MM'"))
    stmt = (
        select(
            mes_expr.label('mes'),
            func.sum(Venta.total).label('total')
        )
        .where(Venta.fecha >= start_of_6_months, Venta.fecha < ref_month_end)
        .group_by(mes_expr)
        .order_by(mes_expr)
    )
    result_meses = await db.execute(stmt)

    ventas_por_mes = [
        {"mes": row.mes, "total": float(row.total)} for row in result_meses
    ]

    MESES_ES = {1:'enero',2:'febrero',3:'marzo',4:'abril',5:'mayo',6:'junio',
                 7:'julio',8:'agosto',9:'septiembre',10:'octubre',11:'noviembre',12:'diciembre'}
    month_label = f"{MESES_ES[ref_month.month]} {ref_month.year}" if not is_current else None

    return {
        "total_ventas_mes": float(total_ventas_mes),
        "total_ventas_mes_anterior": float(total_ventas_mes_anterior),
        "total_clientes": total_clientes,
        "total_transacciones": total_transacciones,
        "ultimo_sync": ultimo_sync.isoformat() if ultimo_sync else None,
        "ventas_por_mes": ventas_por_mes,
        "referencia_mes": ref_month.isoformat(),
        "referencia_label": month_label,
    }

@router.get("/top-clientes")
async def get_top_clientes(
    company_id: int = None,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await db.execute(text(f'SET search_path TO "{tenant_schema}"'))

    ref_month = await _resolve_reference_month(db)
    ref_month_end = get_next_month_start(ref_month)

    stmt = (
        select(
            Venta.cliente_id,
            Cliente.nombre.label('cliente_nombre'),
            func.sum(Venta.total).label('total'),
            func.count(Venta.id).label('transacciones')
        )
        .join(Cliente, Venta.cliente_id == Cliente.external_id)
        .where(Venta.fecha >= ref_month, Venta.fecha < ref_month_end)
        .group_by(Venta.cliente_id, Cliente.nombre)
        .order_by(desc('total'))
        .limit(5)
    )
    result = await db.execute(stmt)

    return [
        {
            "cliente_id": row.cliente_id,
            "cliente_nombre": row.cliente_nombre,
            "total": float(row.total),
            "transacciones": row.transacciones
        }
        for row in result
    ]
