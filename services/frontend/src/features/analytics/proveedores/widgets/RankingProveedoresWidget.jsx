import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useProveedoresData } from '../ProveedoresDataContext';
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

export default function RankingProveedoresWidget() {
  const { ranking, loadingRanking } = useProveedoresData();

  if (loadingRanking) {
    return <TableSkeleton />;
  }

  const proveedores = ranking?.proveedores ?? [];
  const top10 = proveedores.slice(0, 10);

  const chartData = top10.map((p) => {
    const full = p.nombre ?? `Prov ${p.proveedor_id}`;
    return { name: full.length > 16 ? full.slice(0, 15) + '…' : full, total: p.total_comprado, full };
  });

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {chartData.length > 0 && (
        <div className="shrink-0 h-48 px-2 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 28 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-25} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [formatCurrency(v), 'Total comprado']} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? '#4f46e5' : i < 6 ? '#6366f1' : '#a5b4fc'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {['#', 'Proveedor', 'Total comprado', 'Órdenes', 'Ticket prom.', 'Última compra', 'Saldo Cta Cte', 'Seg.', '% Total'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proveedores.map((p, i) => (
              <tr key={p.proveedor_id} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-400 font-medium">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate">{p.nombre ?? `P${p.proveedor_id}`}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-700 font-medium">{formatCurrency(p.total_comprado)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{formatNumber(p.ordenes)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-600">{formatCurrency(p.ticket_promedio)}</td>
                <td className="px-3 py-2 text-slate-500">{p.ultima_compra?.slice(0, 10)?.split('-').reverse().join('/') ?? '-'}</td>
                <td className="px-3 py-2 tabular-nums text-right">
                  <span className={p.saldo_cta_cte > 0 ? 'font-semibold text-amber-600' : 'text-slate-500'}>
                    {formatCurrency(p.saldo_cta_cte)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${SEGMENTO_BADGE[p.segmento] ?? ''}`}>
                    {p.segmento ?? '-'}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-500">{Number(p.pct_del_total ?? 0).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!proveedores.length && <p className="p-4 text-sm text-slate-400">Sin datos de proveedores.</p>}
      </div>
    </div>
  );
}
