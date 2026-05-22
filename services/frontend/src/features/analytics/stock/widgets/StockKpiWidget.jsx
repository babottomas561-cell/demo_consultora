
import { useStockData } from '../StockDataContext';
import { formatCurrencyShort, formatNumberShort } from '../../analyticsUtils';

const KPI_DEFS = {
  'stock-kpi-total':          { label: 'Total artículos',           field: 'total_articulos',                   format: 'number',   severity: 'neutral' },
  'stock-kpi-con-stock':      { label: 'Con stock',                 field: 'con_stock',                         format: 'number',   getSeverity: (v) => v > 0 ? 'success' : 'warning' },
  'stock-kpi-sin-stock':      { label: 'Sin stock',                 field: 'sin_stock',                         format: 'number',   getSeverity: (v) => v > 0 ? 'danger' : 'success' },
  'stock-kpi-bajo':           { label: 'Stock bajo',                field: 'stock_bajo',                        format: 'number',   getSeverity: (v) => v > 0 ? 'warning' : 'success' },
  'stock-kpi-valor-costo':    { label: 'Valor inventario (costo)',  field: 'valor_inventario_costo',            format: 'currency', severity: 'neutral' },
  'stock-kpi-valor-venta':    { label: 'Valor inventario (venta)',  field: 'valor_inventario_precio_venta',     format: 'currency', severity: 'neutral' },
  'stock-kpi-dias':           { label: 'Días inventario prom.',     field: 'dias_inventario_promedio',          format: 'days',     severity: 'neutral' },
  'stock-kpi-sin-movimiento': { label: 'Sin movimiento 90d',       field: 'articulos_sin_movimiento',          format: 'number',   getSeverity: (v) => v > 0 ? 'warning' : 'success' },
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
  if (format === 'days')     return `${Number(actual).toFixed(0)}d`;
  return String(actual ?? '—');
}

function StockKpiWidget({ type }) {
  const { kpis, loadingKpis } = useStockData();
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

  const raw = kpis?.[def.field];
  const actual = raw?.actual ?? raw ?? 0;
  const formatted = formatValue(raw, def.format);
  const severity = def.getSeverity ? def.getSeverity(Number(actual)) : (def.severity ?? 'neutral');
  const cls = SEVERITY_CLASSES[severity] ?? SEVERITY_CLASSES.neutral;

  return (
    <div className={`h-full flex flex-col justify-center rounded-xl border px-4 py-3 ${cls.card}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`h-2 w-2 rounded-full shrink-0 ${cls.dot}`} />
        <p className={`text-[11px] font-semibold uppercase tracking-wide truncate ${cls.label}`}>{def.label}</p>
      </div>
      <p className={`text-2xl font-bold leading-tight tabular-nums ${cls.value}`}>{formatted}</p>
    </div>
  );
}

export function createStockKpiWidget(type) {
  return function StockKpiInstance(props) {
    return <StockKpiWidget {...props} type={type} />;
  };
}

export const STOCK_KPI_TYPES = Object.keys(KPI_DEFS);
