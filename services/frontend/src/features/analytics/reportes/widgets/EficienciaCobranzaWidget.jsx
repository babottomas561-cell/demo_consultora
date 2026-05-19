import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';
import { WidgetShell, Badge, pctColor } from './_shared';
import { buildEficienciaCobranza } from './eficienciaCobranzaUtils';

export default function EficienciaCobranzaWidget() {
  const { data, loading, error, refetch } = useInfomanagerFetch('caja/recibos', (f) => ({
    desde: f.desde || undefined,
    hasta: f.hasta || undefined,
    cod_empresa: f.cod_empresa?.[0] ?? undefined,
    limit: 5000,
  }));
  const resumen = buildEficienciaCobranza(data);
  const filas = resumen.filas;
  const kpis = data
    ? [
        { label: 'Facturado', value: formatCurrency(resumen.kpi.total_facturado || 0) },
        { label: 'Cobrado', value: formatCurrency(resumen.kpi.total_cobrado || 0), className: 'text-green-700' },
        {
          label: 'Eficiencia',
          value: `${resumen.kpi.pct_eficiencia_cobranza ?? 0}%`,
          sub: `${resumen.kpi.facturas_cobradas ?? 0} / ${resumen.kpi.total_facturas ?? 0} facturas`,
        },
      ]
    : null;

  return (
    <WidgetShell
      loading={loading}
      error={error}
      onRetry={refetch}
      kpis={kpis}
      empty={!loading && !error && filas.length === 0 ? 'Sin recibos en el período' : null}
    >
      <table className="min-w-full text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
          <tr>
            <th className="border-b border-slate-100 px-3 py-2">Factura</th>
            <th className="border-b border-slate-100 px-3 py-2">Cliente</th>
            <th className="border-b border-slate-100 px-3 py-2">Fecha</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">Total</th>
            <th className="border-b border-slate-100 px-3 py-2 text-right">Cobrado</th>
            <th className="border-b border-slate-100 px-3 py-2 text-center">% Cobrado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filas.map((r, i) => (
            <tr key={r.comprobante_id ?? i} className="hover:bg-slate-50">
              <td className="px-3 py-1.5 text-slate-500">{r.numero ?? r.comprobante_id}</td>
              <td className="max-w-[180px] truncate px-3 py-1.5 font-medium text-slate-700" title={r.cliente_nombre}>
                {r.cliente_nombre}
              </td>
              <td className="px-3 py-1.5 text-slate-400">{r.fecha ?? '—'}</td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-slate-600">
                {formatCurrency(r.importe_total)}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-green-700">
                {formatCurrency(r.importe_pagado)}
              </td>
              <td className="px-3 py-1.5 text-center">
                <Badge className={pctColor(Number(r.pct_cobrado || 0))}>{r.pct_cobrado}%</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </WidgetShell>
  );
}
