"""add cotizaciones table for exchange rate history

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-05-19 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'cotizaciones',
        sa.Column('id',       sa.Integer(), primary_key=True),
        sa.Column('fecha',    sa.Date(),    nullable=False),
        sa.Column('moneda',   sa.Text(),    nullable=False),
        sa.Column('valor',    sa.Numeric(), nullable=False),
        sa.UniqueConstraint('fecha', 'moneda', name='uq_cotizacion_fecha_moneda'),
    )
    op.create_index('ix_cotizaciones_fecha', 'cotizaciones', ['fecha'])


def downgrade() -> None:
    op.drop_index('ix_cotizaciones_fecha', 'cotizaciones')
    op.drop_table('cotizaciones')
