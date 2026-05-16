import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';
import { WidgetShell } from './_shared';

const diasColor = (dias) => {
  if (dias === null || dias === undefined) return 'text-slate-400';
  if (dias < 0) return 'text-red-600 font-bold';
  if (dias <= 10) return 'text-orange-600 font-semibold';
  if (dias <= 30) return 'text-yellow-600';
  return 'text-green-600';
};

export default function VencimientosProveedoresWidget() {
  const { data, loading, error, refetch } = useInfomanagerFetch('reportes/vencimientos-compras', () => ({}));
  const filas = data?.filas ?? [];
  const kpis = data
    ? [
        { label: 'Total a pagar', value: formatCurrency(data.kpi?.total_a_pagar || 0), className: 'text-red-600' },
        { label: 'En 30 días', value: formatCurrency(data.kpi?.a_pagar_30_dias || 0), sub: 'próximos / vencidos' },
        { label: 'Facturas', value: data.kpi?.cantidad_facturas ?? 0 },
      ]
    : null;

  return (
    <WidgetShell
      loading={loading}
      error={error}
      onRetry={refetch}
      kpis={kpis}
      empty={!loading && !error && filas.length === 0 ? 'Sin facturas pendientes de pago' : null}
    >
      <table className="min-w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
          <tr>
            <th className="border-b border-slate-100 px-3 py-2">Proveedor</th>
            <th className="border-b border-slate-100 px-3 py-2">Factura</th>
            <th className="border-b border-slate-100 px-3 py-2">Fecha</th>
            <th className="border-b border-slate-100 px-3 py-2">Vencimiento</th>
            <th className="border-b border-slate-100 px-3 py-2 text-center">Días</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filas.map((r, i) => (
            <tr key={r.comprobante_id ?? i} className="hover:bg-slate-50">
              <td className="max-w-[220px] truncate px-3 py-1.5 font-medium text-slate-700" title={r.proveedor_nombre}>
                {r.proveedor_nombre}
              </td>
              <td className="px-3 py-1.5 text-slate-500">
                {[r.tipo, r.numero].filter(Boolean).join(' ') || '—'}
              </td>
              <td className="px-3 py-1.5 text-slate-400">{r.fecha ?? '—'}</td>
              <td className="px-3 py-1.5 text-slate-400">{r.fecha_vencimiento ?? '—'}</td>
              <td className={`px-3 py-1.5 text-center ${diasColor(r.dias_para_vencer)}`}>
                {r.dias_para_vencer !== null && r.dias_para_vencer !== undefined
                  ? r.dias_para_vencer < 0
                    ? `Venc. ${Math.abs(r.dias_para_vencer)}d`
                    : `${r.dias_para_vencer}d`
                  : '—'}
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
