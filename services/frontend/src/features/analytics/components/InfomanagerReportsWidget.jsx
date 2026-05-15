import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

import apiClient from '../../../api/client';
import useAuthStore from '../../../store/authStore';
import { useFilterStore } from '../../../store/filterStore';
import ExportButton from '../../../components/analytics/ExportButton';
import { buildQueryParams } from '../analyticsUtils';

const NOTE_FALLBACK = 'InfoManager no publica este reporte como endpoint exportable en Swagger v1.';

const appendQueryParam = (qs, key, value) => {
  const params = new URLSearchParams(qs.startsWith('?') ? qs.slice(1) : qs);
  params.set(key, value);
  const query = params.toString();
  return query ? `?${query}` : '';
};

const sanitizeFilename = (value) => (
  String(value || 'infomanager_reporte')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
);

const flattenPayload = (row) => {
  const payload = row?.payload || {};
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      value && typeof value === 'object' ? JSON.stringify(value) : value,
    ])
  );
};

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const text = String(value);
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
};

export const INFOMANAGER_REPORT_GROUPS = {
  clientes: [
    { label: 'Saldos de Cuentas Corrientes de Clientes', reportKey: 'saldos_clientes' },
    { label: 'Cuenta Corriente de Cliente', reportKey: 'cta_cte_clientes' },
    { label: 'Anticipos Emitidos vs Cancelados', reportKey: 'anticipos_clientes' },
    { label: 'Comprobantes Pendientes Totales', reportKey: 'comprobantes_pendientes_clientes' },
    { label: 'Comprobantes Pendientes por Cliente', reportKey: 'comprobantes_pendientes_clientes' },
    { label: 'Remitos vs Facturas por Cliente', reportKey: 'comprobantes_relacion' },
    { label: 'Remitos a Cliente', reportKey: 'remitos_cliente' },
    { label: 'Listado de Clientes', reportKey: 'clientes' },
    { label: 'Listado de Facturas', reportKey: 'facturas_clientes' },
    { label: 'Listado de Notas de Credito', reportKey: 'notas_credito_clientes' },
    { label: 'Listado de Notas de Debito', reportKey: 'notas_debito_clientes' },
    { label: 'Exportacion Ingresos Brutos', reportKey: 'iva_balance' },
    { label: 'Percepciones de Ingresos Brutos', reportKey: 'iva_balance' },
    { label: 'Margen de Rentabilidad', reportKey: 'margen_rentabilidad' },
    { label: 'Margen Bruto Mensual', reportKey: 'margen_bruto_mensual' },
  ],
  proveedores: [
    { label: 'Saldos de Cuentas Corrientes de Proveedores', reportKey: 'facturas_compras' },
    { label: 'Cuenta Corriente de Proveedor', reportKey: 'cta_cte_proveedores' },
    { label: 'Anticipos Emitidos vs Cancelados', reportKey: 'anticipos_proveedores' },
    { label: 'Gastos por Rubro de Proveedores', reportKey: 'gastos_por_rubro_proveedores' },
    { label: 'Comprobantes Pendientes Totales', reportKey: 'comprobantes_pendientes_proveedores' },
    { label: 'Comprobantes Pendientes por Proveedor', reportKey: 'comprobantes_pendientes_proveedores' },
    { label: 'Remitos vs Facturas', reportKey: 'comprobantes_relacion' },
    { label: 'Facturas vs Remitos por Totales de Articulos', reportKey: 'facturas_vs_remitos_articulos' },
    { label: 'Diferencias de cambio en Ctas.Ctes. de proveedores', reportKey: 'facturas_compras' },
    { label: 'Saldo de Proveedores-Clientes', reportKey: 'saldos_proveedores_clientes' },
    { label: 'Conciliacion Proveedor-Cliente', reportKey: 'conciliacion_proveedor_cliente' },
    { label: 'Saldo de Proveedores por Cuenta Contable', reportKey: 'saldos_proveedores_por_cuenta' },
    { label: 'Listado de Proveedores', reportKey: 'proveedores' },
  ],
  stock: [
    { label: 'Movimientos de Stock', reportKey: 'interdeposito' },
    { label: 'Existencias de Stock', reportKey: 'stock_existencias' },
    { label: 'Movimientos por Articulo', reportKey: 'movimientos_por_articulo' },
    { label: 'Proyeccion de Stock', reportKey: 'proyeccion_stock' },
    { label: 'Listado de Articulos', reportKey: 'articulos' },
  ],
  caja: [
    { label: 'Saldos de Disponibilidades', reportKey: 'disponible_por_cliente' },
    { label: 'Listado de Cheques Emitidos', reportKey: 'cheques' },
    { label: 'Listado de Cheques en Cartera', reportKey: 'cheques' },
    { label: 'Informe de seguimiento de cheques', reportKey: 'cheques' },
    { label: 'Historico de Cheques en Cartera', reportKey: 'cheques' },
    { label: 'Cash Flow', reportKey: 'cash_flow' },
  ],
  contabilidad: [
    { label: 'IVA Compras', reportKey: 'iva_compras' },
    { label: 'IVA Ventas', reportKey: 'iva_ventas' },
    { label: 'Libro Diario Resumido Mensual', reportKey: 'iva_balance' },
    { label: 'Libro Diario', reportKey: 'iva_balance' },
    { label: 'Libro Mayor', reportKey: 'mayor_contable' },
    { label: 'Libro Mayor Detallado', reportKey: 'mayor_contable' },
    { label: 'Balance de Sumas y Saldos', reportKey: 'iva_balance' },
    { label: 'Estado de Resultados', reportKey: 'estado_resultados_derivado' },
    { label: 'Balance General', reportKey: 'iva_balance' },
    { label: 'Balance Clasificado', reportKey: 'iva_balance' },
    { label: 'Plan de Cuentas', reportKey: 'planes' },
  ],
  ventas: [
    { label: 'Ventas', reportKey: 'ventas' },
    { label: 'Analisis de Compra/Ventas por Articulo', reportKey: 'ventas_items' },
    { label: 'Analisis de Compra/Ventas por Factura', reportKey: 'facturas_clientes' },
    { label: 'Facturas con Recibos', reportKey: 'facturas_con_recibos' },
    { label: 'Listado de Facturas', reportKey: 'facturas_clientes' },
    { label: 'Listado de Notas de Credito', reportKey: 'notas_credito_clientes' },
    { label: 'Listado de Notas de Debito', reportKey: 'notas_debito_clientes' },
    { label: 'Remitos vs Facturas', reportKey: 'comprobantes_relacion' },
    { label: 'Remitos', reportKey: 'remitos_cliente' },
    { label: 'Exportacion Ingresos Brutos', reportKey: 'iva_balance' },
    { label: 'Percepciones de Ingresos Brutos', reportKey: 'iva_balance' },
    { label: 'Margen de Rentabilidad', reportKey: 'margen_rentabilidad' },
    { label: 'Margen Bruto Mensual', reportKey: 'margen_bruto_mensual' },
  ],
  compras: [
    { label: 'Compras', reportKey: 'compras' },
    { label: 'Compras por Articulo', reportKey: 'compras_items' },
    { label: 'Analisis de Compra por Factura', reportKey: 'compras_por_factura' },
    { label: 'Facturas Pendientes de Proveedores', reportKey: 'facturas_compras' },
    { label: 'Facturas vs Remitos por Totales de Articulos', reportKey: 'facturas_vs_remitos_articulos' },
    { label: 'Remitos vs Facturas', reportKey: 'comprobantes_relacion' },
    { label: 'Comprobantes Destino', reportKey: 'comprobantes_destino' },
  ],
  vendedores: [
    { label: 'Ventas por Vendedor', reportKey: 'ventas_por_vendedor' },
    { label: 'Clientes por Vendedor', reportKey: 'clientes_por_vendedor' },
    { label: 'Comisiones por Recibos', reportKey: 'comisiones_por_recibos' },
    { label: 'Libro de Viajantes', reportKey: 'clientes_por_vendedor' },
    { label: 'Listado de Vendedores', reportKey: 'vendedores' },
  ],
};

