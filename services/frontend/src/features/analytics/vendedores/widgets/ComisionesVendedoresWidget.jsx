import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useVendedoresData } from '../VendedoresDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

export default function ComisionesVendedoresWidget() {
  const { comisiones, loadingComisiones, fetchComisiones } = useVendedoresData();

  useEffect(() => {
    fetchComisiones();
  }, [fetchComisiones]);

  if (loadingComisiones) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={24} /></div>;
  }

  const vendedores = comisiones?.vendedores ?? [];
  const temporal = comisiones?.temporal ?? [];

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="grid grid-cols-3 gap-3 px-4 pt-4 pb-3 shrink-0">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Base cobrada</p>
          <p className="text-sm font-bold text-slate-900">{formatCurrency(comisiones?.total_base_cobrada)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Comisión</p>
          <p className="text-sm font-bold text-emerald-600">{formatCurrency(comisiones?.total_comision)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Períodos</p>
          <p className="text-sm font-bold text-slate-900">{formatNumber(temporal.length)}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0 px-4 pb-4 space-y-3">
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="min-w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                {['Vendedor', 'Base cobrada', '%', 'Comisión', 'Recibos'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendedores.map((v) => (
                <tr key={v.cod_vendedor} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{v.vendedor_nombre ?? `V${v.cod_vendedor}`}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatCurrency(v.base_cobrada)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{(Number(v.porcentaje ?? 0) * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-600">{formatCurrency(v.comision)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{formatNumber(v.recibos)}</td>
                </tr>
              ))}
              {!vendedores.length && (
                <tr><td colSpan={5} className="px-3 py-3 text-slate-400">Sin comisiones calculadas.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {temporal.length > 0 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Evolución mensual</h3>
            </div>
            <table className="min-w-full text-xs border-collapse">
              <tbody className="divide-y divide-slate-100">
                {temporal.map((row) => (
                  <tr key={row.periodo} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{row.periodo}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatCurrency(row.base_cobrada)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-600">{formatCurrency(row.comision)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">{formatNumber(row.recibos)} recibos</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
