import { DollarSign, Users, ShoppingCart, TrendingUp, BarChart3, Trophy, PieChart, Package, Activity, AlertTriangle } from 'lucide-react';
import KpiCard from './KpiCard';
import VentasMensualesChart from './VentasMensualesChart';
import TopClientesWidget from './TopClientesWidget';
import VentasPorVendedorChart from './VentasPorVendedorChart';
import TopProductosChart from './TopProductosChart';
import TendenciaVentasChart from './TendenciaVentasChart';
import StockAlertasWidget from './StockAlertasWidget';

const WIDGET_CATALOG = [
  {
    type: 'ventas-mes',
    name: 'Ventas del Mes',
    description: 'Total facturado en el mes actual',
    icon: DollarSign,
    component: () => <KpiCard type="ventas-mes" />,
    defaultSize: { w: 3, h: 2 },
    category: 'kpi',
  },
  {
    type: 'clientes-activos',
    name: 'Clientes Activos',
    description: 'Cantidad de clientes con compras',
    icon: Users,
    component: () => <KpiCard type="clientes-activos" />,
    defaultSize: { w: 3, h: 2 },
    category: 'kpi',
  },
  {
    type: 'transacciones',
    name: 'Transacciones',
    description: 'Total de comprobantes registrados',
    icon: ShoppingCart,
    component: () => <KpiCard type="transacciones" />,
    defaultSize: { w: 3, h: 2 },
    category: 'kpi',
  },
  {
    type: 'variacion-mensual',
    name: 'Variación Mensual',
    description: 'Cambio porcentual vs. mes anterior',
    icon: TrendingUp,
    component: () => <KpiCard type="variacion-mensual" />,
    defaultSize: { w: 3, h: 2 },
    category: 'kpi',
  },
  {
    type: 'ventas-mensuales',
    name: 'Ventas Mensuales',
    description: 'Gráfico de barras de los últimos 6 meses',
    icon: BarChart3,
    component: VentasMensualesChart,
    defaultSize: { w: 8, h: 4 },
    category: 'chart',
  },
  {
    type: 'top-clientes',
    name: 'Top Clientes',
    description: 'Ranking de clientes del mes por facturación',
    icon: Trophy,
    component: TopClientesWidget,
    defaultSize: { w: 4, h: 4 },
    category: 'table',
  },
  {
    type: 'ventas-por-vendedor',
    name: 'Ventas por Vendedor',
    description: 'Distribución de ventas por vendedor',
    icon: PieChart,
    component: VentasPorVendedorChart,
    defaultSize: { w: 4, h: 4 },
    category: 'chart',
  },
  {
    type: 'top-productos',
    name: 'Top Productos',
    description: 'Productos más vendidos del período',
    icon: Package,
    component: TopProductosChart,
    defaultSize: { w: 4, h: 4 },
    category: 'chart',
  },
  {
    type: 'tendencia-ventas',
    name: 'Tendencia de Ventas',
    description: 'Evolución temporal de ventas',
    icon: Activity,
    component: TendenciaVentasChart,
    defaultSize: { w: 4, h: 4 },
    category: 'chart',
  },
  {
    type: 'stock-alertas',
    name: 'Alertas de Stock',
    description: 'Productos con stock bajo o agotado',
    icon: AlertTriangle,
    component: StockAlertasWidget,
    defaultSize: { w: 12, h: 4 },
    category: 'table',
  },
];

export default WIDGET_CATALOG;

export function getWidgetDef(type) {
  return WIDGET_CATALOG.find(w => w.type === type);
}
