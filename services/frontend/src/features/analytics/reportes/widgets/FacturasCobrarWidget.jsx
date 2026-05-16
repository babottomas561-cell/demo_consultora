import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';
import { WidgetShell, Badge, moraColor } from './_shared';

export default function FacturasCobrarWidget() {
  const { data, loading, error, refetch } = useInfomanagerFetch('reportes/comprob-pendientes', () => ({}));
  const filas = data?.filas ?? [];
  const kpis = data
    ? [
        { label: 'Total pendiente', value: formatCurrency(data.kpi?.total_pendiente || 0), className: 'text-red-600' },
        { label: 'Facturas', value: data.kpi?.cantidad_facturas ?? 0 },
        { label: 'Vencidas', value: data.kpi?.facturas_vencidas ?? 0, sub: 'con mora' },
      ]
    : null;

  return (
    <WidgetShell
      loading={loading}
      error={error}
      onRetry={refetch}
      kpis={kpis}
      empty={!loading && !error && filas.length === 0 ? 'Sin comprobantes pendientes' : null}
    >
      <table className="min-w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
          <tr>
            <th className="border-b border-slate-100 px-3 py-2">Cliente</th>
            <th className="border-b border-slate-100 px-3 py-2">Comprobante</th>
            <th className="border-b border-slate-100 px-3 py-2">Fecha</th>
            <th className="border-b border-slate-100 px-3 py-2">Vencimiento</th>
            <th className="border-b border-slate-100 px-3 py-2 text-center">Días mora</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">Importe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filas.map((r, i) => (
            <tr key={r.comprobante_id ?? i} className="hover:bg-slate-50">
              <td className="max-w-[200px] truncate px-3 py-1.5 font-medium text-slate-700" title={r.cliente_nombre}>
                {r.cliente_nombre}
              </td>
              <td className="px-3 py-1.5 text-slate-500">
                {[r.tipo, r.numero].filter(Boolean).join(' ') || '—'}
              </td>
              <td className="px-3 py-1.5 text-slate-400">{r.fecha ?? '—'}</td>
              <td className="px-3 py-1.5 text-slate-400">{r.fecha_vencimiento ?? '—'}</td>
              <td className="px-3 py-1.5 text-center">
                <Badge className={moraColor(r.dias_mora)}>
                  {r.dias_mora > 0 ? `${r.dias_mora}d` : 'Al día'}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono font-semibold text-slate-800">
                {formatCurrency(r.saldo)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </WidgetShell>
  );
}
