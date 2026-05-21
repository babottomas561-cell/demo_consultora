"""add moneda/iva discriminado to ventas, semaforo to cta_cte_clientes, origen_sistema to presupuestos

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-05-21 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, None] = 'd2e3f4a5b6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── ventas: multi-moneda + IVA discriminado ──────────────────────────────
    op.add_column('ventas', sa.Column('moneda',     sa.String(1),  nullable=True))
    op.add_column('ventas', sa.Column('cotizacion', sa.Float(),    nullable=True))
    op.add_column('ventas', sa.Column('iva_10_5',   sa.Float(),    nullable=True))
    op.add_column('ventas', sa.Column('iva_27',     sa.Float(),    nullable=True))

    # ── cuentas_corrientes_clientes: semáforo InfoManager ───────────────────
    op.add_column('cuentas_corrientes_clientes', sa.Column('color',     sa.String(10), nullable=True))
    op.add_column('cuentas_corrientes_clientes', sa.Column('dias_deuda', sa.Integer(), nullable=True))
    op.add_column('cuentas_corrientes_clientes', sa.Column('tot_saldo',  sa.Float(),   nullable=True))

    # ── presupuestos: canal de origen ────────────────────────────────────────
    op.add_column('presupuestos', sa.Column('origen_sistema', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column('presupuestos', 'origen_sistema')

    op.drop_column('cuentas_corrientes_clientes', 'tot_saldo')
    op.drop_column('cuentas_corrientes_clientes', 'dias_deuda')
    op.drop_column('cuentas_corrientes_clientes', 'color')

    op.drop_column('ventas', 'iva_27')
    op.drop_column('ventas', 'iva_10_5')
    op.drop_column('ventas', 'cotizacion')
    op.drop_column('ventas', 'moneda')
