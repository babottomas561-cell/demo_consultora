"""fix_ventas_unique_add_tipo_comprobante

FA y NC del mismo producto/cliente/fecha colisionaban en el upsert porque el
unique constraint no incluia tipo_comprobante. Esto causaba que NC sobreescribia
FA, dejando fa_bruto=0 y nc_total inflado → facturacion neta negativa.

Revision ID: f2a3b4c5d6e7
Revises: b7c8d9e0f1a2
Create Date: 2026-05-12 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'f2a3b4c5d6e7'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old 3-field constraint that allowed FA/NC collisions
    op.drop_constraint('idx_venta_unica', 'ventas', type_='unique')

    # New 4-field constraint: FA and NC for same product/client/date are distinct rows
    op.create_unique_constraint(
        'idx_venta_unica',
        'ventas',
        ['fecha', 'cliente_id', 'producto_id', 'tipo_comprobante'],
    )


def downgrade() -> None:
    op.drop_constraint('idx_venta_unica', 'ventas', type_='unique')
    op.create_unique_constraint(
        'idx_venta_unica',
        'ventas',
        ['fecha', 'cliente_id', 'producto_id'],
    )
