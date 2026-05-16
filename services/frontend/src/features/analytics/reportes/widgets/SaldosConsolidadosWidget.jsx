import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';
import { WidgetShell } from './_shared';

export default function SaldosConsolidadosWidget() {
  const { data, loading, error, refetch } = useInfomanagerFetch('reportes/saldos-clientes', () => ({}));
  const filas = data?.filas ?? [];
  const kpis = data
    ? [
        { label: 'Total deuda', value: formatCurrency(data.kpi?.total_deuda || 0), className: 'text-red-600' },
        { label: 'Clientes con deuda', value: data.kpi?.clientes_con_deuda ?? 0 },
      ]
    : null;

  return (
    <WidgetShell
      loading={loading}
      error={error}
      onRetry={refetch}
      kpis={kpis}
      empty={!loading && !error && filas.length === 0 ? 'Sin saldos sincronizados' : null}
    >
      <table className="min-w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
          <tr>
            <th className="border-b border-slate-100 px-3 py-2">Cliente</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">Saldo</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">Facturas pendientes</th>
            <th className="border-b border-slate-100 px-3 py-2">Último mov.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filas.map((r, i) => (
            <tr key={r.cliente_id ?? i} className="hover:bg-slate-50">
              <td className="max-w-[260px] truncate px-3 py-1.5 font-medium text-slate-700" title={r.nombre}>
                {r.nombre}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono font-semibold text-red-600">
                {formatCurrency(r.saldo_total)}
              </td>
              <td className="px-3 py-1.5 text-right text-slate-500">{r.facturas_pendientes}</td>
              <td className="px-3 py-1.5 text-slate-400">{r.ultimo_mov ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </WidgetShell>
  );
}
