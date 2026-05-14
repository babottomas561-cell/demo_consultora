"""add infomanager document drilldown tables

Revision ID: g1h2i3j4k5l6
Revises: f2a3b4c5d6e7
Create Date: 2026-05-13 21:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g1h2i3j4k5l6"
down_revision: Union[str, None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "comprobantes_clientes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("comprobante_id", sa.String(), nullable=False),
        sa.Column("cliente_id", sa.String(), nullable=False),
        sa.Column("cliente_nombre", sa.String(), nullable=False),
        sa.Column("tipo", sa.String(), nullable=False),
        sa.Column("numero", sa.String(), nullable=True),
        sa.Column("punto_de_venta", sa.String(), nullable=True),
        sa.Column("fecha", sa.DateTime(), nullable=True),
        sa.Column("fecha_vencimiento", sa.DateTime(), nullable=True),
        sa.Column("importe_total", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("importe_pagado", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("saldo", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("cod_vendedor", sa.Integer(), nullable=True),
        sa.Column("detalle", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("comprobante_id", "tipo", name="idx_comprobante_cliente_unico"),
    )
    op.create_index(op.f("ix_comprobantes_clientes_id"), "comprobantes_clientes", ["id"], unique=False)
    op.create_index("ix_comprobantes_clientes_cliente_id", "comprobantes_clientes", ["cliente_id"], unique=False)

    op.create_table(
        "pagos_clientes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pago_id", sa.String(), nullable=False),
        sa.Column("comprobante_id", sa.String(), nullable=False),
        sa.Column("fecha", sa.DateTime(), nullable=True),
        sa.Column("forma_pago", sa.String(), nullable=True),
        sa.Column("importe", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("cod_cliente", sa.Integer(), nullable=True),
        sa.Column("cliente_nombre", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pago_id", "comprobante_id", name="idx_pago_cliente_unico"),
    )
    op.create_index(op.f("ix_pagos_clientes_id"), "pagos_clientes", ["id"], unique=False)
    op.create_index("ix_pagos_clientes_comprobante_id", "pagos_clientes", ["comprobante_id"], unique=False)

    op.create_table(
        "comprobantes_proveedores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("comprobante_id", sa.String(), nullable=False),
        sa.Column("proveedor_id", sa.String(), nullable=False),
        sa.Column("proveedor_nombre", sa.String(), nullable=False),
        sa.Column("tipo", sa.String(), nullable=False),
        sa.Column("numero", sa.String(), nullable=True),
        sa.Column("punto_de_venta", sa.String(), nullable=True),
        sa.Column("fecha", sa.DateTime(), nullable=True),
        sa.Column("fecha_vencimiento", sa.DateTime(), nullable=True),
        sa.Column("importe_total", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("importe_pagado", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("saldo", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("detalle", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("comprobante_id", "tipo", name="idx_comprobante_proveedor_unico"),
    )
    op.create_index(op.f("ix_comprobantes_proveedores_id"), "comprobantes_proveedores", ["id"], unique=False)
    op.create_index("ix_comprobantes_proveedores_proveedor_id", "comprobantes_proveedores", ["proveedor_id"], unique=False)

    op.create_table(
        "pagos_proveedores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pago_id", sa.String(), nullable=False),
        sa.Column("comprobante_id", sa.String(), nullable=False),
        sa.Column("fecha", sa.DateTime(), nullable=True),
        sa.Column("forma_pago", sa.String(), nullable=True),
        sa.Column("importe", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("proveedor_id", sa.String(), nullable=True),
        sa.Column("proveedor_nombre", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pago_id", "comprobante_id", name="idx_pago_proveedor_unico"),
    )
    op.create_index(op.f("ix_pagos_proveedores_id"), "pagos_proveedores", ["id"], unique=False)
    op.create_index("ix_pagos_proveedores_comprobante_id", "pagos_proveedores", ["comprobante_id"], unique=False)

    op.create_table(
        "comisiones_vendedores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cod_vendedor", sa.Integer(), nullable=False),
        sa.Column("vendedor_nombre", sa.String(), nullable=True),
        sa.Column("periodo", sa.String(), nullable=False),
        sa.Column("base_cobrada", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("porcentaje", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("comision", sa.Numeric(), server_default="0", nullable=False),
        sa.Column("recibos", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cod_vendedor", "periodo", name="idx_comision_vendedor_periodo_unica"),
    )
    op.create_index(op.f("ix_comisiones_vendedores_id"), "comisiones_vendedores", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_comisiones_vendedores_id"), table_name="comisiones_vendedores")
    op.drop_table("comisiones_vendedores")
    op.drop_index("ix_pagos_proveedores_comprobante_id", table_name="pagos_proveedores")
    op.drop_index(op.f("ix_pagos_proveedores_id"), table_name="pagos_proveedores")
    op.drop_table("pagos_proveedores")
    op.drop_index("ix_comprobantes_proveedores_proveedor_id", table_name="comprobantes_proveedores")
    op.drop_index(op.f("ix_comprobantes_proveedores_id"), table_name="comprobantes_proveedores")
    op.drop_table("comprobantes_proveedores")
    op.drop_index("ix_pagos_clientes_comprobante_id", table_name="pagos_clientes")
    op.drop_index(op.f("ix_pagos_clientes_id"), table_name="pagos_clientes")
    op.drop_table("pagos_clientes")
    op.drop_index("ix_comprobantes_clientes_cliente_id", table_name="comprobantes_clientes")
    op.drop_index(op.f("ix_comprobantes_clientes_id"), table_name="comprobantes_clientes")
    op.drop_table("comprobantes_clientes")
