import { useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useVentasData } from '../VentasDataContext';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

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

const YEAR_COLORS = ['#94a3b8', '#818cf8', '#4f46e5'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1">{MONTHS[Number(label) - 1] ?? label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold tabular-nums text-slate-900">{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function YearOverYearWidget() {
  const { fetchYoy, yoy, loadingYoy } = useVentasData();

  useEffect(() => {
    fetchYoy?.();
  }, [fetchYoy]);

  const chartData = useMemo(() => {
    if (!yoy?.length) return [];
    // Build rows indexed by month (1-12)
    const byMonth = {};
    for (let m = 1; m <= 12; m++) byMonth[m] = { month: m };

    yoy.forEach(({ year, series }) => {
      series.forEach((r) => {
        const raw = String(r.periodo ?? '');
        let month = null;
        if (raw.length === 7) month = parseInt(raw.split('-')[1], 10);
        else if (raw.length >= 10) month = parseInt(raw.substring(5, 7), 10);
        if (month && byMonth[month]) {
          byMonth[month][String(year)] = Number(r.facturado ?? 0);
        }
      });
    });

    return Object.values(byMonth);
  }, [yoy]);

  const years = useMemo(() => yoy?.map((y) => y.year) ?? [], [yoy]);

  if (loadingYoy) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-indigo-400" size={24} />
      </div>
    );
  }

  if (!chartData.length || !years.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos históricos.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 pt-2 flex flex-col gap-2">
      <p className="text-[11px] text-slate-500">Comparativa año a año — mismos meses, distintos años. Ideal para detectar estacionalidad.</p>
      <div className="shrink-0 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-[10px] text-amber-700 font-medium">
        ⚠ Valores nominales sin ajuste por inflación. Un crecimiento nominal no implica crecimiento real.
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: 4, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(m) => MONTHS[Number(m) - 1] ?? m}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmtM} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {years.map((year, i) => (
              <Line
                key={year}
                type="monotone"
                dataKey={String(year)}
                name={String(year)}
                stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                strokeWidth={i === years.length - 1 ? 2.5 : 1.5}
                dot={{ r: 3, fill: YEAR_COLORS[i % YEAR_COLORS.length], strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
