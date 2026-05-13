import {
  ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Loader2 } from 'lucide-react';
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
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const fmtCurrency = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(v ?? 0));

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  // Filter out the internal nc_neg key — show as devoluciones with positive value
  const items = payload.map((p) => ({
    ...p,
    name: p.dataKey === 'nc_neg' ? 'NC / Devoluciones' : p.name,
    value: p.dataKey === 'nc_neg' ? Math.abs(p.value) : p.value,
  }));
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1 min-w-[180px]">
      <p className="font-semibold text-slate-700 mb-1">{fmtPeriod(label)}</p>
      {items.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className={`font-semibold tabular-nums ${p.dataKey === 'nc_neg' ? 'text-red-600' : Number(p.value) < 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {p.dataKey === 'tickets' || p.dataKey === 'tickets_anterior'
              ? Number(p.value).toLocaleString('es-AR')
              : fmtCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const GRAN_OPTIONS = [
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'trimestre', label: 'Trimestre' },
];

export default function EvolucionTemporalWidget() {
  const { temporal, loadingTemporal, granularidad, setGranularidad, comparar } = useVentasData();

  if (loadingTemporal) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;
  }

  const rawSeries = temporal?.series ?? [];
  if (!rawSeries.length) return <p className="p-4 text-sm text-slate-400">Sin datos de evolución temporal.</p>;

  // Enrich data: add nc_neg (negative value for below-zero bar rendering)
  const hasFaBruto = rawSeries.some((r) => r.fa_bruto !== undefined);
  const series = hasFaBruto
    ? rawSeries.map((r) => ({ ...r, nc_neg: -(Number(r.devoluciones ?? 0)) }))
    : rawSeries;

  const hasNegativeNet = series.some((r) => Number(r.facturado ?? 0) < 0);

  return (
    <div className="h-full w-full p-4 pt-2 flex flex-col">
      <div className="flex items-center justify-between mb-2 gap-2">
        {hasNegativeNet ? (
          <span className="text-[11px] text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded px-2 py-0.5 shrink-0">
            ⚠ NC &gt; FA en algunos períodos
          </span>
        ) : <span />}
        <div className="flex gap-1">
          {GRAN_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setGranularidad(key)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                granularidad === key
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ left: 4, right: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="periodo" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmtPeriod} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmtM} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
            <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" strokeWidth={1} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" iconType="square" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />

            {/* Período anterior */}
            {comparar && (
              <Bar yAxisId="left" dataKey="facturado_anterior" name="Neto anterior" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
            )}

            {/* FA bruto — shown only when new API fields are available */}
            {hasFaBruto && (
              <Bar yAxisId="left" dataKey="fa_bruto" name="FA bruto" fill="#818cf8" radius={[3, 3, 0, 0]} opacity={0.55} />
            )}

            {/* NC negativos — shown below zero so user sees what's eating margin */}
            {hasFaBruto && (
              <Bar yAxisId="left" dataKey="nc_neg" name="NC / Devol." fill="#f87171" radius={[0, 0, 3, 3]} opacity={0.8} />
            )}

            {/* Neto = FA − NC (line, can be negative) */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="facturado"
              name="Neto facturado"
              stroke="#4f46e5"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />

            {/* Tickets on right axis */}
            <Line yAxisId="right" type="monotone" dataKey="tickets" name="Tickets" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
