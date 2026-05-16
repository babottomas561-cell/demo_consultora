import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';
import { WidgetShell } from './_shared';

export default function VentasPorEmpresaWidget() {
  const { data, loading, error, refetch } = useInfomanagerFetch('reportes/empresas-resumen', (f) => ({
    desde: f.desde || undefined,
    hasta: f.hasta || undefined,
  }));

  // Hide widget completely if only one empresa exists.
  if (!loading && !error && data?.kpi?.una_sola_empresa) return null;

  const filas = data?.filas ?? [];
  const kpis = data
    ? [
        { label: 'Total consolidado', value: formatCurrency(data.kpi?.total_neto || 0) },
        { label: 'Empresas', value: data.kpi?.empresas ?? 0 },
      ]
    : null;

  return (
    <WidgetShell
      loading={loading}
      error={error}
      onRetry={refetch}
      kpis={kpis}
      empty={!loading && !error && filas.length === 0 ? 'Sin facturación en el período' : null}
    >
      <table className="min-w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
          <tr>
            <th className="border-b border-slate-100 px-3 py-2">Empresa</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">Facturado</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">NC</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">Neto</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">Clientes</th>
            <th className="border-b border-slate-100 px-3 py-2">% del total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filas.map((r, i) => (
            <tr key={r.cod_empresa ?? i} className="hover:bg-slate-50">
              <td className="px-3 py-1.5 font-medium text-slate-800">{r.nombre}</td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-slate-600">
                {formatCurrency(r.facturado)}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-slate-400">
                {formatCurrency(r.notas_credito)}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono font-semibold text-slate-800">
                {formatCurrency(r.neto)}
              </td>
              <td className="px-3 py-1.5 text-right text-slate-500">{r.clientes}</td>
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-500">{r.pct}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </WidgetShell>
  );
}
