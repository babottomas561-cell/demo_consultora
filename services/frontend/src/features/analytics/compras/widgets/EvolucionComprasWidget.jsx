import { Inbox } from 'lucide-react';
import {
  ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChartSkeleton, WidgetEmptyState } from '../../../../components/ui/WidgetSkeleton';
import ChartTooltip from '../../../../components/analytics/ChartTooltip';
import { useComprasData } from '../ComprasDataContext';

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

const GRAN_OPTIONS = [
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'trimestre', label: 'Trimestre' },
];

export default function EvolucionComprasWidget() {
  const { temporal, loadingTemporal, granularidad, setGranularidad, comparar } = useComprasData();

  if (loadingTemporal) {
    return <ChartSkeleton />;
  }

  const series = temporal?.series ?? [];
  if (!series.length) return (
    <WidgetEmptyState icon={Inbox} title="Sin datos de evolución" subtitle="No hay compras en el período seleccionado." />
  );

  return (
    <div className="h-full w-full p-4 pt-2 flex flex-col">
      <div className="flex justify-end mb-2 gap-1">
        {GRAN_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setGranularidad(key)}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              granularidad === key
                ? 'bg-teal-600 text-white'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="periodo" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmtPeriod} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmtM} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
            <Tooltip content={<ChartTooltip format="currency" />} />
            <Legend verticalAlign="bottom" iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            {comparar && <Bar yAxisId="left" dataKey="total_comprado_anterior" name="Período anterior" fill="#e2e8f0" radius={[3, 3, 0, 0]} />}
            <Bar yAxisId="left" dataKey="total_comprado" name="Total comprado" fill="#0f766e" radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="ordenes" name="Órdenes" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
