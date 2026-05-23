import { useMemo, useState } from 'react';
import {
  ComposedChart, Bar, Line, Area, AreaChart, BarChart, LineChart,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useVentasData } from '../VentasDataContext';
import SmartWidget from '../../../../components/analytics/SmartWidget/SmartWidget';
import { useWidgetSetting } from '../../../../store/widgetSettingsStore';

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

const METRIC_LABELS = {
  facturado: 'Bruto (c/IVA)',
  facturado_sin_iva: 'Neto (s/IVA)',
  facturado_anterior: 'Anterior (c/IVA)',
  facturado_sin_iva_anterior: 'Anterior (s/IVA)',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const items = payload.map((p) => ({
    ...p,
    name: p.dataKey === 'nc_neg' ? 'NC / Devoluciones' : (METRIC_LABELS[p.dataKey] || p.name),
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

const CHART_TYPE_OPTIONS = [
  { value: 'composed', label: 'Compuesto' },
  { value: 'bar',      label: 'Barras'    },
  { value: 'area',     label: 'Área'      },
  { value: 'line',     label: 'Línea'     },
];

const GRAN_OPTIONS = [
  { value: 'dia',       label: 'Día'       },
  { value: 'semana',    label: 'Semana'    },
  { value: 'mes',       label: 'Mes'       },
  { value: 'trimestre', label: 'Trimestre' },
];

// Simple linear regression for forecast overlay
const linearForecast = (series, key, steps = 3) => {
  const vals = series.map((r, i) => ({ x: i, y: Number(r[key] ?? 0) })).filter((p) => p.y > 0);
  if (vals.length < 3) return [];
  const n = vals.length;
  const sumX = vals.reduce((a, p) => a + p.x, 0);
  const sumY = vals.reduce((a, p) => a + p.y, 0);
  const sumXY = vals.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = vals.reduce((a, p) => a + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return Array.from({ length: steps }, (_, i) => {
    const x = n + i;
    return { periodoForecast: `F+${i + 1}`, forecast: Math.max(0, slope * x + intercept) };
  });
};

const WIDGET_ID = 'ventas-evolucion';

function EvolucionChart({ series, chartType, comparar, showForecast, showMargen, metric = 'facturado' }) {
  const hasFaBruto = series.some((r) => r.fa_bruto !== undefined);
  const hasMargen = showMargen && series.some((r) => r.margen_pct != null);
  const mainKey = metric;
  const anteriorKey = metric === 'facturado_sin_iva' ? 'facturado_sin_iva_anterior' : 'facturado_anterior';
  const mainLabel = metric === 'facturado_sin_iva' ? 'Neto s/IVA' : 'Neto c/IVA';
  const data = hasFaBruto
    ? series.map((r) => ({ ...r, nc_neg: -(Number(r.devoluciones ?? 0)) }))
    : series;
  const hasNegativeNet = data.some((r) => Number(r[mainKey] ?? 0) < 0);

  const forecastPoints = showForecast ? linearForecast(series, mainKey) : [];
  const allData = [...data, ...forecastPoints];

  const commonProps = {
    data: allData,
    margin: { left: 4, right: 4 },
  };
  const xAxis = (
    <XAxis dataKey="periodo" axisLine={false} tickLine={false}
      tick={{ fill: '#64748b', fontSize: 11 }}
      tickFormatter={(v) => v?.startsWith('F+') ? v : fmtPeriod(v)} />
  );
  const yAxisLeft = (
    <YAxis yAxisId="left" axisLine={false} tickLine={false}
      tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmtM} />
  );
  const yAxisRight = (
    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
      tick={{ fill: hasMargen ? '#059669' : '#cbd5e1', fontSize: 11 }}
      tickFormatter={hasMargen ? (v) => `${v}%` : undefined} />
  );
  const grid = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />;
  const tooltip = <Tooltip content={<CustomTooltip />} />;
  const legend = <Legend verticalAlign="bottom" iconType="square" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />;

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...commonProps}>
          {grid}{xAxis}{yAxisLeft}{tooltip}{legend}
          <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" />
          {comparar && <Bar yAxisId="left" dataKey={anteriorKey} name="Anterior" fill="#e2e8f0" radius={[3,3,0,0]} />}
          <Bar yAxisId="left" dataKey={mainKey} name={mainLabel} fill="#4f46e5" radius={[3,3,0,0]} />
          {showForecast && <Bar yAxisId="left" dataKey="forecast" name="Pronóstico" fill="#4f46e5" fillOpacity={0.3} radius={[3,3,0,0]} strokeDasharray="4 2" />}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart {...commonProps}>
          {grid}{xAxis}{yAxisLeft}{tooltip}{legend}
          {comparar && <Area yAxisId="left" type="monotone" dataKey={anteriorKey} name="Anterior" stroke="#e2e8f0" fill="#e2e8f0" fillOpacity={0.4} />}
          <Area yAxisId="left" type="monotone" dataKey={mainKey} name={mainLabel} stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} />
          {showForecast && <Area yAxisId="left" type="monotone" dataKey="forecast" name="Pronóstico" stroke="#4f46e5" strokeDasharray="5 3" fill="#4f46e5" fillOpacity={0.08} />}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart {...commonProps}>
          {grid}{xAxis}{yAxisLeft}{tooltip}{legend}
          <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" />
          {comparar && <Line yAxisId="left" type="monotone" dataKey={anteriorKey} name="Anterior" stroke="#cbd5e1" strokeWidth={1.5} dot={false} />}
          <Line yAxisId="left" type="monotone" dataKey={mainKey} name={mainLabel} stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }} activeDot={{ r: 5 }} />
          {showForecast && <Line yAxisId="left" type="monotone" dataKey="forecast" name="Pronóstico" stroke="#4f46e5" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Default: composed
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart {...commonProps}>
        {grid}{xAxis}{yAxisLeft}{yAxisRight}
        <ReferenceLine yAxisId="left" y={0} stroke="#94a3b8" strokeWidth={1} />
        {tooltip}{legend}
        {comparar && <Bar yAxisId="left" dataKey={anteriorKey} name={`${mainLabel} anterior`} fill="#e2e8f0" radius={[3,3,0,0]} />}
        {hasFaBruto && mainKey === 'facturado' && <Bar yAxisId="left" dataKey="fa_bruto" name="FA bruto" fill="#818cf8" radius={[3,3,0,0]} opacity={0.55} />}
        {hasFaBruto && mainKey === 'facturado' && <Bar yAxisId="left" dataKey="nc_neg" name="NC / Devol." fill="#f87171" radius={[0,0,3,3]} opacity={0.8} />}
        <Line yAxisId="left" type="monotone" dataKey={mainKey} name={mainLabel} stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3, fill: '#4f46e5', strokeWidth: 0 }} activeDot={{ r: 5 }} />
        {!hasMargen && <Line yAxisId="right" type="monotone" dataKey="tickets" name="Tickets" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />}
        {hasMargen && <Line yAxisId="right" type="monotone" dataKey="margen_pct" name="Margen%" stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: '#059669', strokeWidth: 0 }} activeDot={{ r: 5 }} />}
        {showForecast && <Line yAxisId="left" type="monotone" dataKey="forecast" name="Pronóstico" stroke="#4f46e5" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

const METRIC_OPTIONS = [
  { value: 'facturado', label: 'Bruto (c/IVA)' },
  { value: 'facturado_sin_iva', label: 'Neto (s/IVA)' },
];

export default function EvolucionTemporalWidget() {
  const { temporal, loadingTemporal, granularidad, setGranularidad, comparar } = useVentasData();
  const setting = useWidgetSetting(WIDGET_ID);
  const [showForecast, setShowForecast] = useState(false);
  const [showMargen, setShowMargen] = useState(false);
  const [metric, setMetric] = useState('facturado');

  const chartType = setting.chartType || 'composed';
  const activeGran = setting.granularity || granularidad || 'mes';

  const handleGranularityChange = (g) => {
    setGranularidad(g);
  };

  const rawSeries = temporal?.series ?? [];
  const isEmpty = !loadingTemporal && rawSeries.length === 0;
  const hasNegativeNet = rawSeries.some((r) => Number(r.facturado ?? 0) < 0);
  const metricLabel = metric === 'facturado' ? 'Bruto (c/IVA)' : 'Neto (s/IVA)';

  const exportData = rawSeries.map((r) => ({
    Período: r.periodo,
    'Facturado bruto (c/IVA)': r.facturado,
    'Facturado neto (s/IVA)': r.facturado_sin_iva,
    'IVA Débito': r.iva_debito,
    'Facturado anterior': r.facturado_anterior,
    Tickets: r.tickets,
  }));

  return (
    <SmartWidget
      widgetId={WIDGET_ID}
      title="Evolución Temporal"
      subtitle={`${metricLabel} y tickets por período`}
      info="Facturación Bruta = con IVA (total factura). Neta = sin IVA (base imponible). Activá margen o pronóstico desde settings."
      loading={loadingTemporal}
      empty={isEmpty}
      chartTypeOptions={CHART_TYPE_OPTIONS}
      granularityOptions={GRAN_OPTIONS}
      onGranularityChange={handleGranularityChange}
      exportData={exportData}
      exportFilename="evolucion-ventas"
      exportColumns={[
        { key: 'Período', label: 'Período' },
        { key: 'Facturado bruto (c/IVA)', label: 'Bruto c/IVA' },
        { key: 'Facturado neto (s/IVA)', label: 'Neto s/IVA' },
        { key: 'IVA Débito', label: 'IVA Débito' },
        { key: 'Facturado anterior', label: 'Anterior' },
        { key: 'Tickets', label: 'Tickets' },
      ]}
      customSettingsFields={
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Métrica principal</span>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 bg-white"
            >
              {METRIC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Mostrar margen bruto%</span>
            <button
              onClick={() => setShowMargen((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showMargen ? 'bg-emerald-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${showMargen ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Mostrar pronóstico lineal</span>
            <button
              onClick={() => setShowForecast((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showForecast ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${showForecast ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      }
      rightExtras={
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5 bg-slate-100 rounded-md p-0.5">
            {METRIC_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setMetric(o.value)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${metric === o.value ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {hasNegativeNet && (
            <span className="text-[10px] text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
              NC &gt; FA
            </span>
          )}
        </div>
      }
    >
      <div className="h-full w-full p-3 pt-1">
        <EvolucionChart
          series={rawSeries}
          chartType={chartType}
          comparar={comparar}
          showForecast={showForecast}
          showMargen={showMargen}
          metric={metric}
        />
      </div>
    </SmartWidget>
  );
}
