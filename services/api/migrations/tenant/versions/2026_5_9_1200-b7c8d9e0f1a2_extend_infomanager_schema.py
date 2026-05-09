"""extend tenant schema for infomanager analytics

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-05-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('ventas', sa.Column('tipo_comprobante', sa.Text(), server_default='FA', nullable=True))
    op.add_column('ventas', sa.Column('tipo_factura', sa.Text(), nullable=True))
    op.add_column('ventas', sa.Column('punto_de_venta', sa.Integer(), nullable=True))
    op.add_column('ventas', sa.Column('cod_vendedor', sa.Integer(), nullable=True))
    op.add_column('ventas', sa.Column('cod_empresa', sa.Integer(), server_default='1', nullable=True))
    op.add_column('ventas', sa.Column('tag', sa.Text(), server_default='S', nullable=True))
    op.add_column('ventas', sa.Column('condicion_venta_tipo', sa.Integer(), nullable=True))
    op.add_column('ventas', sa.Column('neto', sa.Numeric(), nullable=True))
    op.add_column('ventas', sa.Column('iva_importe', sa.Numeric(), nullable=True))
    op.add_column('ventas', sa.Column('anulada', sa.Text(), server_default='N', nullable=True))
    op.add_column('ventas', sa.Column('cod_deposito', sa.Integer(), nullable=True))
    op.add_column('ventas', sa.Column('cod_rubro', sa.Integer(), nullable=True))
    op.add_column('ventas', sa.Column('cod_subrubro', sa.Integer(), nullable=True))
    op.add_column('ventas', sa.Column('precio_compra_actual', sa.Numeric(), nullable=True))
    op.add_column('ventas', sa.Column('descuento_porc', sa.Numeric(), server_default='0', nullable=True))
    op.execute("""
        UPDATE ventas
        SET
            tipo_comprobante = COALESCE(tipo_comprobante, 'FA'),
            tipo_factura = COALESCE(tipo_factura, CASE WHEN cliente_id LIKE 'MAY%' THEN 'A' ELSE 'B' END),
            punto_de_venta = COALESCE(punto_de_venta, ((id % 3) + 1)),
            cod_vendedor = COALESCE(cod_vendedor, ((id % 5) + 1)),
            cod_empresa = COALESCE(cod_empresa, 1),
            tag = COALESCE(tag, 'S'),
            condicion_venta_tipo = COALESCE(condicion_venta_tipo, CASE WHEN cliente_id LIKE 'MAY%' THEN 2 ELSE 1 END),
            neto = COALESCE(neto, total / 1.21),
            iva_importe = COALESCE(iva_importe, total - (total / 1.21)),
            anulada = COALESCE(anulada, 'N'),
            cod_deposito = COALESCE(cod_deposito, CASE WHEN id % 4 = 0 THEN 2 ELSE 1 END),
            cod_rubro = COALESCE(cod_rubro, CASE
                WHEN producto_id LIKE 'REM%' THEN 1
                WHEN producto_id LIKE 'PAN%' THEN 2
                WHEN producto_id LIKE 'VES%' THEN 3
                WHEN producto_id LIKE 'CAM%' THEN 4
                WHEN producto_id LIKE 'BUZ%' THEN 5
                WHEN producto_id LIKE 'CAL%' THEN 6
                WHEN producto_id LIKE 'ACC%' THEN 7
                ELSE 8
            END),
            cod_subrubro = COALESCE(cod_subrubro, CASE producto_id
                WHEN 'REM001' THEN 101
                WHEN 'REM002' THEN 102
                WHEN 'PAN001' THEN 201
                WHEN 'PAN002' THEN 202
                WHEN 'VES001' THEN 301
                WHEN 'VES002' THEN 302
                WHEN 'CAM001' THEN 401
                WHEN 'CAM002' THEN 402
                WHEN 'BUZ001' THEN 501
                WHEN 'CAL001' THEN 601
                WHEN 'CAL002' THEN 602
                WHEN 'CAL003' THEN 603
                WHEN 'ACC001' THEN 701
                WHEN 'ACC002' THEN 702
                ELSE 801
            END),
            precio_compra_actual = COALESCE(precio_compra_actual, precio_unitario * 0.55),
            descuento_porc = COALESCE(descuento_porc, CASE WHEN cliente_id LIKE 'MAY%' THEN 25 ELSE 0 END)
    """)

    op.create_table(
        'vendedores',
        sa.Column('cod_vendedor', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.Text(), nullable=False),
        sa.Column('email', sa.Text(), nullable=True),
        sa.Column('habilitado', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('cuota_mensual', sa.Numeric(), nullable=True),
        sa.PrimaryKeyConstraint('cod_vendedor'),
    )
    op.create_table(
        'puntos_de_venta',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.Text(), nullable=False),
        sa.Column('cod_empresa', sa.Integer(), nullable=True),
        sa.Column('habilitado', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'rubros',
        sa.Column('cod_rubro', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('cod_rubro'),
    )
    op.create_table(
        'subrubros',
        sa.Column('cod_subrubro', sa.Integer(), nullable=False),
        sa.Column('cod_rubro', sa.Integer(), nullable=True),
        sa.Column('nombre', sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(['cod_rubro'], ['rubros.cod_rubro']),
        sa.PrimaryKeyConstraint('cod_subrubro'),
    )
    op.create_table(
        'presupuestos',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=True),
        sa.Column('cod_cliente', sa.Integer(), nullable=True),
        sa.Column('cliente_nombre', sa.Text(), nullable=True),
        sa.Column('cod_vendedor', sa.Integer(), nullable=True),
        sa.Column('total', sa.Numeric(), nullable=True),
        sa.Column('confirmado', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        sa.Column('fecha_conversion', sa.Date(), nullable=True),
        sa.Column('venta_id', sa.BigInteger(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'recibos',
        sa.Column('id', sa.BigInteger(), nullable=False),
        sa.Column('fecha', sa.Date(), nullable=True),
        sa.Column('cod_cliente', sa.Integer(), nullable=True),
        sa.Column('cliente_nombre', sa.Text(), nullable=True),
        sa.Column('forma_pago', sa.Text(), nullable=True),
        sa.Column('importe', sa.Numeric(), nullable=True),
        sa.Column('factura_id', sa.BigInteger(), nullable=True),
        sa.Column('tarjeta_numero', sa.Text(), nullable=True),
        sa.Column('tarjeta_cupon', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'depositos',
        sa.Column('cod_deposito', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.Text(), nullable=False),
        sa.Column('habilitado', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.PrimaryKeyConstraint('cod_deposito'),
    )
    op.create_table(
        'stock',
        sa.Column('cod_articulo', sa.Integer(), nullable=False),
        sa.Column('cod_deposito', sa.Integer(), nullable=False),
        sa.Column('cantidad', sa.Numeric(), nullable=True),
        sa.Column('stock_minimo', sa.Numeric(), server_default='0', nullable=True),
        sa.Column('precio_compra_actual', sa.Numeric(), nullable=True),
        sa.Column('ultima_actualizacion', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('cod_articulo', 'cod_deposito'),
    )


def downgrade() -> None:
    op.drop_table('stock')
    op.drop_table('depositos')
    op.drop_table('recibos')
    op.drop_table('presupuestos')
    op.drop_table('subrubros')
    op.drop_table('rubros')
    op.drop_table('puntos_de_venta')
    op.drop_table('vendedores')

    for column_name in [
        'descuento_porc',
        'precio_compra_actual',
        'cod_subrubro',
        'cod_rubro',
        'cod_deposito',
        'anulada',
        'iva_importe',
        'neto',
        'condicion_venta_tipo',
        'tag',
        'cod_empresa',
        'cod_vendedor',
        'punto_de_venta',
        'tipo_factura',
        'tipo_comprobante',
    ]:
        op.drop_column('ventas', column_name)
