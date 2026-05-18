"""add proveedores maestro table

Revision ID: k1l2m3n4o5p6
Revises: j2k3l4m5n6o7
Create Date: 2026-05-17 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "k1l2m3n4o5p6"
down_revision: Union[str, None] = "j2k3l4m5n6o7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "proveedores",
        sa.Column("cod_proveedor", sa.String(), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("cuit", sa.Text(), nullable=True),
        sa.Column("habilitado", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("synced_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.PrimaryKeyConstraint("cod_proveedor"),
    )


def downgrade() -> None:
    op.drop_table("proveedores")
