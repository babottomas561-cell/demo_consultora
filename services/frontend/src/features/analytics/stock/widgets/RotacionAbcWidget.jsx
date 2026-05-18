import { useEffect } from 'react';
import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useStockData } from '../StockDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const ABC_COLORS = { A: '#4f46e5', B: '#eab308', C: '#94a3b8' };
const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export default function RotacionAbcWidget() {
  const { rotacion, loadingRotacion, fetchRotacion } = useStockData();

  useEffect(() => { fetchRotacion(); }, [fetchRotacion]);

  if (loadingRotacion) {
    return <ChartSkeleton />;
  }

  const ranking = rotacion?.ranking ?? [];
  const abc = rotacion?.abc ?? {};
  const abcEntries = Object.entries(abc);
  const abcChartData = abcEntries.map(([cls, v]) => ({ name: `Clase ${cls}`, cls, valor: v.valor, articulos: v.articulos, pct: v.pct_valor }));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* ABC summary cards */}
      {abcEntries.length > 0 && (
        <div className="flex gap-3 px-4 pt-4 pb-2 shrink-0">
          {abcEntries.map(([cls, v]) => (
            <div key={cls} className="flex-1 rounded-lg border border-slate-200 bg-white p-3 text-center">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-sm font-bold mb-1"
                style={{ backgroundColor: ABC_COLORS[cls] ?? '#94a3b8' }}>{cls}</span>
              <p className="text-base font-bold text-slate-900">{formatCurrency(v.valor)}</p>
              <p className="text-[10px] text-slate-400">{v.articulos} arts · {v.pct_valor}%</p>
            </div>
          ))}
        </div>
      )}

      {/* ABC chart */}
      {abcChartData.length > 0 && (
        <div className="shrink-0 h-36 px-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={abcChartData} margin={{ left: 4, right: 4, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [formatCurrency(v), 'Valor']} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {abcChartData.map((d, i) => <Cell key={i} fill={ABC_COLORS[d.cls] ?? '#94a3b8'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ranking table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {['Artículo', 'ABC', 'Stock', 'Vendido', 'Vta/día', 'Días inv.', 'Valor', '% Valor'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ranking.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate">{r.nombre}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
                    style={{ backgroundColor: ABC_COLORS[r.clasificacion] ?? '#94a3b8' }}>{r.clasificacion}</span>
                </td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{formatNumber(r.stock_actual)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{formatNumber(r.unidades_vendidas)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-500">{Number(r.venta_diaria || 0).toFixed(1)}</td>
                <td className="px-3 py-2 tabular-nums text-right">
                  <span className={r.dias_inventario > 180 ? 'font-bold text-indigo-600' : 'text-slate-600'}>
                    {r.dias_inventario >= 999 ? '∞' : r.dias_inventario}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-700">{formatCurrency(r.valor_stock)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-500">{r.pct_valor_total}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!ranking.length && <p className="p-4 text-sm text-slate-400">Sin datos de rotación.</p>}
      </div>
    </div>
  );
}
