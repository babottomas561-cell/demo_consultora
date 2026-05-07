from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, desc
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

@router.get("/kpis")
async def get_kpis(
    company_id: int = None,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):

    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await db.execute(text(f'SET search_path TO "{tenant_schema}"'))

    now = datetime.now()
    start_of_month = get_month_start(now, 0)
    start_of_last_month = get_month_start(now, 1)

    # total_ventas_mes
    result_ventas_mes = await db.execute(
        select(func.sum(Venta.total)).where(Venta.fecha >= start_of_month)
    )
    total_ventas_mes = result_ventas_mes.scalar() or 0.0

    # total_ventas_mes_anterior
    result_ventas_mes_ant = await db.execute(
        select(func.sum(Venta.total)).where(
            Venta.fecha >= start_of_last_month,
            Venta.fecha < start_of_month
        )
    )
    total_ventas_mes_anterior = result_ventas_mes_ant.scalar() or 0.0

    # total_clientes
    result_clientes = await db.execute(
        select(func.count(func.distinct(Venta.cliente_id)))
    )
    total_clientes = result_clientes.scalar() or 0

    # total_transacciones
    result_trans = await db.execute(select(func.count(Venta.id)))
    total_transacciones = result_trans.scalar() or 0

    # ultimo_sync (max created_at)
    result_sync = await db.execute(select(func.max(Venta.created_at)))
    ultimo_sync = result_sync.scalar()

    # ventas_por_mes (last 6 months)
    start_of_6_months = get_month_start(now, 5)
    
    mes_expr = func.to_char(Venta.fecha, text("'YYYY-MM'"))
    stmt = (
        select(
            mes_expr.label('mes'),
            func.sum(Venta.total).label('total')
        )
        .where(Venta.fecha >= start_of_6_months)
        .group_by(mes_expr)
        .order_by(mes_expr)
    )
    result_meses = await db.execute(stmt)
    
    ventas_por_mes = [
        {"mes": row.mes, "total": float(row.total)} for row in result_meses
    ]

    return {
        "total_ventas_mes": float(total_ventas_mes),
        "total_ventas_mes_anterior": float(total_ventas_mes_anterior),
        "total_clientes": total_clientes,
        "total_transacciones": total_transacciones,
        "ultimo_sync": ultimo_sync.isoformat() if ultimo_sync else None,
        "ventas_por_mes": ventas_por_mes
    }

@router.get("/top-clientes")
async def get_top_clientes(
    company_id: int = None,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    tenant_schema = await get_tenant_schema(current_user, db, company_id)
    await db.execute(text(f'SET search_path TO "{tenant_schema}"'))

    now = datetime.now()
    start_of_month = get_month_start(now, 0)

    stmt = (
        select(
            Venta.cliente_id,
            Cliente.nombre.label('cliente_nombre'),
            func.sum(Venta.total).label('total'),
            func.count(Venta.id).label('transacciones')
        )
        .join(Cliente, Venta.cliente_id == Cliente.external_id)
        .where(Venta.fecha >= start_of_month)
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
