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
        "comprobantes_clientes",
        "pagos_clientes",
        "comprobantes_proveedores",
        "pagos_proveedores",
        "comisiones_vendedores",
        "infomanager_report_rows",
    }

    assert expected_tables.issubset(TenantBase.metadata.tables.keys())


def test_analytics_tables_have_required_business_columns():
    compras = TenantBase.metadata.tables["compras"].columns
    cta_clientes = TenantBase.metadata.tables["cuentas_corrientes_clientes"].columns
    cta_proveedores = TenantBase.metadata.tables["cuentas_corrientes_proveedores"].columns
    caja = TenantBase.metadata.tables["movimientos_caja"].columns

    assert {
        "fecha",
        "proveedor_id",
        "producto_id",
        "cantidad",
        "precio_unitario",
        "total",
        "tipo_comprobante",
        "neto",
        "iva_importe",
        "anulada",
        "cod_deposito",
    }.issubset(compras.keys())
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


def test_compras_unique_constraint_keeps_comprobante_type_distinct():
    compras = TenantBase.metadata.tables["compras"]
    constraint = next(
        item for item in compras.constraints
        if item.name == "idx_compra_unica"
    )

    assert [column.name for column in constraint.columns] == [
        "fecha",
        "proveedor_id",
        "producto_id",
        "tipo_comprobante",
    ]


def test_document_drilldown_tables_have_required_columns_and_constraints():
    comprobantes_clientes = TenantBase.metadata.tables["comprobantes_clientes"]
    pagos_clientes = TenantBase.metadata.tables["pagos_clientes"]
    comprobantes_proveedores = TenantBase.metadata.tables["comprobantes_proveedores"]
    pagos_proveedores = TenantBase.metadata.tables["pagos_proveedores"]
    comisiones = TenantBase.metadata.tables["comisiones_vendedores"]

    assert {
        "comprobante_id",
        "cliente_id",
        "cliente_nombre",
        "tipo",
        "fecha",
        "importe_total",
        "importe_pagado",
        "saldo",
        "cod_vendedor",
    }.issubset(comprobantes_clientes.columns.keys())
    assert {"pago_id", "comprobante_id", "fecha", "forma_pago", "importe"}.issubset(pagos_clientes.columns.keys())
    assert {
        "comprobante_id",
        "proveedor_id",
        "proveedor_nombre",
        "tipo",
        "fecha",
        "importe_total",
        "importe_pagado",
        "saldo",
    }.issubset(comprobantes_proveedores.columns.keys())
    assert {"pago_id", "comprobante_id", "fecha", "forma_pago", "importe"}.issubset(pagos_proveedores.columns.keys())
    assert {"cod_vendedor", "periodo", "base_cobrada", "porcentaje", "comision"}.issubset(comisiones.columns.keys())

    constraint_names = {
        constraint.name
        for table in (comprobantes_clientes, pagos_clientes, comprobantes_proveedores, pagos_proveedores, comisiones)
        for constraint in table.constraints
    }

    assert "idx_comprobante_cliente_unico" in constraint_names
    assert "idx_pago_cliente_unico" in constraint_names
    assert "idx_comprobante_proveedor_unico" in constraint_names
    assert "idx_pago_proveedor_unico" in constraint_names
    assert "idx_comision_vendedor_periodo_unica" in constraint_names


def test_infomanager_report_rows_store_raw_report_payloads_idempotently():
    table = TenantBase.metadata.tables["infomanager_report_rows"]

    assert {
        "report_key",
        "report_name",
        "row_key",
        "fecha_desde",
        "fecha_hasta",
        "payload",
        "synced_at",
    }.issubset(table.columns.keys())

    constraint = next(
        item for item in table.constraints
        if item.name == "idx_infomanager_report_row_unica"
    )

    assert [column.name for column in constraint.columns] == ["report_key", "row_key"]
