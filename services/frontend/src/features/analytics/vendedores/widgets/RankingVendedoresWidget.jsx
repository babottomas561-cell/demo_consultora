import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVendedoresData } from '../VendedoresDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const V_COLORS = ['#4f46e5', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#eab308', '#ef4444'];
const getColor = (i) => V_COLORS[i % V_COLORS.length];

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export default function RankingVendedoresWidget() {
  const { ranking, loadingRanking } = useVendedoresData();

  if (loadingRanking) {
    return <TableSkeleton />;
  }

  const vendedores = ranking?.vendedores ?? [];
  const chartData = vendedores.map((v) => ({
    name: (v.nombre ?? `V${v.cod_vendedor}`).split(' ')[0],
    facturado: v.facturado_neto,
  }));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="shrink-0 h-48 px-2 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtM} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [formatCurrency(v), 'Facturado neto']} />
              <Bar dataKey="facturado" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={getColor(i)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {['#', 'Vendedor', 'Facturado neto', 'Tickets', 'Ticket prom.', 'Margen %', '% Cuota', 'Conv.', '% Total'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendedores.map((v, i) => (
              <tr key={v.cod_vendedor} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-400 font-medium">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-slate-800 max-w-[140px] truncate">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 shrink-0"
                    style={{ backgroundColor: getColor(i) }}
                  />
                  {v.nombre ?? `V${v.cod_vendedor}`}
                </td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-700 font-medium">{formatCurrency(v.facturado_neto)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{formatNumber(v.tickets)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{formatCurrency(v.ticket_promedio)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{Number(v.margen_pct ?? 0).toFixed(1)}%</td>
                <td className="px-3 py-2 tabular-nums text-right">
                  {v.pct_cumplimiento != null ? (
                    <span className={`font-semibold ${v.pct_cumplimiento >= 100 ? 'text-emerald-600' : v.pct_cumplimiento >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                      {v.pct_cumplimiento.toFixed(1)}%
                    </span>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{Number(v.tasa_conversion ?? 0).toFixed(1)}%</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-500">{Number(v.pct_del_total ?? 0).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!vendedores.length && <p className="p-4 text-sm text-slate-400">Sin datos de ranking.</p>}
      </div>
    </div>
  );
}
