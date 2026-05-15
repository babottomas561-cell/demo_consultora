"""extend compras with infomanager fiscal fields

Revision ID: i1j2k3l4m5n6
Revises: h1i2j3k4l5m6
Create Date: 2026-05-14 18:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "i1j2k3l4m5n6"
down_revision: Union[str, None] = "h1i2j3k4l5m6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("compras", sa.Column("tipo_comprobante", sa.Text(), server_default="FC", nullable=True))
    op.add_column("compras", sa.Column("tipo_factura", sa.Text(), nullable=True))
    op.add_column("compras", sa.Column("punto_de_venta", sa.Integer(), nullable=True))
    op.add_column("compras", sa.Column("cod_empresa", sa.Integer(), server_default="1", nullable=True))
    op.add_column("compras", sa.Column("neto", sa.Numeric(), nullable=True))
    op.add_column("compras", sa.Column("iva_importe", sa.Numeric(), nullable=True))
    op.add_column("compras", sa.Column("anulada", sa.Text(), server_default="N", nullable=True))
    op.add_column("compras", sa.Column("cod_deposito", sa.Integer(), nullable=True))
    op.execute("""
        UPDATE compras
        SET
          tipo_comprobante = COALESCE(tipo_comprobante, 'FC'),
          cod_empresa = COALESCE(cod_empresa, 1),
          anulada = COALESCE(anulada, 'N')
    """)
    op.drop_constraint("idx_compra_unica", "compras", type_="unique")
    op.create_unique_constraint(
        "idx_compra_unica",
        "compras",
        ["fecha", "proveedor_id", "producto_id", "tipo_comprobante"],
    )


def downgrade() -> None:
    op.drop_constraint("idx_compra_unica", "compras", type_="unique")
    op.create_unique_constraint(
        "idx_compra_unica",
        "compras",
        ["fecha", "proveedor_id", "producto_id"],
    )
    for column_name in [
        "cod_deposito",
        "anulada",
        "iva_importe",
        "neto",
        "cod_empresa",
        "punto_de_venta",
        "tipo_factura",
        "tipo_comprobante",
    ]:
        op.drop_column("compras", column_name)
