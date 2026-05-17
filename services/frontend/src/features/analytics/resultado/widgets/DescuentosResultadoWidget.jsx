import { useEffect } from 'react';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useResultadoData } from '../ResultadoDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const semaforo = (pct) => {
  if (pct > 10) return 'text-red-600 font-bold';
  if (pct > 5)  return 'text-amber-600';
  return 'text-emerald-600';
};

export default function DescuentosResultadoWidget() {
  const { descuentos, loadingDescuentos, fetchDescuentos } = useResultadoData();

  useEffect(() => { fetchDescuentos(); }, [fetchDescuentos]);

  if (loadingDescuentos) {
    return <ChartSkeleton />;
  }
  if (!descuentos) {
    return <p className="p-4 text-sm text-slate-400">Sin datos de descuentos.</p>;
  }

  const alertas = (descuentos.mayores_descuentos ?? []).filter((d) => d.descuento_pct > 20);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Summary cards */}
      <div className="flex gap-3 px-4 pt-4 pb-3 shrink-0">
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-center">
          <p className="text-[10px] text-slate-500 mb-1">Total descontado</p>
          <p className="text-lg font-bold text-orange-600">{formatCurrency(descuentos.total_descontado)}</p>
        </div>
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-center">
          <p className="text-[10px] text-slate-500 mb-1">% sobre facturación</p>
          <p className="text-lg font-bold text-amber-600">{fmtPct(descuentos.pct_sobre_facturacion)}</p>
        </div>
        <div className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-center">
          <p className="text-[10px] text-slate-500 mb-1">Facturación perdida</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(descuentos.facturacion_perdida)}</p>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800 font-medium shrink-0">
          🚨 {alertas.length} descuento{alertas.length > 1 ? 's individuales superan' : ' individual supera'} el 20%
        </div>
      )}

      <div className="flex-1 overflow-auto min-h-0 px-4 pb-4 space-y-3">
        {/* Por vendedor */}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Por vendedor</p>
          <table className="min-w-full text-xs border-collapse rounded-xl overflow-hidden border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Vendedor', 'Desc. Total', 'Desc. % Prom', 'Tickets c/desc.'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(descuentos.por_vendedor ?? []).map((v, i) => (
                <tr key={v.cod_vendedor ?? i} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-medium text-slate-800 max-w-[140px] truncate">{v.nombre}</td>
                  <td className="px-3 py-1.5 tabular-nums text-right text-slate-700">{formatCurrency(v.descuento_total)}</td>
                  <td className={`px-3 py-1.5 tabular-nums text-right ${semaforo(v.descuento_pct_promedio)}`}>{fmtPct(v.descuento_pct_promedio)}</td>
                  <td className="px-3 py-1.5 tabular-nums text-right text-slate-600">{formatNumber(v.tickets_con_descuento)}</td>
                </tr>
              ))}
              {!(descuentos.por_vendedor?.length) && <tr><td colSpan={4} className="px-3 py-3 text-slate-400">Sin datos</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Mayores descuentos */}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1">Top 10 mayores descuentos</p>
          <table className="min-w-full text-xs border-collapse rounded-xl overflow-hidden border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {['Fecha', 'Cliente', 'Vendedor', 'Producto', 'Desc. %', 'Desc. $'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(descuentos.mayores_descuentos ?? []).map((d, i) => (
                <tr key={i} className={`hover:bg-slate-50 ${d.descuento_pct > 20 ? 'bg-red-50' : ''}`}>
                  <td className="px-3 py-1.5 text-slate-500">{d.fecha}</td>
                  <td className="px-3 py-1.5 text-slate-700 max-w-[120px] truncate">{d.cliente}</td>
                  <td className="px-3 py-1.5 text-slate-600 max-w-[80px] truncate">{d.vendedor}</td>
                  <td className="px-3 py-1.5 text-slate-600 max-w-[100px] truncate">{d.producto}</td>
                  <td className={`px-3 py-1.5 tabular-nums text-right ${d.descuento_pct > 20 ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{fmtPct(d.descuento_pct)}</td>
                  <td className="px-3 py-1.5 tabular-nums text-right text-slate-700">{formatCurrency(d.descuento_dolares)}</td>
                </tr>
              ))}
              {!(descuentos.mayores_descuentos?.length) && <tr><td colSpan={6} className="px-3 py-3 text-slate-400">Sin datos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
