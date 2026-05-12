import { DollarSign, ShoppingCart, Package, Users, AlertTriangle, Clock, CreditCard, Calculator } from 'lucide-react';
import KPICard from '../../../../components/analytics/KPICard';
import { SkeletonKPI } from '../../../../components/analytics/SkeletonLoader';
import { useComprasData } from '../ComprasDataContext';

const KPI_DEFS = {
  'compras-kpi-total': {
    label: 'Total comprado', field: 'total_comprado',
    format: 'currency', severity: 'neutral', icon: DollarSign,
  },
  'compras-kpi-iva': {
    label: 'IVA crédito fiscal', field: 'iva_credito_fiscal',
    format: 'currency', severity: 'neutral', icon: Calculator,
  },
  'compras-kpi-ordenes': {
    label: 'Órdenes de compra', field: 'ordenes',
    format: 'number', severity: 'neutral', icon: ShoppingCart,
  },
  'compras-kpi-ticket': {
    label: 'Ticket prom. compra', field: 'ticket_promedio_compra',
    format: 'currency', severity: 'success', icon: CreditCard,
  },
  'compras-kpi-proveedores': {
    label: 'Proveedores activos', field: 'proveedores_activos',
    format: 'number', severity: 'warning', icon: Users,
  },
  'compras-kpi-deuda': {
    label: 'Deuda vencida', field: 'deuda_vencida',
    format: 'currency', icon: AlertTriangle,
    getSeverity: (v) => (v || 0) > 0 ? 'danger' : 'success',
  },
  'compras-kpi-vencimientos': {
    label: 'Vencimientos 30d', field: 'proximos_vencimientos_30d',
    format: 'currency', severity: 'warning', icon: Clock,
  },
  'compras-kpi-unidades': {
    label: 'Unidades compradas', field: 'unidades_compradas',
    format: 'number', severity: 'neutral', icon: Package,
  },
};

export function createComprasKpiWidget(type) {
  const def = KPI_DEFS[type];
  if (!def) return () => null;

  return function ComprasKpi() {
    const { kpis, loadingKpis, comparar } = useComprasData();
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

export const COMPRAS_KPI_TYPES = Object.keys(KPI_DEFS);
