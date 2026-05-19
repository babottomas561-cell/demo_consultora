import { useEffect } from 'react';
import { ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';
import { formatCurrencyShort } from '../../analyticsUtils';

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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  const total = Number(d?.facturado_nuevos ?? 0) + Number(d?.facturado_recurrentes ?? 0);
  const pctNuevos = total > 0 ? (Number(d?.facturado_nuevos ?? 0) / total * 100) : 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs min-w-[200px]">
      <p className="font-semibold text-slate-700 mb-1.5">{fmtPeriod(label)}</p>
      <div className="space-y-0.5 text-slate-600">
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />Nuevos
          </span>
          <span className="font-semibold tabular-nums text-slate-800">{fmtM(d?.facturado_nuevos)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shrink-0" />Recurrentes
          </span>
          <span className="font-semibold tabular-nums text-slate-800">{fmtM(d?.facturado_recurrentes)}</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-slate-100 mt-1">
          <span>% de nuevos</span>
          <span className={`font-semibold tabular-nums ${pctNuevos >= 20 ? 'text-emerald-600' : 'text-slate-700'}`}>
            {pctNuevos.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Clientes nuevos</span>
          <span className="font-semibold tabular-nums">{d?.clientes_nuevos}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Recurrentes activos</span>
          <span className="font-semibold tabular-nums">{d?.clientes_recurrentes}</span>
        </div>
      </div>
    </div>
  );
};

export default function NuevosRecurrentesWidget() {
  const { nuevosRecurrentes, loadingNuevosRecurrentes, fetchNuevosRecurrentes } = useVentasData();

  useEffect(() => { fetchNuevosRecurrentes(); }, [fetchNuevosRecurrentes]);

  if (loadingNuevosRecurrentes) return <ChartSkeleton />;

  const series = nuevosRecurrentes?.series ?? [];
  if (!series.length) return <p className="p-4 text-sm text-slate-400">Sin datos.</p>;

  const totalNuevos = series.reduce((a, r) => a + Number(r.facturado_nuevos ?? 0), 0);
  const totalRecurrentes = series.reduce((a, r) => a + Number(r.facturado_recurrentes ?? 0), 0);
  const total = totalNuevos + totalRecurrentes;
  const pctNuevos = total > 0 ? (totalNuevos / total * 100) : 0;

  return (
    <div className="h-full flex flex-col px-3 py-2 gap-2">
      {/* Header KPIs */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-2 py-1.5">
          <p className="text-[9px] font-semibold text-emerald-500 uppercase tracking-wide">Nuevos</p>
          <p className="text-sm font-bold text-emerald-700 tabular-nums">{formatCurrencyShort(totalNuevos)}</p>
        </div>
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-2 py-1.5">
          <p className="text-[9px] font-semibold text-indigo-500 uppercase tracking-wide">Recurrentes</p>
          <p className="text-sm font-bold text-indigo-700 tabular-nums">{formatCurrencyShort(totalRecurrentes)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-2 py-1.5">
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">% Nuevos</p>
          <p className={`text-sm font-bold tabular-nums ${pctNuevos >= 20 ? 'text-emerald-700' : 'text-slate-700'}`}>
            {pctNuevos.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ left: 4, right: 4, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="periodo" axisLine={false} tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={fmtPeriod} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtM} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
              tick={{ fill: '#cbd5e1', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" iconType="square" wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
            <Bar yAxisId="left" dataKey="facturado_recurrentes" name="Recurrentes" fill="#4f46e5" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar yAxisId="left" dataKey="facturado_nuevos" name="Nuevos" fill="#10b981" stackId="a" radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="clientes_nuevos" name="# nuevos" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
