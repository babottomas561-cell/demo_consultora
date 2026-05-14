import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Database, Loader2, RefreshCw } from 'lucide-react';

import apiClient from '../../api/client';
import FilterBar from '../../components/FilterBar';
import useAuthStore from '../../store/authStore';
import { useFilterStore } from '../../store/filterStore';
import { buildQueryParams, formatNumber } from './analyticsUtils';

const GROUP_LABELS = {
  clientes: 'Clientes',
  proveedores: 'Proveedores',
  vendedores: 'Vendedores',
  compras: 'Compras',
  stock: 'Stock',
  caja: 'Caja',
  contabilidad: 'Contabilidad',
};

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  return String(value);
};

export default function InfomanagerReportesView() {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore = useFilterStore();
  const [catalog, setCatalog] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [detail, setDetail] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);

  const filters = {
    desde: filterStore.desde,
    hasta: filterStore.hasta,
    comparar_anterior: filterStore.comparar_anterior,
  };
  const qs = buildQueryParams(user, activeCompany, filters);

  const canFetch = Boolean(user?.company_id || (user?.is_admin && activeCompany));

  const fetchCatalog = useCallback(async () => {
    if (!canFetch) return;
    setLoadingCatalog(true);
    setError(null);
    try {
      const response = await apiClient.get(`/analytics/infomanager/reportes${qs}`);
      const reportes = response.data.reportes ?? [];
      setCatalog(reportes);
      setSelectedKey((current) => current || reportes.find((r) => r.supported)?.key || '');
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el catálogo de reportes Infomanager.');
    } finally {
      setLoadingCatalog(false);
    }
  }, [canFetch, qs]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  useEffect(() => {
    if (!canFetch || !selectedKey) return;
    setLoadingDetail(true);
    setDetail(null);
    apiClient
      .get(`/analytics/infomanager/reportes/${selectedKey}${qs}`)
      .then((response) => setDetail(response.data))
      .catch((err) => {
        console.error(err);
        setError('No se pudo cargar el reporte seleccionado.');
      })
      .finally(() => setLoadingDetail(false));
  }, [canFetch, selectedKey, qs]);

  const grouped = useMemo(() => {
    const result = {};
    for (const report of catalog) {
      const group = report.group || 'otros';
      result[group] = result[group] || [];
      result[group].push(report);
    }
    return result;
  }, [catalog]);

  const payloadRows = detail?.rows ?? [];
  const columns = useMemo(() => {
    const first = payloadRows.find((row) => row.payload)?.payload ?? {};
    return Object.keys(first).slice(0, 12);
  }, [payloadRows]);

  if (user?.is_admin && !activeCompany) {
    return (
      <div className="py-20 text-center">
        <Database className="mx-auto text-slate-400" size={40} />
        <h2 className="mt-4 text-xl font-bold text-slate-900">Seleccioná una empresa</h2>
        <p className="mt-2 text-slate-500">Los reportes Infomanager leen datos del tenant activo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <FilterBar />

      <div className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Reportes Infomanager</h1>
          <p className="text-sm text-slate-500">Reportes publicados por Swagger y filas crudas obtenidas en la última sincronización.</p>
        </div>
        <button
          type="button"
          onClick={fetchCatalog}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={16} />
          Refrescar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Catálogo</p>
          </div>
          <div className="max-h-[720px] overflow-auto p-3">
            {loadingCatalog && <Loader2 className="mx-auto my-8 animate-spin text-slate-400" size={24} />}
            {!loadingCatalog && Object.entries(grouped).map(([group, reports]) => (
              <div key={group} className="mb-4">
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{GROUP_LABELS[group] ?? group}</p>
                <div className="space-y-1">
                  {reports.map((report) => (
                    <button
                      key={report.key}
                      type="button"
                      onClick={() => setSelectedKey(report.key)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedKey === report.key ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block font-medium">{report.name}</span>
                      <span className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        report.supported ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {report.supported ? `${formatNumber(report.rows_count)} filas` : 'No publicado en Swagger'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">{detail?.report_name ?? 'Reporte'}</p>
            {detail?.note && <p className="mt-1 text-xs text-amber-600">{detail.note}</p>}
          </div>

          {loadingDetail && <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={24} /></div>}

          {!loadingDetail && !payloadRows.length && (
            <div className="px-4 py-10 text-sm text-slate-500">Sin filas sincronizadas para este reporte y período.</div>
          )}

          {!loadingDetail && payloadRows.length > 0 && (
            <div className="overflow-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    {columns.map((column) => (
                      <th key={column} className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payloadRows.map((row) => (
                    <tr key={row.row_key} className="hover:bg-slate-50">
                      {columns.map((column) => (
                        <td key={column} className="max-w-[220px] truncate px-3 py-2 text-slate-700" title={displayValue(row.payload?.[column])}>
                          {displayValue(row.payload?.[column])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
