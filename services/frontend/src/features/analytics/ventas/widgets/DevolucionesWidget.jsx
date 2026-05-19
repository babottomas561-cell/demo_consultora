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

  if (!hasDevoluciones) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4 gap-2">
        <span className="text-3xl">✓</span>
        <p className="text-sm font-medium text-slate-700">Sin devoluciones</p>
        <p className="text-xs text-slate-400">No hay notas de crédito en este período.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-3 pt-1">
      <p className="text-xs font-semibold text-slate-500 mb-1">NC / Devoluciones por período</p>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={series} margin={{ left: 0, right: 4, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="periodo"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickFormatter={fmtPeriod}
            interval="preserveStartEnd"
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} width={48} />
          <Tooltip
            content={<ChartTooltip format="currency" labelFormatter={fmtPeriod} />}
          />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="devoluciones"
            name="Devoluciones"
            stroke="#ef4444"
            fill="#fef2f2"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
