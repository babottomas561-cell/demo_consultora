import os
import sys


sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.models.tenant import TenantBase


def test_tenant_metadata_contains_analytics_tables():
    expected_tables = {
        "compras",
        "cuentas_corrientes_clientes",
        "cuentas_corrientes_proveedores",
        "movimientos_caja",
    }

    assert expected_tables.issubset(TenantBase.metadata.tables.keys())


def test_analytics_tables_have_required_business_columns():
    compras = TenantBase.metadata.tables["compras"].columns
    cta_clientes = TenantBase.metadata.tables["cuentas_corrientes_clientes"].columns
    cta_proveedores = TenantBase.metadata.tables["cuentas_corrientes_proveedores"].columns
    caja = TenantBase.metadata.tables["movimientos_caja"].columns

    assert {"fecha", "proveedor_id", "producto_id", "cantidad", "precio_unitario", "total"}.issubset(compras.keys())
    assert {"cliente_id", "tipo", "importe", "saldo_acumulado", "fecha_vencimiento"}.issubset(cta_clientes.keys())
    assert {"proveedor_id", "tipo", "importe", "saldo_acumulado", "fecha_vencimiento"}.issubset(cta_proveedores.keys())
    assert {"fecha", "tipo", "descripcion", "importe", "saldo_acumulado"}.issubset(caja.keys())


def test_analytics_tables_define_idempotent_seed_constraints():
    compras = TenantBase.metadata.tables["compras"]
    cta_clientes = TenantBase.metadata.tables["cuentas_corrientes_clientes"]
    cta_proveedores = TenantBase.metadata.tables["cuentas_corrientes_proveedores"]
    caja = TenantBase.metadata.tables["movimientos_caja"]

    constraint_names = {
        constraint.name
        for table in (compras, cta_clientes, cta_proveedores, caja)
        for constraint in table.constraints
    }

    assert "idx_compra_unica" in constraint_names
    assert "idx_cta_cte_cliente_unica" in constraint_names
    assert "idx_cta_cte_proveedor_unica" in constraint_names
    assert "idx_movimiento_caja_unico" in constraint_names


def test_ventas_unique_constraint_keeps_comprobante_type_distinct():
    ventas = TenantBase.metadata.tables["ventas"]
    constraint = next(
        item for item in ventas.constraints
        if item.name == "idx_venta_unica"
    )

    assert [column.name for column in constraint.columns] == [
        "fecha",
        "cliente_id",
        "producto_id",
        "tipo_comprobante",
    ]
