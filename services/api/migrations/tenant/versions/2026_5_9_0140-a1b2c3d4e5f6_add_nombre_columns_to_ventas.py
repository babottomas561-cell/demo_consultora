"""add producto_nombre and cliente_nombre to ventas

Revision ID: a1b2c3d4e5f6
Revises: 6cc2593259b7
Create Date: 2026-05-09 01:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '6cc2593259b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('ventas', sa.Column('producto_nombre', sa.Text(), nullable=True))
    op.add_column('ventas', sa.Column('cliente_nombre', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('ventas', 'cliente_nombre')
    op.drop_column('ventas', 'producto_nombre')
