import { Package, TrendingUp, TrendingDown, AlertTriangle, Archive } from 'lucide-react';
import KPICard from '../../../../components/analytics/KPICard';
import { SkeletonKPI } from '../../../../components/analytics/SkeletonLoader';
import { useStockData } from '../StockDataContext';
import { formatCurrency } from '../../analyticsUtils';

const KPI_DEFS = {
  'stock-kpi-total': {
    label: 'Total artículos', field: 'total_articulos',
    format: 'number', severity: 'neutral', icon: Package,
  },
  'stock-kpi-con-stock': {
    label: 'Con stock', field: 'con_stock',
    format: 'number', icon: TrendingUp,
    getSeverity: (v) => (v || 0) > 0 ? 'success' : 'warning',
  },
  'stock-kpi-sin-stock': {
    label: 'Sin stock', field: 'sin_stock',
    format: 'number', icon: TrendingDown,
    getSeverity: (v) => (v || 0) > 0 ? 'danger' : 'success',
  },
  'stock-kpi-bajo': {
    label: 'Stock bajo', field: 'stock_bajo',
    format: 'number', icon: AlertTriangle,
    getSeverity: (v) => (v || 0) > 0 ? 'warning' : 'success',
  },
  'stock-kpi-valor-costo': {
    label: 'Valor inventario (costo)', field: 'valor_inventario_costo',
    format: 'currency', severity: 'neutral', icon: Archive,
  },
  'stock-kpi-valor-venta': {
    label: 'Valor inventario (venta)', field: 'valor_inventario_precio_venta',
    format: 'currency', severity: 'neutral', icon: Archive,
  },
  'stock-kpi-dias': {
    label: 'Días inventario prom.', field: 'dias_inventario_promedio',
    format: 'number', severity: 'neutral', icon: Package,
    suffix: 'd',
  },
  'stock-kpi-sin-movimiento': {
    label: 'Sin movimiento 90d', field: 'articulos_sin_movimiento',
    format: 'number', icon: AlertTriangle,
    getSeverity: (v) => (v || 0) > 0 ? 'warning' : 'success',
  },
};

export function createStockKpiWidget(type) {
  const def = KPI_DEFS[type];
  if (!def) return () => null;

  return function StockKpi() {
    const { kpis, loadingKpis } = useStockData();
    if (loadingKpis) return <div className="p-4"><SkeletonKPI /></div>;

    const raw = kpis?.[def.field];
    const actual = raw?.actual ?? raw ?? 0;
    const severity = def.getSeverity ? def.getSeverity(actual) : def.severity;
    const displayValue = def.suffix ? `${actual}${def.suffix}` : actual;

    return (
      <div className="p-4 h-full flex items-center">
        <KPICard
          label={def.label}
          value={displayValue}
          severity={severity}
          format={def.suffix ? 'custom' : def.format}
          icon={def.icon}
          className="w-full"
        />
      </div>
    );
  };
}

export const STOCK_KPI_TYPES = Object.keys(KPI_DEFS);
