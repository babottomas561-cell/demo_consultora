import { useEffect } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useVendedoresData } from '../VendedoresDataContext';
import { formatNumber } from '../../analyticsUtils';

export default function ConversionVendedoresWidget() {
  const { ranking, loadingRanking, fetchTemporal } = useVendedoresData();

  // Conversión uses ranking data (already loaded), but also triggers temporal so
  // the EvolucionWidget doesn't re-fetch if both are on the same panel.
  useEffect(() => { fetchTemporal(); }, [fetchTemporal]);

  if (loadingRanking) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={24} /></div>;
  }

  const vendedores = (ranking?.vendedores ?? []).filter((v) => v.presupuestos_emitidos > 0);

  const tasaGlobal = vendedores.length > 0
    ? vendedores.reduce((s, v) => s + (v.tasa_conversion ?? 0), 0) / vendedores.length
    : 0;

  const chartData = vendedores.map((v) => ({
    name: (v.nombre ?? `V${v.cod_vendedor}`).split(' ')[0],
    confirmados: v.presupuestos_confirmados,
    perdidos: v.presupuestos_emitidos - v.presupuestos_confirmados,
  }));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Alert banner */}
      {tasaGlobal > 0 && tasaGlobal < 50 && (
        <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 shrink-0">
          ⚠️ Tasa de conversión promedio: <strong>{tasaGlobal.toFixed(1)}%</strong>
        </div>
      )}

      {/* Stacked bar chart */}
      {chartData.length > 0 && (
        <div className="flex-1 min-h-0 px-2 pt-4 pb-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [formatNumber(v)]} />
              <Legend />
              <Bar dataKey="confirmados" name="Confirmados"      fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="perdidos"    name="No confirmados"   fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="shrink-0 overflow-auto border-t border-slate-100">
        <table className="min-w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {['Vendedor', 'Emitidos', 'Confirmados', 'Tasa conv.'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendedores.map((v) => (
              <tr key={v.cod_vendedor} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-800 max-w-[140px] truncate">{v.nombre ?? `V${v.cod_vendedor}`}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{formatNumber(v.presupuestos_emitidos)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{formatNumber(v.presupuestos_confirmados)}</td>
                <td className="px-3 py-2 tabular-nums text-right">
                  <span className={`font-semibold ${v.tasa_conversion >= 50 ? 'text-emerald-600' : v.tasa_conversion >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                    {Number(v.tasa_conversion ?? 0).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!vendedores.length && <p className="p-4 text-sm text-slate-400">Sin presupuestos registrados.</p>}
      </div>
    </div>
  );
}
