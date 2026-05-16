"""add empresas_infomanager and lista_precios tables

Revision ID: j1k2l3m4n5o6
Revises: i1j2k3l4m5n6
Create Date: 2026-05-16 20:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "j1k2l3m4n5o6"
down_revision: Union[str, None] = "i1j2k3l4m5n6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "empresas_infomanager",
        sa.Column("cod_empresa", sa.Integer(), nullable=False, primary_key=True),
        sa.Column("nombre", sa.Text(), nullable=True),
        sa.Column("cuit", sa.Text(), nullable=True),
        sa.Column("direccion", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("habilitada", sa.Boolean(), server_default="true", nullable=False),
    )

    op.create_table(
        "lista_precios",
        sa.Column("cod_lista", sa.Integer(), nullable=False),
        sa.Column("cod_articulo", sa.Text(), nullable=False),
        sa.Column("nombre_lista", sa.Text(), nullable=True),
        sa.Column("fecha_vigencia", sa.Date(), nullable=True),
        sa.Column("precio", sa.Numeric(), nullable=True),
        sa.Column("precio_con_iva", sa.Numeric(), nullable=True),
        sa.Column("porcentaje", sa.Numeric(), nullable=True),
        sa.PrimaryKeyConstraint("cod_lista", "cod_articulo"),
    )


def downgrade() -> None:
    op.drop_table("lista_precios")
    op.drop_table("empresas_infomanager")
