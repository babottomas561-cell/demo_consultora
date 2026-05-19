import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';
import { formatCurrencyShort } from '../../analyticsUtils';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const MODES = [
  { id: 'total',    label: 'Total período',    field: 'facturado',              suffix: '' },
  { id: 'promedio', label: 'Promedio por día', field: 'facturado_promedio_dia', suffix: '/día' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs min-w-[180px]">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      <div className="space-y-0.5 text-slate-600">
        <div className="flex justify-between gap-4">
          <span>Facturado total</span>
          <span className="font-semibold tabular-nums text-slate-800">{fmtM(d?.facturado)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>% del total</span>
          <span className="font-semibold tabular-nums">{fmtPct(d?.pct_total)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Promedio por día</span>
          <span className="font-semibold tabular-nums text-slate-800">{fmtM(d?.facturado_promedio_dia)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Tickets</span>
          <span className="font-semibold tabular-nums">{d?.tickets}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Días activos</span>
          <span className="font-semibold tabular-nums">{d?.dias_activos}</span>
        </div>
      </div>
    </div>
  );
};

export default function DiaSemanaWidget() {
  const { diaSemana, loadingDiaSemana, fetchDiaSemana } = useVentasData();
  const [mode, setMode] = useState('promedio');

  useEffect(() => { fetchDiaSemana(); }, [fetchDiaSemana]);

  if (loadingDiaSemana) return <ChartSkeleton />;

  const data = diaSemana?.por_dia ?? [];
  if (!data.length) return <p className="p-4 text-sm text-slate-400">Sin datos por día de semana.</p>;

  const field = MODES.find(m => m.id === mode).field;
  const activos = data.filter(d => Number(d[field] ?? 0) > 0);
  const maxVal = activos.length ? Math.max(...activos.map(d => Number(d[field]))) : 0;
  const minVal = activos.length ? Math.min(...activos.map(d => Number(d[field]))) : 0;

  const colorFor = (v) => {
    if (v <= 0) return '#e2e8f0';                    // sin actividad
    if (v === maxVal) return '#4f46e5';              // mejor día
    if (v === minVal && minVal !== maxVal) return '#fb923c'; // peor día
    return '#a5b4fc';
  };

  const mejorDia = activos.length
    ? activos.reduce((a, b) => (a[field] > b[field] ? a : b))
    : data[0];
  const peorDia = activos.length
    ? activos.reduce((a, b) => (a[field] < b[field] ? a : b))
    : data[0];

  return (
    <div className="h-full flex flex-col px-3 py-2 gap-2">
      {/* Mode toggle */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex gap-1">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors
                ${mode === m.id ? 'bg-indigo-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-2 py-1.5">
          <p className="text-[9px] font-semibold text-indigo-400 uppercase tracking-wide">Mejor día</p>
          <p className="text-sm font-bold text-indigo-700">{mejorDia?.dia}</p>
          <p className="text-[10px] text-indigo-500 tabular-nums">{formatCurrencyShort(mejorDia?.[field])}</p>
        </div>
        <div className="rounded-xl bg-orange-50 border border-orange-100 px-2 py-1.5">
          <p className="text-[9px] font-semibold text-orange-400 uppercase tracking-wide">Día más flojo</p>
          <p className="text-sm font-bold text-orange-700">{peorDia?.dia}</p>
          <p className="text-[10px] text-orange-500 tabular-nums">{formatCurrencyShort(peorDia?.[field])}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 4, right: 4, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtM} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={field} name="Facturado" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={colorFor(Number(d[field] ?? 0))} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[9px] text-slate-400 text-center shrink-0">
        {mode === 'promedio'
          ? 'Promedio por cada día activo (excluye feriados/cerrados)'
          : 'Suma total del facturado del período por día de la semana'}
      </p>
    </div>
  );
}
