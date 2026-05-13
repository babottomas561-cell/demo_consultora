import { Loader2 } from 'lucide-react';
import { useComprasData } from '../ComprasDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const KPI_DEFS = {
  'compras-kpi-total':          { label: 'Total comprado',       field: 'total_comprado',             format: 'currency', severity: 'neutral' },
  'compras-kpi-iva':            { label: 'IVA crédito fiscal',   field: 'iva_credito_fiscal',         format: 'currency', severity: 'neutral' },
  'compras-kpi-ordenes':        { label: 'Órdenes de compra',    field: 'ordenes',                    format: 'number',   severity: 'neutral' },
  'compras-kpi-ticket':         { label: 'Ticket prom. compra',  field: 'ticket_promedio_compra',     format: 'currency', severity: 'success' },
  'compras-kpi-proveedores':    { label: 'Proveedores activos',  field: 'proveedores_activos',        format: 'number',   severity: 'neutral' },
  'compras-kpi-deuda':          { label: 'Deuda vencida',        field: 'deuda_vencida',              format: 'currency', getSeverity: (v) => (v || 0) > 0 ? 'danger' : 'success' },
  'compras-kpi-vencimientos':   { label: 'Vencimientos 30d',     field: 'proximos_vencimientos_30d',  format: 'currency', getSeverity: (v) => (v || 0) > 0 ? 'warning' : 'success' },
  'compras-kpi-unidades':       { label: 'Unidades compradas',   field: 'unidades_compradas',         format: 'number',   severity: 'neutral' },
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
  return String(actual ?? '—');
}

function ComprasKpiWidget({ type }) {
  const { kpis, loadingKpis, comparar } = useComprasData();
  const def = KPI_DEFS[type];
  if (!def) return null;

  if (loadingKpis) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={24} /></div>;
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
    const positive = delta >= 0;
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

export function createComprasKpiWidget(type) {
  return function ComprasKpiInstance(props) {
    return <ComprasKpiWidget {...props} type={type} />;
  };
}

export const COMPRAS_KPI_TYPES = Object.keys(KPI_DEFS);
