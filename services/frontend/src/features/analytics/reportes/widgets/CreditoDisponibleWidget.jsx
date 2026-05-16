import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';
import { WidgetShell } from './_shared';

export default function CreditoDisponibleWidget() {
  const { data, loading, error, refetch } = useInfomanagerFetch('reportes/disponible-credito', () => ({}));
  const filas = data?.filas ?? [];
  const kpis = data
    ? [
        { label: 'Clientes con saldo', value: data.kpi?.clientes_con_saldo ?? 0 },
        { label: 'Total clientes', value: data.kpi?.total_clientes ?? 0 },
      ]
    : null;

  return (
    <WidgetShell
      loading={loading}
      error={error}
      onRetry={refetch}
      kpis={kpis}
      empty={!loading && !error && filas.length === 0 ? 'Sin datos de cobranza por cliente' : null}
    >
      <table className="min-w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
          <tr>
            <th className="border-b border-slate-100 px-3 py-2">Cliente</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">Facturado</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">Cobrado</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">Pendiente</th>
            <th className="border-b border-slate-100 px-3 py-2">% Cobrado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filas.map((r, i) => {
            const pct = Number(r.pct_cobrado || 0);
            const barColor = pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-red-400';
            return (
              <tr key={r.cliente_id ?? i} className="hover:bg-slate-50">
                <td className="max-w-[220px] truncate px-3 py-1.5 font-medium text-slate-700" title={r.nombre}>
                  {r.nombre}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-slate-600">
                  {formatCurrency(r.facturado_total)}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-slate-600">
                  {formatCurrency(r.cobrado_total)}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono font-semibold text-slate-800">
                  {formatCurrency(r.saldo_pendiente)}
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </WidgetShell>
  );
}
