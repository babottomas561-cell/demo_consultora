import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';
import { formatCurrencyShort } from '../../analyticsUtils';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-1 truncate max-w-[180px]">{d?.nombre}</p>
      <div className="space-y-0.5 text-slate-600">
        <div className="flex justify-between gap-3"><span>Facturado</span><span className="font-semibold tabular-nums text-slate-800">{formatCurrencyShort(d?.facturado)}</span></div>
        <div className="flex justify-between gap-3"><span>% total</span><span className="font-semibold tabular-nums">{d?.pct_total?.toFixed(1)}%</span></div>
        {d?.margen_pct != null && (
          <div className="flex justify-between gap-3"><span>Margen</span><span className={`font-semibold tabular-nums ${d.margen_pct >= 25 ? 'text-emerald-600' : 'text-amber-600'}`}>{d.margen_pct.toFixed(1)}%</span></div>
        )}
      </div>
    </div>
  );
};

const RADIAN = Math.PI / 180;
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct_total, nombre }) => {
  if (pct_total < 5) return null;
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}>
      {nombre?.length > 14 ? nombre.slice(0, 14) + '…' : nombre} {pct_total?.toFixed(0)}%
    </text>
  );
};

export default function RubroPieWidget() {
  const { productos, loadingProductos } = useVentasData();

  if (loadingProductos) return <ChartSkeleton />;

  const rubros = productos?.por_rubro?.length ? productos.por_rubro : (productos?.por_subrubro ?? []);
  if (!rubros.length) return <p className="p-4 text-sm text-slate-400">Sin datos de rubros.</p>;

  // Calculate pct_total if not present
  const total = rubros.reduce((s, r) => s + (r.facturado || 0), 0) || 1;
  const data = rubros.map(r => ({
    ...r,
    pct_total: r.pct_total ?? (r.facturado / total * 100),
  }));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden px-2 pb-1">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="facturado"
              nameKey="nombre"
              cx="50%"
              cy="50%"
              innerRadius="30%"
              outerRadius="65%"
              paddingAngle={1.5}
              label={renderLabel}
              labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
            >
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
