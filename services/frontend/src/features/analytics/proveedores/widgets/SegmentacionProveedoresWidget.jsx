import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useProveedoresData } from '../ProveedoresDataContext';
import { formatCurrency } from '../../analyticsUtils';

const SEGMENTO_COLORS = { A: '#4f46e5', B: '#eab308', C: '#94a3b8' };

export default function SegmentacionProveedoresWidget() {
  const { ranking, loadingRanking } = useProveedoresData();

  if (loadingRanking) {
    return <ChartSkeleton />;
  }

  const proveedores = ranking?.proveedores ?? [];
  const bySegmento = { A: [], B: [], C: [] };
  for (const p of proveedores) {
    if (p.segmento && bySegmento[p.segmento]) bySegmento[p.segmento].push(p);
  }

  const pieData = ['A', 'B', 'C'].map((s) => ({
    name: `Seg. ${s}`,
    value: bySegmento[s].reduce((sum, p) => sum + (p.total_comprado ?? 0), 0),
    fill: SEGMENTO_COLORS[s],
  }));

  const barData = ['A', 'B', 'C'].map((s) => ({
    segmento: `Seg. ${s}`,
    proveedores: bySegmento[s].length,
  }));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Summary cards */}
      <div className="flex gap-3 px-4 pt-4 pb-2 shrink-0">
        {['A', 'B', 'C'].map((s) => (
          <div
            key={s}
            className="flex-1 rounded-xl border bg-white p-3 shadow-sm"
            style={{ borderTopColor: SEGMENTO_COLORS[s], borderTopWidth: 3 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: SEGMENTO_COLORS[s] }}
              >{s}</span>
              <p className="text-[10px] text-slate-500">
                {s === 'A' ? 'Top 80% gasto' : s === 'B' ? '80–95% acum.' : '+95% acum.'}
              </p>
            </div>
            <p className="text-sm font-bold text-slate-900">{formatCurrency(bySegmento[s].reduce((sum, p) => sum + (p.total_comprado ?? 0), 0))}</p>
            <p className="text-[10px] text-slate-400">{bySegmento[s].length} proveedores</p>
          </div>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 gap-2 px-2 pb-3">
        <div className="flex-1 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                outerRadius="70%"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
              </Pie>
              <Tooltip formatter={(v) => [formatCurrency(v), 'Gasto']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="segmento" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="proveedores" name="Proveedores" radius={[4, 4, 0, 0]}>
                {barData.map((_, i) => <Cell key={i} fill={SEGMENTO_COLORS[['A', 'B', 'C'][i]]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
