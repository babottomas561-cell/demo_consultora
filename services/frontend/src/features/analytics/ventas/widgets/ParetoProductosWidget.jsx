import {
  ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import ChartTooltip from '../../../../components/analytics/ChartTooltip';
import { useVentasData } from '../VentasDataContext';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export default function ParetoProductosWidget() {
  const { productos, loadingProductos } = useVentasData();

  if (loadingProductos) {
    return <TableSkeleton />;
  }

  const pareto = productos?.pareto ?? [];
  if (!pareto.length) return <p className="p-4 text-sm text-slate-400">Sin datos de productos.</p>;

  return (
    <div className="h-full w-full p-4 pt-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={pareto}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="producto" axisLine={false} tickLine={false} tick={false} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} />
          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
          <Tooltip content={<ChartTooltip />} />
          <Bar yAxisId="left" dataKey="facturado" name="Facturado" fill="#4f46e5" radius={[3, 3, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="acumulado_pct" name="% Acum." stroke="#f97316" strokeWidth={2} dot={false} />
          <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '80%', fill: '#ef4444', fontSize: 10 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
