"""add cod_lista_precios to ventas

Revision ID: k3l4m5n6o7p8
Revises: j2k3l4m5n6o7
Create Date: 2026-05-17 02:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "k3l4m5n6o7p8"
down_revision: Union[str, None] = "j2k3l4m5n6o7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("ventas", sa.Column("cod_lista_precios", sa.Integer(), nullable=True))
    op.create_index("ix_ventas_cod_lista_precios", "ventas", ["cod_lista_precios"])


def downgrade() -> None:
    op.drop_index("ix_ventas_cod_lista_precios", table_name="ventas")
    op.drop_column("ventas", "cod_lista_precios")
