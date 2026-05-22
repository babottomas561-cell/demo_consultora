import { Inbox } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVendedoresData } from '../VendedoresDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const V_COLORS = ['#4f46e5', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#eab308', '#ef4444'];
const getColor = (i) => V_COLORS[i % V_COLORS.length];

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

const METRICS = [
  { key: 'facturado', label: 'Facturado' },
  { key: 'tickets',   label: 'Tickets'   },
  { key: 'margen',    label: 'Margen'    },
];

export default function EvolucionVendedoresWidget() {
  const { temporal, loadingTemporal, fetchTemporal } = useVendedoresData();
  const [metric, setMetric] = useState('facturado');

  useEffect(() => { fetchTemporal(); }, [fetchTemporal]);

  if (loadingTemporal) {
    return <ChartSkeleton />;
  }

  const { vendedores = [], series = [] } = temporal ?? {};

  if (!series.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-400">
        <Inbox size={24} />
        <p className="text-sm">Sin datos de evolución.</p>
      </div>
    );
  }

  const chartData = series.map((s) => {
    const point = { periodo: fmtPeriod(s.periodo) };
    vendedores.forEach((v) => {
      const cv = String(v.cod_vendedor);
      point[cv] = s[cv]?.[metric] ?? 0;
    });
    return point;
  });

  const isCurrency = metric !== 'tickets';

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Metric selector */}
      <div className="flex gap-2 px-4 pt-4 pb-2 shrink-0">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              metric === m.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 px-2 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={isCurrency ? fmtM : formatNumber}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              axisLine={false} tickLine={false}
            />
            <Tooltip
              formatter={(v, name) => {
                const vend = vendedores.find((vv) => String(vv.cod_vendedor) === name);
                return [isCurrency ? formatCurrency(v) : formatNumber(v), vend?.nombre ?? name];
              }}
            />
            <Legend
              formatter={(value) => {
                const vend = vendedores.find((v) => String(v.cod_vendedor) === value);
                return <span className="text-xs text-slate-600">{vend?.nombre ?? value}</span>;
              }}
            />
            {vendedores.map((v, i) => (
              <Line
                key={v.cod_vendedor}
                type="monotone"
                dataKey={String(v.cod_vendedor)}
                name={String(v.cod_vendedor)}
                stroke={getColor(i)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
