"""add saldos_proveedores and interdepositos tables

Revision ID: f1g2h3i4j5k6
Revises: e3f4a5b6c7d8
Create Date: 2026-05-21 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f1g2h3i4j5k6'
down_revision: Union[str, None] = 'e3f4a5b6c7d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Facturas de compra con saldo pendiente (source: /reportes/facturas_compras)
    op.create_table(
        'saldos_proveedores',
        sa.Column('fa_id',           sa.BigInteger(), primary_key=True),
        sa.Column('fa_fecha',        sa.Date(),       nullable=True),
        sa.Column('fa_pto_vta',      sa.Integer(),    nullable=True),
        sa.Column('fa_nro',          sa.BigInteger(), nullable=True),
        sa.Column('fa_cod_empresa',  sa.Integer(),    nullable=True),
        sa.Column('moneda',          sa.Text(),       nullable=True),
        sa.Column('cod_proveedor',   sa.Integer(),    nullable=True),
        sa.Column('nombre',          sa.Text(),       nullable=True),
        sa.Column('fa_total',        sa.Numeric(),    nullable=True),
        sa.Column('op_imp_pagado',   sa.Numeric(),    nullable=True),
        sa.Column('saldo_fa',        sa.Numeric(),    nullable=True),
        sa.Column('nro_ultima_op',   sa.Text(),       nullable=True),
        sa.Column('primer_fec_vto',  sa.Date(),       nullable=True),
        sa.Column('ult_fec_vto',     sa.Date(),       nullable=True),
        sa.Column('vto_cant_cuotas', sa.Integer(),    nullable=True),
        sa.Column('vto_importe',     sa.Numeric(),    nullable=True),
        sa.Column('synced_at',       sa.DateTime(),   server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index('ix_saldos_prov_proveedor', 'saldos_proveedores', ['cod_proveedor'])
    op.create_index('ix_saldos_prov_empresa',   'saldos_proveedores', ['fa_cod_empresa'])
    op.create_index('ix_saldos_prov_vto',       'saldos_proveedores', ['ult_fec_vto'])

    # Movimientos de interdeposito entre depósitos (source: /api/v1/interdeposito)
    op.create_table(
        'interdepositos',
        sa.Column('id',              sa.BigInteger(), primary_key=True),
        sa.Column('fecha',           sa.Date(),       nullable=True),
        sa.Column('cod_articulo',    sa.Integer(),    nullable=True),
        sa.Column('descripcion',     sa.Text(),       nullable=True),
        sa.Column('cantidad',        sa.Numeric(),    nullable=True),
        sa.Column('precio',          sa.Numeric(),    nullable=True),
        sa.Column('total',           sa.Numeric(),    nullable=True),
        sa.Column('deposito_origen', sa.Integer(),    nullable=True),
        sa.Column('deposito_destino',sa.Integer(),    nullable=True),
        sa.Column('cod_empresa',     sa.Integer(),    nullable=True),
        sa.Column('estado',          sa.Text(),       nullable=True),
        sa.Column('observacion',     sa.Text(),       nullable=True),
        sa.Column('synced_at',       sa.DateTime(),   server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index('ix_interdep_fecha',    'interdepositos', ['fecha'])
    op.create_index('ix_interdep_articulo', 'interdepositos', ['cod_articulo'])


def downgrade() -> None:
    op.drop_index('ix_interdep_articulo', 'interdepositos')
    op.drop_index('ix_interdep_fecha',    'interdepositos')
    op.drop_table('interdepositos')

    op.drop_index('ix_saldos_prov_vto',       'saldos_proveedores')
    op.drop_index('ix_saldos_prov_empresa',   'saldos_proveedores')
    op.drop_index('ix_saldos_prov_proveedor', 'saldos_proveedores')
    op.drop_table('saldos_proveedores')
