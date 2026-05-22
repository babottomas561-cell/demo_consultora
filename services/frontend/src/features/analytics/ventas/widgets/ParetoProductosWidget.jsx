import {
  ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import { Loader2, Inbox } from 'lucide-react';
import { formatCurrency } from '../../analyticsUtils';
import { useVentasData } from '../VentasDataContext';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

// Truncate long product names for the axis tick
const truncate = (str, max = 14) =>
  str?.length > max ? `${str.slice(0, max)}…` : (str ?? '');

const CustomXTick = ({ x, y, payload, index }) => {
  // Only label the first 8 products to avoid overlap
  if (index >= 8) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0} y={0} dy={12}
        textAnchor="end"
        fill="#64748b"
        fontSize={9}
        transform="rotate(-35)"
      >
        {truncate(payload.value)}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload ?? {};
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1 min-w-[180px]">
      <p className="font-semibold text-slate-700 truncate max-w-[200px]">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Facturado</span>
        <span className="font-semibold">{formatCurrency(d.facturado)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">% Acumulado</span>
        <span className="font-semibold text-orange-500">{Number(d.acumulado_pct ?? 0).toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default function ParetoProductosWidget() {
  const { productos, loadingProductos } = useVentasData();

  if (loadingProductos) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;
  }

  const pareto = productos?.pareto ?? [];
  if (!pareto.length) return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-400">
      <Inbox size={24} />
      <p className="text-sm">Sin datos de productos.</p>
    </div>
  );

  // Color bars: dark indigo for products within 80% threshold, lighter for the rest
  const threshold80 = pareto.findIndex((r) => r.acumulado_pct >= 80);

  return (
    <div className="h-full w-full p-4 pt-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={pareto} margin={{ bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="producto" axisLine={false} tickLine={false} tick={<CustomXTick />} interval={0} height={50} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} />
          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Bar yAxisId="left" dataKey="facturado" name="Facturado" radius={[3, 3, 0, 0]}>
            {pareto.map((_, i) => (
              <Cell key={i} fill={threshold80 < 0 || i <= threshold80 ? '#4f46e5' : '#a5b4fc'} />
            ))}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="acumulado_pct" name="% Acum." stroke="#f97316" strokeWidth={2} dot={false} />
          <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '80%', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
