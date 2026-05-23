import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
         BarChart, Bar, CartesianGrid, XAxis, YAxis, LineChart, Line } from 'recharts';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';
import { formatCurrencyShort } from '../../analyticsUtils';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
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

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs min-w-[150px]">
      <p className="font-semibold text-slate-700 mb-1">{d?.centro_costo}</p>
      <div className="space-y-0.5 text-slate-600">
        <div className="flex justify-between gap-3"><span>Facturado</span><span className="font-semibold tabular-nums text-slate-800">{formatCurrencyShort(d?.facturado_bruto)}</span></div>
        <div className="flex justify-between gap-3"><span>% total</span><span className="font-semibold tabular-nums">{d?.pct_total?.toFixed(1)}%</span></div>
        <div className="flex justify-between gap-3"><span>Tickets</span><span className="tabular-nums">{d?.tickets}</span></div>
        <div className="flex justify-between gap-3"><span>Clientes</span><span className="tabular-nums">{d?.clientes}</span></div>
      </div>
    </div>
  );
};

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1">{fmtPeriod(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />{p.dataKey}</span>
          <span className="font-semibold tabular-nums text-slate-800">{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const VIEWS = [
  { key: 'pie', label: 'Torta' },
  { key: 'bar', label: 'Barras' },
  { key: 'line', label: 'Líneas' },
];

export default function FacturacionCentroCostoWidget() {
  const [view, setView] = useState('pie');
  const { data, loading, error } = useInfomanagerFetch('ventas/por-centro-costo', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
    granularidad: 'mes',
  }));

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-slate-300 text-sm">Cargando...</div></div>;
  if (error) return <div className="p-4 text-sm text-red-500">{error}</div>;
  if (!data?.resumen?.length) return <div className="p-4 text-sm text-slate-400">Sin datos de centros de costo.</div>;

  const { resumen, serie, centros } = data;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-2 pb-1 shrink-0">
        <span className="text-xs text-slate-500">
          Total: <span className="font-semibold text-slate-700">{fmtM(data.total_facturado_bruto)}</span>
          <span className="ml-1 text-[10px] text-slate-400">(con IVA)</span>
        </span>
        <div className="flex gap-0.5 bg-slate-100 rounded-md p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${view === v.key ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-2 pb-2">
        {view === 'pie' && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={resumen}
                dataKey="facturado_bruto"
                nameKey="centro_costo"
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="75%"
                paddingAngle={2}
                label={({ centro_costo, pct_total }) => `${centro_costo} ${pct_total.toFixed(0)}%`}
                labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
              >
                {resumen.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}

        {view === 'bar' && serie?.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtPeriod} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtM} />
              <Tooltip content={<BarTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {centros.map((cc, i) => (
                <Bar key={cc} dataKey={cc} stackId="a" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}

        {view === 'line' && serie?.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtPeriod} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtM} />
              <Tooltip content={<BarTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {centros.map((cc, i) => (
                <Line key={cc} type="monotone" dataKey={cc} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
