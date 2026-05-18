import {
  ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtCurrency = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(v ?? 0));

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const facturado = payload.find((p) => p.dataKey === 'facturado');
  const acum = payload.find((p) => p.dataKey === 'acumulado_pct');
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs space-y-1 max-w-[220px]">
      {label && <p className="font-semibold text-slate-700 border-b border-slate-100 pb-1 truncate">{label}</p>}
      {facturado && (
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: facturado.fill ?? '#4f46e5' }} />
          <span className="text-slate-500 flex-1">Facturado</span>
          <span className="font-semibold tabular-nums">{fmtCurrency(facturado.value)}</span>
        </div>
      )}
      {acum && (
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: '#f97316' }} />
          <span className="text-slate-500 flex-1">% Acumulado</span>
          <span className="font-semibold tabular-nums">{Number(acum.value ?? 0).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

export default function ParetoProductosWidget() {
  const { productos, loadingProductos } = useVentasData();

  if (loadingProductos) {
    return <TableSkeleton />;
  }

  const pareto = productos?.pareto ?? [];
  if (!pareto.length) return <p className="p-4 text-sm text-slate-400">Sin datos de productos.</p>;

  return (
    <div className="h-full w-full p-3 pt-1">
      <p className="text-[10px] text-slate-400 text-right mb-0.5">Hover para ver el producto</p>
      <ResponsiveContainer width="100%" height="95%">
        <ComposedChart data={pareto} margin={{ left: 4, right: 4, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="producto" axisLine={false} tickLine={false} tick={false} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} />
          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Bar yAxisId="left" dataKey="facturado" name="Facturado" fill="#4f46e5" radius={[3, 3, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="acumulado_pct" name="% Acum." stroke="#f97316" strokeWidth={2} dot={false} />
          <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '80%', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
