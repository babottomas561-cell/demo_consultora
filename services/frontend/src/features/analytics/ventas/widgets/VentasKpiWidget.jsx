import { DollarSign, ShoppingCart, Package, Users, TrendingDown } from 'lucide-react';
import KPICard from '../../../../components/analytics/KPICard';
import { SkeletonKPI } from '../../../../components/analytics/SkeletonLoader';
import { useVentasData } from '../VentasDataContext';

const KPI_DEFS = {
  'ventas-kpi-facturado': {
    label: 'Facturado neto', field: 'facturado_neto',
    format: 'currency', severity: 'neutral', icon: DollarSign,
  },
  'ventas-kpi-tickets': {
    label: 'Tickets FA', field: 'tickets',
    format: 'number', severity: 'neutral', icon: ShoppingCart,
  },
  'ventas-kpi-ticket-promedio': {
    label: 'Ticket promedio', field: 'ticket_promedio',
    format: 'currency', severity: 'success',
  },
  'ventas-kpi-unidades': {
    label: 'Unidades', field: 'unidades',
    format: 'number', severity: 'neutral', icon: Package,
  },
  'ventas-kpi-clientes': {
    label: 'Clientes únicos', field: 'clientes_unicos',
    format: 'number', severity: 'neutral', icon: Users,
  },
  'ventas-kpi-devolucion': {
    label: 'Tasa devolución', field: 'tasa_devolucion',
    format: 'percent', icon: TrendingDown,
    getSeverity: (v) => v > 10 ? 'danger' : v > 5 ? 'warning' : 'neutral',
  },
  'ventas-kpi-iva': {
    label: 'IVA débito fiscal', field: 'iva_debito',
    format: 'currency', severity: 'neutral',
  },
  'ventas-kpi-margen': {
    label: 'Margen bruto est.', field: 'margen_bruto_pct',
    format: 'percent',
    getSeverity: (v) => v > 30 ? 'success' : 'neutral',
  },
};

export function createKpiWidget(type) {
  const def = KPI_DEFS[type];
  if (!def) return () => null;

  return function VentasKpi() {
    const { kpis, loadingKpis, comparar } = useVentasData();
    if (loadingKpis) return <div className="p-4"><SkeletonKPI /></div>;

    const kpi = kpis?.[def.field];
    const severity = def.getSeverity ? def.getSeverity(kpi?.actual) : def.severity;

    return (
      <div className="p-4 h-full flex items-center">
        <KPICard
          label={def.label}
          value={kpi?.actual}
          severity={severity}
          format={def.format}
          icon={def.icon}
          compareValue={comparar ? kpi?.anterior : undefined}
          variation={comparar ? kpi?.variacion_pct : undefined}
          compareLabel="vs ant."
          className="w-full"
        />
      </div>
    );
  };
}

export const KPI_TYPES = Object.keys(KPI_DEFS);
