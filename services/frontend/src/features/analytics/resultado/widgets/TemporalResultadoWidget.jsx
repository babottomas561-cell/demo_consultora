import { Inbox } from 'lucide-react';
import {
  Area, AreaChart, Bar, CartesianGrid, ComposedChart, Legend, Line,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartSkeleton, WidgetEmptyState } from '../../../../components/ui/WidgetSkeleton';
import { useResultadoData } from '../ResultadoDataContext';
import { formatCurrency } from '../../analyticsUtils';

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
const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const GRANULARIDADES = [
  { key: 'dia',       label: 'Día'  },
  { key: 'semana',    label: 'Sem.' },
  { key: 'mes',       label: 'Mes'  },
  { key: 'trimestre', label: 'Trim.'},
];

export default function TemporalResultadoWidget() {
  const { temporal, loadingTemporal, granularidad, setGranularidad } = useResultadoData();

  if (loadingTemporal) {
    return <ChartSkeleton />;
  }

  const series = temporal?.series ?? [];

  if (!series.length) {
    return (
      <WidgetEmptyState icon={Inbox} title="Sin datos temporales" subtitle="No hay resultados en el período seleccionado." />
    );
  }

  const avgMargen = series.reduce((s, r) => s + (r.margen_pct ?? 0), 0) / series.length;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Granularity selector */}
      <div className="flex gap-1.5 px-4 pt-4 pb-2 shrink-0">
        {GRANULARIDADES.map((g) => (
          <button
            key={g.key}
            onClick={() => setGranularidad(g.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              g.key === granularidad
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* ComposedChart: facturado + COGS + margen */}
      <div className="flex-1 min-h-0 px-2">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-2 mb-1">Facturación, COGS y Margen</p>
        <ResponsiveContainer width="100%" height="50%">
          <ComposedChart data={series} margin={{ top: 4, right: 48, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={fmtPeriod} />
            <YAxis yAxisId="left" tickFormatter={fmtM} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v, n) => n === 'Margen %' ? [fmtPct(v), n] : [formatCurrency(v), n]} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            <Bar yAxisId="left" dataKey="facturado_neto" name="Facturado neto" fill="#4f46e5" radius={[3, 3, 0, 0]} />
            <Bar yAxisId="left" dataKey="cogs" name="COGS" fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Line yAxisId="left" dataKey="margen_bruto" name="Margen $" stroke="#16a34a" strokeWidth={2} dot={false} />
            <Line yAxisId="right" dataKey="margen_pct" name="Margen %" stroke="#16a34a" strokeDasharray="5 5" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Area chart: margin % trend */}
        <ResponsiveContainer width="100%" height="50%">
          <AreaChart data={series} margin={{ top: 4, right: 48, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={fmtPeriod} />
            <YAxis domain={['auto', 'auto']} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [fmtPct(v), 'Margen %']} />
            <ReferenceLine
              y={avgMargen}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: `Prom. ${fmtPct(avgMargen)}`, position: 'right', fontSize: 9, fill: '#94a3b8' }}
            />
            <defs>
              <linearGradient id="margenGradR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="margen_pct" name="Margen %" stroke="#16a34a" fill="url(#margenGradR)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
