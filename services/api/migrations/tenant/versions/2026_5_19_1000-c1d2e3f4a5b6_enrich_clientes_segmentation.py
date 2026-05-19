"""enrich clientes with segmentation fields from InfoManager

Revision ID: c1d2e3f4a5b6
Revises: b7c8d9e0f1a2
Create Date: 2026-05-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('clientes', sa.Column('cuit',             sa.Text(),    nullable=True))
    op.add_column('clientes', sa.Column('email',            sa.Text(),    nullable=True))
    op.add_column('clientes', sa.Column('cod_vendedor',     sa.Integer(), nullable=True))
    op.add_column('clientes', sa.Column('habilitado',       sa.Boolean(), server_default=sa.text('true'), nullable=True))
    op.add_column('clientes', sa.Column('cod_zona',         sa.Integer(), nullable=True))
    op.add_column('clientes', sa.Column('lista_precio',     sa.Integer(), nullable=True))
    op.add_column('clientes', sa.Column('condicion_venta',  sa.Integer(), nullable=True))
    op.add_column('clientes', sa.Column('cod_rubro_cliente',sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('clientes', 'cod_rubro_cliente')
    op.drop_column('clientes', 'condicion_venta')
    op.drop_column('clientes', 'lista_precio')
    op.drop_column('clientes', 'cod_zona')
    op.drop_column('clientes', 'habilitado')
    op.drop_column('clientes', 'cod_vendedor')
    op.drop_column('clientes', 'email')
    op.drop_column('clientes', 'cuit')
