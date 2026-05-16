import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import apiClient from '../../api/client';
import useAuthStore from '../../store/authStore';
import { useFilterStore } from '../../store/filterStore';
import { formatCurrency, buildQueryParams } from '../analytics/analyticsUtils';

// ─── helpers ────────────────────────────────────────────────────
const exportCSV = (filename, rows) => {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const moraColor = (dias) => {
  if (!dias || dias <= 0) return 'bg-green-100 text-green-800';
  if (dias <= 30) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

const pctColor = (pct) => {
  if (pct >= 90) return 'bg-green-100 text-green-800';
  if (pct >= 70) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

const badge = (text, cls) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
    {text}
  </span>
);

// ─── Skeleton loader ─────────────────────────────────────────────
const Skeleton = () => (
  <div className="animate-pulse space-y-3 p-4">
    <div className="h-8 w-40 rounded bg-slate-200" />
    <div className="h-4 w-64 rounded bg-slate-200" />
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="h-6 rounded bg-slate-100" />
    ))}
  </div>
);

// ─── Widget wrapper ───────────────────────────────────────────────
function ReporteWidget({ title, description, icon: Icon, csvFile, children, loading, error, onRetry }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Icon size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRetry}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="Recargar"
          >
            <RefreshCw size={14} />
          </button>
          {csvFile && (
            <button
              onClick={csvFile}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
            >
              <Download size={12} />
              Excel
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <Skeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-slate-400">
            <AlertCircle size={24} />
            <p className="text-sm">{error}</p>
            <button
              onClick={onRetry}
              className="text-xs text-indigo-600 hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ─── KPI bar ──────────────────────────────────────────────────────
function KpiBar({ items }) {
  return (
    <div className="flex flex-wrap gap-4 border-b border-slate-100 px-5 py-3 bg-slate-50">
      {items.map(({ label, value, sub }) => (
        <div key={label} className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
          <span className="text-lg font-bold text-slate-900">{value}</span>
          {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Expandable table ─────────────────────────────────────────────
function ExpandableTable({ columns, rows, renderRow, pageSize = 10 }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-left font-medium text-slate-500 ${col.right ? 'text-right' : ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-400">
                  Sin datos
                </td>
              </tr>
            ) : (
              visible.map((row, i) => renderRow(row, i))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-2 text-xs text-indigo-600 hover:bg-slate-50 transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Ver menos' : `Ver todos (${rows.length})`}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WIDGET 1: Saldos de Clientes
// ═══════════════════════════════════════════════════════════════════
function SaldosClientesWidget({ qs }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/analytics/reportes/saldos-clientes${qs}`);
      setData(res.data);
    } catch {
      setError('No se pudo cargar saldos de clientes');
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => { fetch(); }, [fetch]);

  const cols = [
    { key: 'nombre', label: 'Cliente' },
    { key: 'saldo_total', label: 'Saldo', right: true },
    { key: 'facturas_pendientes', label: 'Facturas' },
    { key: 'ultimo_mov', label: 'Último mov.' },
  ];

  return (
    <ReporteWidget
      title="Saldos por Cliente"
      description="Deuda pendiente de cobro por cliente"
      icon={FileText}
      loading={loading}
      error={error}
      onRetry={fetch}
      csvFile={data?.filas?.length ? () => exportCSV('saldos_clientes.csv', data.filas) : null}
    >
      {data && (
        <>
          <KpiBar items={[
            { label: 'Total deuda', value: formatCurrency(data.kpi.total_deuda) },
            { label: 'Clientes con deuda', value: data.kpi.clientes_con_deuda },
          ]} />
          <ExpandableTable
            columns={cols}
            rows={data.filas || []}
            renderRow={(r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-800 max-w-[200px] truncate">{r.nombre}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">{formatCurrency(r.saldo_total)}</td>
                <td className="px-3 py-2 text-slate-500">{r.facturas_pendientes}</td>
                <td className="px-3 py-2 text-slate-400">{r.ultimo_mov || '—'}</td>
              </tr>
            )}
          />
        </>
      )}
    </ReporteWidget>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WIDGET 2: Comprobantes Pendientes
// ═══════════════════════════════════════════════════════════════════
function ComprobPendientesWidget({ qs }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/analytics/reportes/comprob-pendientes${qs}`);
      setData(res.data);
    } catch {
      setError('No se pudo cargar comprobantes pendientes');
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => { fetch(); }, [fetch]);

  const cols = [
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'numero', label: 'Nro.' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'fecha_vencimiento', label: 'Vencimiento' },
    { key: 'dias_mora', label: 'Días mora' },
    { key: 'saldo', label: 'Saldo', right: true },
  ];

  return (
    <ReporteWidget
      title="Facturas por Cobrar"
      description="Comprobantes con saldo pendiente, ordenados por vencimiento"
      icon={FileText}
      loading={loading}
      error={error}
      onRetry={fetch}
      csvFile={data?.filas?.length ? () => exportCSV('comprob_pendientes.csv', data.filas) : null}
    >
      {data && (
        <>
          <KpiBar items={[
            { label: 'Total pendiente', value: formatCurrency(data.kpi.total_pendiente) },
            { label: 'Facturas', value: data.kpi.cantidad_facturas },
            { label: 'Vencidas', value: data.kpi.facturas_vencidas, sub: 'con mora' },
          ]} />
          <ExpandableTable
            columns={cols}
            rows={data.filas || []}
            renderRow={(r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate">{r.cliente_nombre}</td>
                <td className="px-3 py-2 text-slate-500">{r.numero || '—'}</td>
                <td className="px-3 py-2 text-slate-400">{r.fecha || '—'}</td>
                <td className="px-3 py-2 text-slate-400">{r.fecha_vencimiento || '—'}</td>
                <td className="px-3 py-2">
                  {badge(
                    r.dias_mora > 0 ? `${r.dias_mora}d` : 'Al día',
                    moraColor(r.dias_mora)
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">{formatCurrency(r.saldo)}</td>
              </tr>
            )}
          />
        </>
      )}
    </ReporteWidget>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WIDGET 3: Crédito Disponible
// ═══════════════════════════════════════════════════════════════════
function CreditoDisponibleWidget({ qs }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/analytics/reportes/disponible-credito${qs}`);
      setData(res.data);
    } catch {
      setError('No se pudo cargar crédito disponible');
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => { fetch(); }, [fetch]);

  const cols = [
    { key: 'nombre', label: 'Cliente' },
    { key: 'facturado_total', label: 'Facturado', right: true },
    { key: 'cobrado_total', label: 'Cobrado', right: true },
    { key: 'saldo_pendiente', label: 'Pendiente', right: true },
    { key: 'pct_cobrado', label: '% cobrado' },
  ];

  return (
    <ReporteWidget
      title="Cobranza por Cliente"
      description="Relación facturado / cobrado por cliente"
      icon={FileText}
      loading={loading}
      error={error}
      onRetry={fetch}
      csvFile={data?.filas?.length ? () => exportCSV('credito_disponible.csv', data.filas) : null}
    >
      {data && (
        <>
          <KpiBar items={[
            { label: 'Clientes con saldo', value: data.kpi.clientes_con_saldo },
            { label: 'Total clientes', value: data.kpi.total_clientes },
          ]} />
          <ExpandableTable
            columns={cols}
            rows={data.filas || []}
            renderRow={(r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate">{r.nombre}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">{formatCurrency(r.facturado_total)}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">{formatCurrency(r.cobrado_total)}</td>
                <td className="px-3 py-2 text-right font-mono font-medium text-slate-800">{formatCurrency(r.saldo_pendiente)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${r.pct_cobrado >= 90 ? 'bg-green-500' : r.pct_cobrado >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(r.pct_cobrado, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{r.pct_cobrado}%</span>
                  </div>
                </td>
              </tr>
            )}
          />
        </>
      )}
    </ReporteWidget>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WIDGET 4: Facturas con Pagos
// ═══════════════════════════════════════════════════════════════════
function FacturasConPagosWidget({ qs }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/analytics/reportes/facturas-con-pagos${qs}`);
      setData(res.data);
    } catch {
      setError('No se pudo cargar facturas con pagos');
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => { fetch(); }, [fetch]);

  const cols = [
    { key: 'numero', label: 'Factura' },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'importe_total', label: 'Total', right: true },
    { key: 'importe_pagado', label: 'Cobrado', right: true },
    { key: 'pct_cobrado', label: '% cobrado' },
  ];

  return (
    <ReporteWidget
      title="Eficiencia de Cobranza"
      description="Facturas del período con detalle de cobro"
      icon={FileText}
      loading={loading}
      error={error}
      onRetry={fetch}
      csvFile={data?.filas?.length ? () => exportCSV('facturas_con_pagos.csv', data.filas) : null}
    >
      {data && (
        <>
          <KpiBar items={[
            { label: 'Facturado', value: formatCurrency(data.kpi.total_facturado) },
            { label: 'Cobrado', value: formatCurrency(data.kpi.total_cobrado) },
            {
              label: 'Eficiencia',
              value: `${data.kpi.pct_eficiencia_cobranza}%`,
              sub: `${data.kpi.facturas_cobradas}/${data.kpi.total_facturas} facturas`,
            },
          ]} />
          <ExpandableTable
            columns={cols}
            rows={data.filas || []}
            renderRow={(r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-500">{r.numero || r.comprobante_id}</td>
                <td className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate">{r.cliente_nombre}</td>
                <td className="px-3 py-2 text-slate-400">{r.fecha || '—'}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">{formatCurrency(r.importe_total)}</td>
                <td className="px-3 py-2 text-right font-mono text-green-700">{formatCurrency(r.importe_pagado)}</td>
                <td className="px-3 py-2">
                  {badge(
                    `${r.pct_cobrado}%`,
                    pctColor(r.pct_cobrado)
                  )}
                </td>
              </tr>
            )}
          />
        </>
      )}
    </ReporteWidget>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WIDGET 5: Vencimientos a Proveedores
// ═══════════════════════════════════════════════════════════════════
function VencimientosComprasWidget({ qs }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/analytics/reportes/vencimientos-compras${qs}`);
      setData(res.data);
    } catch {
      setError('No se pudo cargar vencimientos de compras');
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => { fetch(); }, [fetch]);

  const cols = [
    { key: 'proveedor_nombre', label: 'Proveedor' },
    { key: 'numero', label: 'Nro.' },
    { key: 'fecha_vencimiento', label: 'Vencimiento' },
    { key: 'dias_para_vencer', label: 'Días' },
    { key: 'saldo', label: 'Saldo', right: true },
  ];

  const diasColor = (dias) => {
    if (dias === null || dias === undefined) return 'text-slate-400';
    if (dias < 0) return 'text-red-600 font-bold';
    if (dias <= 10) return 'text-orange-600 font-semibold';
    if (dias <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <ReporteWidget
      title="Próximos Vencimientos a Proveedores"
      description="Facturas de proveedores con saldo, ordenadas por urgencia"
      icon={FileText}
      loading={loading}
      error={error}
      onRetry={fetch}
      csvFile={data?.filas?.length ? () => exportCSV('vencimientos_compras.csv', data.filas) : null}
    >
      {data && (
        <>
          <KpiBar items={[
            { label: 'Total a pagar', value: formatCurrency(data.kpi.total_a_pagar) },
            { label: 'En 30 días', value: formatCurrency(data.kpi.a_pagar_30_dias), sub: 'próximos / vencidos' },
            { label: 'Facturas', value: data.kpi.cantidad_facturas },
          ]} />
          <ExpandableTable
            columns={cols}
            rows={data.filas || []}
            renderRow={(r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-800 max-w-[180px] truncate">{r.proveedor_nombre}</td>
                <td className="px-3 py-2 text-slate-500">{r.numero || '—'}</td>
                <td className="px-3 py-2 text-slate-400">{r.fecha_vencimiento || '—'}</td>
                <td className={`px-3 py-2 ${diasColor(r.dias_para_vencer)}`}>
                  {r.dias_para_vencer !== null
                    ? r.dias_para_vencer < 0
                      ? `Vencido ${Math.abs(r.dias_para_vencer)}d`
                      : `${r.dias_para_vencer}d`
                    : '—'}
                </td>
                <td className="px-3 py-2 text-right font-mono text-slate-700">{formatCurrency(r.saldo)}</td>
              </tr>
            )}
          />
        </>
      )}
    </ReporteWidget>
  );
}

// ═══════════════════════════════════════════════════════════════════
// WIDGET 6: Multi-empresa
// ═══════════════════════════════════════════════════════════════════
function EmpresasResumenWidget({ qs }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/analytics/reportes/empresas-resumen${qs}`);
      setData(res.data);
    } catch {
      setError('No se pudo cargar resumen por empresa');
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => { fetch(); }, [fetch]);

  const cols = [
    { key: 'nombre', label: 'Empresa' },
    { key: 'facturado', label: 'Facturado', right: true },
    { key: 'notas_credito', label: 'NC', right: true },
    { key: 'neto', label: 'Neto', right: true },
    { key: 'clientes', label: 'Clientes' },
    { key: 'pct', label: '% del total' },
  ];

  if (data?.kpi?.una_sola_empresa) return null;

  return (
    <ReporteWidget
      title="Ventas por Empresa / Razón Social"
      description="Distribución de facturación entre razones sociales del período"
      icon={FileText}
      loading={loading}
      error={error}
      onRetry={fetch}
      csvFile={data?.filas?.length ? () => exportCSV('empresas_resumen.csv', data.filas) : null}
    >
      {data && (
        <>
          <KpiBar items={[
            { label: 'Total consolidado', value: formatCurrency(data.kpi.total_neto) },
            { label: 'Empresas', value: data.kpi.empresas },
          ]} />
          <ExpandableTable
            columns={cols}
            rows={data.filas || []}
            renderRow={(r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-800">{r.nombre}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-600">{formatCurrency(r.facturado)}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-400">{formatCurrency(r.notas_credito)}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">{formatCurrency(r.neto)}</td>
                <td className="px-3 py-2 text-slate-500">{r.clientes}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{r.pct}%</span>
                  </div>
                </td>
              </tr>
            )}
          />
        </>
      )}
    </ReporteWidget>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
export default function ReportesPage() {
  const { user, activeCompany } = useAuthStore();
  const filters = useFilterStore();

  const qs = buildQueryParams(user, activeCompany, filters);

  if (user?.is_admin && !activeCompany) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-slate-400">
        <FileText size={40} />
        <p className="text-lg font-medium">Seleccioná una empresa para ver los reportes</p>
        <p className="text-sm">Usá el botón "Cambiar" en el menú lateral.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cuentas corrientes, cobranza y vencimientos — datos sincronizados desde Infomanager o cargados vía Excel.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SaldosClientesWidget qs={qs} />
        <ComprobPendientesWidget qs={qs} />
        <CreditoDisponibleWidget qs={qs} />
        <FacturasConPagosWidget qs={qs} />
        <VencimientosComprasWidget qs={qs} />
        <EmpresasResumenWidget qs={qs} />
      </div>
    </div>
  );
}