export function createInfomanagerReportsWidget(reports) {
  return function InfomanagerReportsWidget() {
    const user = useAuthStore((s) => s.user);
    const activeCompany = useAuthStore((s) => s.activeCompany);
    const filterStore = useFilterStore();
    const canFetch = Boolean(user?.company_id || (user?.is_admin && activeCompany));
    const panelRef = useRef(null);

    const [selectedKey, setSelectedKey] = useState(reports[0]?.label || '');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const selected = useMemo(
      () => reports.find((item) => item.label === selectedKey) || reports[0],
      [selectedKey]
    );

    const filters = useMemo(() => ({
      desde: filterStore.desde,
      hasta: filterStore.hasta,
      comparar_anterior: filterStore.comparar_anterior,
      cod_empresa: filterStore.cod_empresa,
      tag: filterStore.tag,
      punto_de_venta: filterStore.punto_de_venta,
      cod_vendedor: filterStore.cod_vendedor,
      cod_rubro: filterStore.cod_rubro,
      cod_subrubro: filterStore.cod_subrubro,
      tipo_comprobante: filterStore.tipo_comprobante,
      condicion_venta: filterStore.condicion_venta,
      cod_cliente: filterStore.cod_cliente,
      cod_articulo: filterStore.cod_articulo,
      cod_deposito: filterStore.cod_deposito,
      incluir_anuladas: filterStore.incluir_anuladas,
    }), [filterStore]);

    const qs = buildQueryParams(user, activeCompany, filters);
    const rows = useMemo(() => (data?.rows || []).map(flattenPayload), [data]);
    const columns = useMemo(() => {
      const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
      return keys.map((key) => ({ key, label: key }));
    }, [rows]);
    const visibleColumns = columns.slice(0, 8);
    const unsupported = data?.supported === false;

    const fetchReport = async () => {
      if (!canFetch || !selected?.reportKey) return;
      setLoading(true);
      setError(null);
      try {
        const reportQs = appendQueryParam(qs, 'limit', 500);
        const response = await apiClient.get(`/analytics/infomanager/reportes/${selected.reportKey}${reportQs}`);
        setData(response.data);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar este informe.');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchReport();
    }, [canFetch, selected?.reportKey, qs]);

    return (
      <div ref={panelRef} className="flex h-full min-h-0 bg-white">
        <aside className="w-64 shrink-0 overflow-auto border-r border-slate-100 bg-slate-50">
          <div className="sticky top-0 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Informes
          </div>
          <div className="space-y-1 p-2">
            {reports.map((report) => (
              <button
                key={report.label}
                type="button"
                onClick={() => setSelectedKey(report.label)}
                className={`w-full rounded-md px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                  selectedKey === report.label
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                {report.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{selected?.label}</p>
              <p className="text-xs text-slate-400">
                {rows.length ? `${rows.length} filas cargadas` : 'Sin filas cargadas'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchReport}
                disabled={loading || !canFetch}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Recalcular
              </button>
              <ExportButton
                data={rows}
                columns={columns}
                filename={sanitizeFilename(selected?.label)}
                panelRef={panelRef}
                size="sm"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {loading && (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Cargando informe...
              </div>
            )}

            {!loading && error && (
              <div className="m-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {!loading && !error && unsupported && (
              <div className="m-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{data?.note || NOTE_FALLBACK}</span>
              </div>
            )}

            {!loading && !error && !unsupported && !rows.length && (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
                No hay datos sincronizados para este informe en el periodo seleccionado.
              </div>
            )}

            {!loading && !error && !unsupported && rows.length > 0 && (
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    {visibleColumns.map((column) => (
                      <th key={column.key} className="whitespace-nowrap border-b border-slate-100 px-3 py-2 font-semibold">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      {visibleColumns.map((column) => (
                        <td key={column.key} className="max-w-[220px] whitespace-nowrap px-3 py-2 text-slate-600">
                          {displayValue(row[column.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    );
  };
}
