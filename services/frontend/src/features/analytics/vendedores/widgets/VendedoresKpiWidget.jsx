import { Loader2 } from 'lucide-react';
import { useVendedoresData } from '../VendedoresDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const KPI_DEFS = {
  'v-kpi-total-vendedores': {
    label: 'Vendedores activos',
    getValue: (k) => k?.total_vendedores,
    format: 'number',
  },
  'v-kpi-facturado': {
    label: 'Facturado neto',
    getValue: (k) => k?.facturado_total,
    format: 'currency',
  },
  'v-kpi-ticket': {
    label: 'Ticket prom. global',
    getValue: (k) => k?.ticket_promedio_global,
    format: 'currency',
  },
  'v-kpi-margen': {
    label: 'Margen total',
    getValue: (k) => k?.margen_total,
    format: 'currency',
  },
  'v-kpi-mejor-vendedor': {
    label: 'Mejor vendedor',
    getValue: (k) => k?.mejor_vendedor,
    format: 'text',
  },
  'v-kpi-presupuestos': {
    label: 'Presupuestos emitidos',
    getValue: (k) => k?.presupuestos_emitidos,
    format: 'number',
  },
  'v-kpi-conversion': {
    label: 'Tasa conversión',
    getValue: (k) => k?.tasa_conversion_global,
    format: 'percent',
    getSeverity: (v) => v < 30 ? 'danger' : v < 50 ? 'warning' : 'success',
  },
  'v-kpi-descuento': {
    label: 'Descuento prom.',
    getValue: (k) => k?.descuento_prom,
    format: 'percent',
    getSeverity: (v) => v > 15 ? 'warning' : 'neutral',
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
  if (format === 'currency') return formatCurrency(actual);
  if (format === 'number')   return formatNumber(actual);
  if (format === 'percent')  return `${Number(actual).toFixed(1)}%`;
  if (format === 'text')     return actual ? String(actual) : '—';
  return String(actual ?? '—');
}

function VendedoresKpiWidget({ type }) {
  const { kpis, loadingKpis } = useVendedoresData();
  const def = KPI_DEFS[type];

  if (!def) return null;

  if (loadingKpis) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  const raw = def.getValue(kpis);
  const actual = raw?.actual ?? raw ?? 0;
  const prev   = raw?.anterior;
  const formatted = formatValue(raw, def.format);
  const severity = def.getSeverity ? def.getSeverity(Number(actual)) : 'neutral';
  const cls = SEVERITY_CLASSES[severity] ?? SEVERITY_CLASSES.neutral;

  let trend = null;
  if (prev != null && Number(prev) !== 0) {
    const delta = ((Number(actual) - Number(prev)) / Math.abs(Number(prev))) * 100;
    trend = { delta, positive: delta >= 0 };
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

export function createVendedoresKpiWidget(type) {
  return function KpiWidgetInstance(props) {
    return <VendedoresKpiWidget {...props} type={type} />;
  };
}
