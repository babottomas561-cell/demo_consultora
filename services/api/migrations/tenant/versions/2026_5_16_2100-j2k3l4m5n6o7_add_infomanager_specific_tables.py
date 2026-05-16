"""add infomanager specific report tables

Revision ID: j2k3l4m5n6o7
Revises: i1j2k3l4m5n6
Create Date: 2026-05-16 21:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "j2k3l4m5n6o7"
down_revision: Union[str, None] = "i1j2k3l4m5n6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "empresas_infomanager",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cod_empresa", sa.Integer(), nullable=False, unique=True),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("nombre_1", sa.Text(), nullable=True),
        sa.Column("cuit", sa.Text(), nullable=True),
        sa.Column("direccion", sa.Text(), nullable=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("telefonos", sa.Text(), nullable=True),
        sa.Column("categoria_iva", sa.Text(), nullable=True),
        sa.Column("habilitada", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("cod_deposito_default", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_table(
        "listas_precios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cod_lista", sa.Integer(), nullable=False, unique=True),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("aplica_a", sa.Text(), nullable=True),
        sa.Column("cod_empresa", sa.Integer(), nullable=True),
        sa.Column("habilitado", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_table(
        "items_listas_precios",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("cod_lista", sa.Integer(), nullable=False),
        sa.Column("cod_articulo", sa.Integer(), nullable=False),
        sa.Column("art_descripcion", sa.Text(), nullable=True),
        sa.Column("art_precio_compra", sa.Numeric(), nullable=True),
        sa.Column("art_precio_venta", sa.Numeric(), nullable=True),
        sa.Column("art_iva", sa.Numeric(), nullable=True),
        sa.Column("lista_porcentaje", sa.Numeric(), nullable=True),
        sa.Column("lista_precio_sugerido", sa.Numeric(), nullable=True),
        sa.Column("lista_precio_base", sa.Numeric(), nullable=True),
        sa.Column("lista_descuento", sa.Numeric(), nullable=True),
        sa.Column("lista_precio_con_iva", sa.Numeric(), nullable=True),
        sa.Column("lista_precio_venta", sa.Numeric(), nullable=True),
        sa.Column("lista_cotizacion", sa.Numeric(), nullable=True),
        sa.Column("fecha_actualizacion", sa.Date(), nullable=True),
        sa.Column("synced_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("cod_lista", "cod_articulo", name="idx_items_lista_unico"),
    )

    op.create_table(
        "facturas_venta",
        sa.Column("fa_id", sa.BigInteger(), primary_key=True),
        sa.Column("tipo_comprobante", sa.Text(), nullable=True),
        sa.Column("tipo_factura", sa.Text(), nullable=True),
        sa.Column("fa_cod_empresa", sa.Integer(), nullable=True),
        sa.Column("fa_fecha", sa.Date(), nullable=True),
        sa.Column("fa_cc", sa.Text(), nullable=True),
        sa.Column("fa_pto_vta", sa.Integer(), nullable=True),
        sa.Column("fa_nro", sa.BigInteger(), nullable=True),
        sa.Column("fa_moneda", sa.Text(), nullable=True),
        sa.Column("fa_cotiz", sa.Numeric(), nullable=True),
        sa.Column("cod_cliente", sa.Integer(), nullable=True),
        sa.Column("cod_vendedor", sa.Integer(), nullable=True),
        sa.Column("fa_total", sa.Numeric(), nullable=True),
        sa.Column("fa_total_moneda_local", sa.Numeric(), nullable=True),
        sa.Column("primer_fec_vto", sa.Date(), nullable=True),
        sa.Column("ult_fec_vto", sa.Date(), nullable=True),
        sa.Column("vto_cant_cuotas", sa.Integer(), nullable=True),
        sa.Column("vto_importe", sa.Numeric(), nullable=True),
        sa.Column("rc_imp_pagado", sa.Numeric(), nullable=True),
        sa.Column("saldo_fa", sa.Numeric(), nullable=True),
        sa.Column("ultimo_recibo", sa.BigInteger(), nullable=True),
        sa.Column("remitos_asociados", sa.Text(), nullable=True),
        sa.Column("synced_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_table(
        "facturas_compra",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("fecha", sa.Date(), nullable=True),
        sa.Column("fecha_comprobante", sa.Date(), nullable=True),
        sa.Column("tipo_comprobante", sa.Text(), nullable=True),
        sa.Column("tipo_factura", sa.Text(), nullable=True),
        sa.Column("numero", sa.BigInteger(), nullable=True),
        sa.Column("punto_de_venta", sa.Integer(), nullable=True),
        sa.Column("moneda", sa.Text(), nullable=True),
        sa.Column("cotizacion", sa.Numeric(), nullable=True),
        sa.Column("importe_total", sa.Numeric(), nullable=True),
        sa.Column("importe_iva", sa.Numeric(), nullable=True),
        sa.Column("cod_proveedor", sa.Integer(), nullable=True),
        sa.Column("proveedor", sa.Text(), nullable=True),
        sa.Column("cod_empresa", sa.Integer(), nullable=True),
        sa.Column("tag", sa.Text(), nullable=True),
        sa.Column("anulada", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("cod_deposito", sa.Integer(), nullable=True),
        sa.Column("nro_cai", sa.Text(), nullable=True),
        sa.Column("id_orden_de_compra", sa.BigInteger(), nullable=True),
        sa.Column("synced_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_table(
        "facturas_con_recibos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("fa_id", sa.BigInteger(), nullable=False),
        sa.Column("tipo_comp", sa.Text(), nullable=True),
        sa.Column("fa_cod_empresa", sa.Integer(), nullable=True),
        sa.Column("fa_fecha", sa.Date(), nullable=True),
        sa.Column("fa_cc", sa.Text(), nullable=True),
        sa.Column("fa_pto_vta", sa.Integer(), nullable=True),
        sa.Column("fa_nro", sa.BigInteger(), nullable=True),
        sa.Column("fa_moneda", sa.Text(), nullable=True),
        sa.Column("fa_cotiz", sa.Numeric(), nullable=True),
        sa.Column("cod_cliente", sa.Integer(), nullable=True),
        sa.Column("fa_total", sa.Numeric(), nullable=True),
        sa.Column("fa_total_moneda_local", sa.Numeric(), nullable=True),
        sa.Column("rc_id", sa.BigInteger(), nullable=True),
        sa.Column("rc_fecha", sa.Date(), nullable=True),
        sa.Column("rc_nro", sa.BigInteger(), nullable=True),
        sa.Column("rc_moneda", sa.Text(), nullable=True),
        sa.Column("rc_cotiz", sa.Numeric(), nullable=True),
        sa.Column("imp_pag_moneda_local", sa.Numeric(), nullable=True),
        sa.Column("cond_pago", sa.Text(), nullable=True),
        sa.Column("importe", sa.Numeric(), nullable=True),
        sa.Column("cod_banco", sa.Integer(), nullable=True),
        sa.Column("cheque_numero", sa.Text(), nullable=True),
        sa.Column("cheque_fec_pago", sa.Date(), nullable=True),
        sa.Column("importe_retencion", sa.Numeric(), nullable=True),
        sa.Column("primer_fec_vto", sa.Date(), nullable=True),
        sa.Column("ult_fec_vto", sa.Date(), nullable=True),
        sa.Column("synced_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.UniqueConstraint("fa_id", "rc_id", name="idx_factura_recibo_unico"),
    )

    op.create_table(
        "saldos_clientes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("cod_cliente", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.Text(), nullable=True),
        sa.Column("fecha", sa.Date(), nullable=True),
        sa.Column("dias_deuda", sa.Integer(), nullable=True),
        sa.Column("tot_entrada", sa.Numeric(), nullable=True),
        sa.Column("tot_salida", sa.Numeric(), nullable=True),
        sa.Column("tot_saldo", sa.Numeric(), nullable=True),
        sa.Column("color", sa.Integer(), nullable=True),
        sa.Column("prevision", sa.Numeric(), nullable=True),
        sa.Column("cod_cuenta", sa.BigInteger(), nullable=True),
        sa.Column("cta_descripcion", sa.Text(), nullable=True),
        sa.Column("snapshot_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_table(
        "comprobantes_pendientes_clientes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("comprobante_id", sa.BigInteger(), nullable=False),
        sa.Column("tipo_comprobante", sa.Text(), nullable=True),
        sa.Column("cod_cliente", sa.Integer(), nullable=True),
        sa.Column("nombre", sa.Text(), nullable=True),
        sa.Column("cod_empresa", sa.Integer(), nullable=True),
        sa.Column("cod_vendedor", sa.Integer(), nullable=True),
        sa.Column("punto_de_venta", sa.Text(), nullable=True),
        sa.Column("numero", sa.Text(), nullable=True),
        sa.Column("importe_factura", sa.Numeric(), nullable=True),
        sa.Column("importe_pagado", sa.Numeric(), nullable=True),
        sa.Column("saldo", sa.Numeric(), nullable=True),
        sa.Column("fecha_factura", sa.Date(), nullable=True),
        sa.Column("dias_deuda", sa.Integer(), nullable=True),
        sa.Column("color", sa.Integer(), nullable=True),
        sa.Column("moneda_fa", sa.Text(), nullable=True),
        sa.Column("detalle", sa.Text(), nullable=True),
        sa.Column("snapshot_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_table(
        "stock_disponible",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("cod_articulo", sa.Integer(), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("cod_deposito", sa.Integer(), nullable=True),
        sa.Column("stock_entradas", sa.Numeric(), nullable=True),
        sa.Column("stock_salidas", sa.Numeric(), nullable=True),
        sa.Column("compras", sa.Numeric(), nullable=True),
        sa.Column("ventas", sa.Numeric(), nullable=True),
        sa.Column("existencia", sa.Numeric(), nullable=True),
        sa.Column("existencia_anterior", sa.Numeric(), nullable=True),
        sa.Column("precio_compra", sa.Numeric(), nullable=True),
        sa.Column("precio_venta", sa.Numeric(), nullable=True),
        sa.Column("pto_de_reposicion", sa.Numeric(), nullable=True),
        sa.Column("cod_rubro", sa.Integer(), nullable=True),
        sa.Column("rubro", sa.Text(), nullable=True),
        sa.Column("cod_subrubro", sa.Integer(), nullable=True),
        sa.Column("subrubro", sa.Text(), nullable=True),
        sa.Column("proveedor", sa.Text(), nullable=True),
        sa.Column("habilitado", sa.Integer(), nullable=True),
        sa.Column("snapshot_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_table(
        "movimientos_stock",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("cod_articulo", sa.Integer(), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("fecha", sa.Date(), nullable=True),
        sa.Column("tipo_movimiento", sa.Text(), nullable=True),
        sa.Column("cantidad", sa.Numeric(), nullable=True),
        sa.Column("precio", sa.Numeric(), nullable=True),
        sa.Column("total", sa.Numeric(), nullable=True),
        sa.Column("cod_deposito", sa.Integer(), nullable=True),
        sa.Column("cod_empresa", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )

    op.create_table(
        "movimientos_contables",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("fecha", sa.Date(), nullable=True),
        sa.Column("cuenta", sa.BigInteger(), nullable=True),
        sa.Column("plan_descripcion", sa.Text(), nullable=True),
        sa.Column("debe", sa.Numeric(), nullable=True),
        sa.Column("haber", sa.Numeric(), nullable=True),
        sa.Column("tipo_comprobante", sa.Text(), nullable=True),
        sa.Column("numero", sa.Text(), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("cod_empresa", sa.Integer(), nullable=True),
        sa.Column("tag", sa.Text(), nullable=True),
        sa.Column("cod_unidad_negocio", sa.Integer(), nullable=True),
        sa.Column("movimiento", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )


def downgrade() -> None:
    for table in [
        "movimientos_contables",
        "movimientos_stock",
        "stock_disponible",
        "comprobantes_pendientes_clientes",
        "saldos_clientes",
        "facturas_con_recibos",
        "facturas_compra",
        "facturas_venta",
        "items_listas_precios",
        "listas_precios",
        "empresas_infomanager",
    ]:
        op.drop_table(table)
