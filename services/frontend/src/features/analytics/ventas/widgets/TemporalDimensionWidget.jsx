import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
         BarChart, Bar, CartesianGrid, XAxis, YAxis, AreaChart, Area } from 'recharts';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';
import { formatCurrencyShort } from '../../analyticsUtils';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const fmtPeriod = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
};
const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bi-chart-tooltip text-xs min-w-[170px] max-h-[200px] overflow-auto">
      <p className="font-semibold text-slate-700 mb-1">{fmtPeriod(label)}</p>
      {payload.filter(p => p.value > 0).map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1 truncate max-w-[120px]">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
            <span className="truncate">{p.dataKey}</span>
          </span>
          <span className="font-semibold tabular-nums text-slate-800">{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bi-chart-tooltip text-xs">
      <p className="font-semibold text-slate-700">{d?.nombre}</p>
      <p className="text-slate-600">{formatCurrencyShort(d?.facturado_bruto)} ({d?.pct_total?.toFixed(1)}%)</p>
    </div>
  );
};

const DIMENSIONS = [
  { key: 'rubro', label: 'Rubro' },
  { key: 'lista', label: 'Lista' },
  { key: 'vendedor', label: 'Vendedor' },
  { key: 'deposito', label: 'Depósito' },
  { key: 'centro_costo', label: 'CC' },
];
const VIEWS = [
  { key: 'pie', label: 'Torta' },
  { key: 'area', label: 'Área' },
  { key: 'bar', label: 'Barras' },
];

export default function TemporalDimensionWidget({ defaultDimension = 'rubro' }) {
  const [dimension, setDimension] = useState(defaultDimension);
  const [view, setView] = useState('area');

  const { data, loading, error } = useInfomanagerFetch('ventas/temporal-por-dimension', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
    dimension,
    granularidad: 'mes',
  }), [dimension]);

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-slate-300 text-sm">Cargando...</div></div>;
  if (error) return <div className="p-4 text-sm text-red-500">{error}</div>;

  const { serie = [], dimensiones = [], resumen = [] } = data || {};

  const controls = (
    <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0 gap-2 flex-wrap">
      <div className="flex gap-0.5 bg-slate-100 rounded-md p-0.5">
        {DIMENSIONS.map((d) => (
          <button
            key={d.key}
            onClick={() => setDimension(d.key)}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${dimension === d.key ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="flex gap-0.5 bg-slate-100 rounded-md p-0.5">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${view === v.key ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (!resumen.length) return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {controls}
      <div className="flex-1 flex items-center justify-center p-4 text-sm text-slate-400">Sin datos para la dimensión seleccionada.</div>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {controls}

      <div className="flex-1 min-h-0 px-2 pb-2">
        {view === 'pie' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={resumen}
                dataKey="facturado_bruto"
                nameKey="nombre"
                cx="50%"
                cy="50%"
                innerRadius="35%"
                outerRadius="70%"
                paddingAngle={1}
                label={({ nombre, pct_total }) => `${nombre?.length > 12 ? nombre.slice(0,12)+'…' : nombre} ${pct_total.toFixed(0)}%`}
                labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              >
                {resumen.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}

        {view === 'area' && serie.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtPeriod} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtM} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {dimensiones.map((dim, i) => (
                <Area key={dim} type="monotone" dataKey={dim} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.6} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}

        {view === 'bar' && serie.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtPeriod} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtM} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {dimensiones.map((dim, i) => (
                <Bar key={dim} dataKey={dim} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
