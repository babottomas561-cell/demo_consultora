"""add iva_10_5 and iva_27 to compras for IVA discrimination

Revision ID: g2h3i4j5k6l7
Revises: f1g2h3i4j5k6
Create Date: 2026-05-21 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'g2h3i4j5k6l7'
down_revision: Union[str, None] = 'f1g2h3i4j5k6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('compras', sa.Column('iva_10_5', sa.Float(), nullable=True))
    op.add_column('compras', sa.Column('iva_27',   sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('compras', 'iva_27')
    op.drop_column('compras', 'iva_10_5')
