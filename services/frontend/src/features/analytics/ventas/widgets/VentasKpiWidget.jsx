import { useVentasData } from '../VentasDataContext';
import { formatCurrencyShort, formatNumberShort } from '../../analyticsUtils';

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const KPI_DEFS = {
  'ventas-kpi-facturado':    { label: 'Facturado neto',     field: 'facturado_neto',   format: 'currency', severity: 'neutral' },
  'ventas-kpi-tickets':      { label: 'Tickets FA',         field: 'tickets',          format: 'number',   severity: 'neutral' },
  'ventas-kpi-ticket-promedio': { label: 'Ticket promedio',  field: 'ticket_promedio',  format: 'currency', severity: 'success' },
  'ventas-kpi-unidades':     { label: 'Unidades',           field: 'unidades',         format: 'number',   severity: 'neutral' },
  'ventas-kpi-clientes':     { label: 'Clientes únicos',    field: 'clientes_unicos',  format: 'number',   severity: 'neutral' },
  'ventas-kpi-devolucion':   { label: 'Tasa devolución',    field: 'tasa_devolucion',  format: 'percent',  invertTrend: true, getSeverity: (v) => v > 10 ? 'danger' : v > 5 ? 'warning' : 'success' },
  'ventas-kpi-iva':          { label: 'IVA débito fiscal',  field: 'iva_debito',       format: 'currency', severity: 'neutral' },
  'ventas-kpi-margen':       { label: 'Margen bruto est.',  field: 'margen_bruto_pct', format: 'percent',  getSeverity: (v) => v > 30 ? 'success' : v > 15 ? 'neutral' : 'warning' },
};

const SEVERITY_CLASSES = {
  success: { card: 'bg-emerald-50 border-emerald-200', label: 'text-emerald-700', value: 'text-emerald-900', dot: 'bg-emerald-500' },
  warning: { card: 'bg-amber-50 border-amber-200',     label: 'text-amber-700',   value: 'text-amber-900',   dot: 'bg-amber-500'   },
  danger:  { card: 'bg-red-50 border-red-200',         label: 'text-red-700',     value: 'text-red-900',     dot: 'bg-red-500'     },
  neutral: { card: 'bg-white border-slate-200',        label: 'text-slate-500',   value: 'text-slate-900',   dot: 'bg-indigo-500'  },
};

function formatValue(raw, format) {
  const actual = raw?.actual ?? raw ?? 0;
  if (format === 'currency') return formatCurrencyShort(actual);
  if (format === 'number')   return formatNumberShort(actual);
  if (format === 'percent')  return fmtPct(actual);
  return String(actual ?? '—');
}

function VentasKpiWidget({ type }) {
  const { kpis, loadingKpis, comparar } = useVentasData();
  const def = KPI_DEFS[type];
  if (!def) return null;

  if (loadingKpis) {
    return (
      <div className="h-full flex flex-col justify-center rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
        <div className="h-2.5 w-2/3 rounded bg-slate-200 mb-3" />
        <div className="h-7 w-1/2 rounded bg-slate-200" />
      </div>
    );
  }

  const raw = kpis?.[def.field];
  const actual = raw?.actual ?? raw ?? 0;
  const prev   = raw?.anterior;
  const formatted = formatValue(raw, def.format);
  const severity = def.getSeverity ? def.getSeverity(Number(actual)) : (def.severity ?? 'neutral');
  const cls = SEVERITY_CLASSES[severity] ?? SEVERITY_CLASSES.neutral;

  let trend = null;
  if (comparar && prev != null && Number(prev) !== 0) {
    const delta = ((Number(actual) - Number(prev)) / Math.abs(Number(prev))) * 100;
    const positive = def.invertTrend ? delta <= 0 : delta >= 0;
    trend = { delta, positive };
  }

  return (
    <div className={`h-full flex flex-col justify-center rounded-xl border p-4 ${cls.card}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`h-2 w-2 rounded-full shrink-0 ${cls.dot}`} />
        <p className={`text-xs font-medium uppercase tracking-wide truncate ${cls.label}`}>{def.label}</p>
      </div>
      <p className={`text-2xl font-bold leading-tight ${cls.value}`}>{formatted}</p>
      {trend && (
        <p className={`mt-1 text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend.positive ? '▲' : '▼'} {Math.abs(trend.delta).toFixed(1)}% vs período ant.
        </p>
      )}
    </div>
  );
}

export function createKpiWidget(type) {
  return function VentasKpiInstance(props) {
    return <VentasKpiWidget {...props} type={type} />;
  };
}

export const KPI_TYPES = Object.keys(KPI_DEFS);
