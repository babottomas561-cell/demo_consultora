import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useClientesData } from '../ClientesDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const SEGMENTO_BADGE = {
  A: 'bg-indigo-100 text-indigo-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-slate-100 text-slate-600',
};

export default function RankingClientesWidget() {
  const { ranking, loadingRanking } = useClientesData();

  if (loadingRanking) {
    return <TableSkeleton />;
  }

  const clientes = ranking?.clientes ?? [];
  const top10 = clientes.slice(0, 10);

  const chartData = top10.map((c) => ({
    name: (c.nombre ?? `C${c.cliente_id}`).split(' ').slice(0, 2).join(' '),
    facturado: c.facturado_neto,
  }));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="shrink-0 h-48 px-2 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 28 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [formatCurrency(v), 'Facturado neto']} />
              <Bar dataKey="facturado" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? '#4f46e5' : i < 6 ? '#6366f1' : '#a5b4fc'} />
                ))}
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
              {['#', 'Cliente', 'Facturado neto', 'Tickets', 'Ticket prom.', 'Margen %', 'Última compra', 'Segmento', '% Total'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientes.map((c, i) => (
              <tr key={c.cliente_id} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-400 font-medium">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate">{c.nombre ?? `C${c.cliente_id}`}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-700 font-medium">{formatCurrency(c.facturado_neto)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{formatNumber(c.tickets)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{formatCurrency(c.ticket_promedio)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{Number(c.margen_pct ?? 0).toFixed(1)}%</td>
                <td className="px-3 py-2 text-slate-500">{c.ultima_compra?.slice(0, 10) ?? '-'}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${SEGMENTO_BADGE[c.segmento] ?? ''}`}>
                    {c.segmento ?? '-'}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-500">{Number(c.pct_del_total ?? 0).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!clientes.length && <p className="p-4 text-sm text-slate-400">Sin datos de clientes.</p>}
      </div>
    </div>
  );
}
