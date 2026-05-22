
import { useClientesData } from '../ClientesDataContext';
import { formatCurrencyShort, formatNumberShort } from '../../analyticsUtils';
import { useFilterStore } from '../../../../store/filterStore';

const KPI_DEFS = {
  'c-kpi-activos': {
    label: 'Clientes activos',
    getValue: (k) => k?.clientes_activos,
    format: 'number',
  },
  'c-kpi-facturado': {
    label: 'Facturado neto',
    getValue: (k) => k?.facturado_total,
    format: 'currency',
  },
  'c-kpi-ticket': {
    label: 'Ticket promedio',
    getValue: (k) => k?.ticket_promedio,
    format: 'currency',
  },
  'c-kpi-nuevos': {
    label: 'Clientes nuevos',
    getValue: (k) => k?.clientes_nuevos,
    format: 'number',
    severity: 'success',
  },
  'c-kpi-mejor': {
    label: 'Mejor cliente',
    getValue: (k) => k?.mejor_cliente,
    format: 'text',
    severity: 'success',
  },
  'c-kpi-saldo-cta-cte': {
    label: 'Saldo Cta Cte',
    getValue: (k) => k?.saldo_cta_cte,
    format: 'currency',
    getSeverity: (v) => v > 0 ? 'warning' : 'neutral',
  },
  'c-kpi-deuda-vencida': {
    label: 'Deuda vencida',
    getValue: (k) => k?.deuda_vencida,
    format: 'currency',
    getSeverity: (v) => v > 0 ? 'danger' : 'success',
  },
  'c-kpi-retencion': {
    label: 'Tasa retención',
    getValue: (k) => k?.tasa_retencion,
    format: 'percent',
    getSeverity: (v) => v >= 60 ? 'success' : v >= 40 ? 'warning' : 'danger',
  },
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
  if (format === 'percent')  return `${Number(actual).toFixed(1)}%`;
  if (format === 'text')     return actual ? String(actual) : '—';
  return String(actual ?? '—');
}

function ClientesKpiWidget({ type }) {
  const { kpis, loadingKpis } = useClientesData();
  const compareMode = useFilterStore(s => s.compare_mode);
  const def = KPI_DEFS[type];
  if (!def) return null;

  if (loadingKpis) {
    return (
      <div className="h-full flex flex-col justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 animate-pulse">
        <div className="h-2 w-2/3 rounded bg-slate-200 mb-3" />
        <div className="h-7 w-1/2 rounded bg-slate-200 mb-2" />
        <div className="h-2 w-1/3 rounded bg-slate-100" />
      </div>
    );
  }

  const raw = def.getValue(kpis);
  const actual = raw?.actual ?? raw ?? 0;
  const prev   = raw?.anterior;
  const formatted = formatValue(raw, def.format);
  const severity = def.getSeverity ? def.getSeverity(Number(actual)) : (def.severity ?? 'neutral');
  const cls = SEVERITY_CLASSES[severity] ?? SEVERITY_CLASSES.neutral;

  let trend = null;
  if (prev != null && Number(prev) !== 0) {
    const delta = ((Number(actual) - Number(prev)) / Math.abs(Number(prev))) * 100;
    trend = { delta, positive: delta >= 0 };
  }

  return (
    <div className={`h-full flex flex-col justify-center rounded-xl border px-4 py-3 ${cls.card}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`h-2 w-2 rounded-full shrink-0 ${cls.dot}`} />
        <p className={`text-[11px] font-semibold uppercase tracking-wide truncate ${cls.label}`}>{def.label}</p>
      </div>
      <p className={`text-2xl font-bold leading-tight tabular-nums ${cls.value}`}>{formatted}</p>
      {trend && (
        <p className={`mt-1 text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend.positive ? '▲' : '▼'} {Math.abs(trend.delta).toFixed(1)}% vs {compareMode === 'anio' ? 'año ant.' : 'período ant.'}
        </p>
      )}
    </div>
  );
}

export function createClientesKpiWidget(type) {
  return function KpiWidgetInstance(props) {
    return <ClientesKpiWidget {...props} type={type} />;
  };
}
