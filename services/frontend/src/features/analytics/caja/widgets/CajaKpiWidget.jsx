import { Loader2 } from 'lucide-react';
import { useCajaData } from '../CajaDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const KPI_DEFS = {
  'caja-kpi-ingresos':      { label: 'Ingresos totales',   getValue: (k) => k?.ingresos,        format: 'currency', severity: 'success' },
  'caja-kpi-egresos':       { label: 'Egresos totales',    getValue: (k) => k?.egresos,         format: 'currency', invertTrend: true },
  'caja-kpi-flujo-neto':    { label: 'Flujo neto',         getValue: (k) => k?.flujo_neto,      format: 'currency', getSeverity: (v) => v >= 0 ? 'success' : 'danger' },
  'caja-kpi-movimientos':   { label: 'Movimientos',        getValue: (k) => k?.movimientos,     format: 'number' },
  'caja-kpi-saldo-actual':  { label: 'Saldo actual',       getValue: (k) => k?.saldo_actual,    format: 'currency', getSeverity: (v) => v >= 0 ? 'success' : 'danger' },
  'caja-kpi-mayor-ingreso': { label: 'Mayor ingreso',      getValue: (k) => k?.mayor_ingreso,   format: 'currency', severity: 'success' },
  'caja-kpi-mayor-egreso':  { label: 'Mayor egreso',       getValue: (k) => k?.mayor_egreso,    format: 'currency', invertTrend: true },
  'caja-kpi-ratio':         { label: 'Ratio cobro/pago',   getValue: (k) => k?.ratio_cobro_pago, format: 'number', getSeverity: (v) => v >= 1 ? 'success' : 'warning' },
};

const SEVERITY_CLASSES = {
  success: { card: 'bg-emerald-50 border-emerald-200', label: 'text-emerald-700', value: 'text-emerald-900', dot: 'bg-emerald-500' },
  warning: { card: 'bg-amber-50 border-amber-200',     label: 'text-amber-700',   value: 'text-amber-900',   dot: 'bg-amber-500'   },
  danger:  { card: 'bg-red-50 border-red-200',         label: 'text-red-700',     value: 'text-red-900',     dot: 'bg-red-500'     },
  neutral: { card: 'bg-white border-slate-200',        label: 'text-slate-500',   value: 'text-slate-900',   dot: 'bg-indigo-500'  },
};

function formatValue(raw, format) {
  const v = raw?.actual ?? raw;
  if (v == null || (typeof v === 'number' && isNaN(v))) return '—';
  if (format === 'currency') return formatCurrency(v);
  if (format === 'number')   return formatNumber(v);
  return String(v);
}

function CajaKpiWidget({ type }) {
  const { kpis, loadingKpis } = useCajaData();
  const def = KPI_DEFS[type];
  if (!def) return null;

  if (loadingKpis) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={24} /></div>;
  }

  const raw = def.getValue(kpis);
  const actual = raw?.actual ?? (typeof raw === 'object' ? 0 : raw) ?? 0;
  const prev   = raw?.anterior;
  const formatted = formatValue(raw, def.format);
  const severity = def.getSeverity ? def.getSeverity(Number(actual)) : (def.severity ?? 'neutral');
  const cls = SEVERITY_CLASSES[severity] ?? SEVERITY_CLASSES.neutral;

  let trend = null;
  if (prev != null && Number(prev) !== 0) {
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

export function createCajaKpiWidget(type) {
  return function KpiWidgetInstance(props) {
    return <CajaKpiWidget {...props} type={type} />;
  };
}
