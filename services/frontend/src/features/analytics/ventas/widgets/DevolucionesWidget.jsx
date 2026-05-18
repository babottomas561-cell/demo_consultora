import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import ChartTooltip from '../../../../components/analytics/ChartTooltip';
import { useVentasData } from '../VentasDataContext';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const fmtPeriod = (v) => {
  if (!v) return '';
  const raw = String(v);
  const date = raw.length === 7 ? new Date(`${raw}-01T00:00:00`) : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return `${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
};
const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export default function DevolucionesWidget() {
  const { temporal, loadingTemporal } = useVentasData();

  if (loadingTemporal) {
    return <ChartSkeleton />;
  }

  const series = temporal?.series ?? [];
  const hasDevoluciones = series.some((row) => Number(row.devoluciones || 0) > 0);

  if (!hasDevoluciones) return <p className="p-4 text-sm text-slate-400">Sin devoluciones en este período.</p>;

  return (
    <div className="h-full w-full p-4 pt-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="periodo" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmtPeriod} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmtM} />
          <Tooltip content={<ChartTooltip format="currency" />} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="devoluciones" name="Devoluciones" stroke="#ef4444" fill="#fef2f2" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
