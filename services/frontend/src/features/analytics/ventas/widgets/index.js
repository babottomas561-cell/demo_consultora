import {
  DollarSign, ShoppingCart, Package, Users, TrendingDown,
  Activity, BarChart3, PieChart, Trophy, FileText, List, Layers, Receipt, Tag,
} from 'lucide-react';
import { createKpiWidget } from './VentasKpiWidget';
import EvolucionTemporalWidget from './EvolucionTemporalWidget';
import DevolucionesWidget from './DevolucionesWidget';
import ParetoProductosWidget from './ParetoProductosWidget';
import RankingProductosWidget from './RankingProductosWidget';
import FacturacionRubroWidget from './FacturacionRubroWidget';
import FacturacionSubrubroWidget from './FacturacionSubrubroWidget';
import RankingVendedoresWidget from './RankingVendedoresWidget';
import AbcClientesWidget from './AbcClientesWidget';
import RankingClientesWidget from './RankingClientesWidget';
import ComprobantesTipoWidget from './ComprobantesTipoWidget';
import TransaccionesWidget from './TransaccionesWidget';
import FacturasVentaWidget from '../../infomanager/widgets/FacturasVentaWidget';
import MargenPorListaWidget from '../../infomanager/widgets/MargenPorListaWidget';
import EficienciaCobranzaWidget from '../../reportes/widgets/EficienciaCobranzaWidget';

const VENTAS_WIDGET_CATALOG = [
  // ── KPIs ──
  {
    type: 'ventas-kpi-facturado',
    name: 'Facturado Neto',
    description: 'Total facturado menos devoluciones',
    icon: DollarSign,
    component: createKpiWidget('ventas-kpi-facturado'),
    defaultSize: { w: 3, h: 2 },
    category: 'kpi',
  },
  {
    type: 'ventas-kpi-tickets',
    name: 'Tickets FA',
    description: 'Cantidad de facturas emitidas',
    icon: ShoppingCart,
    component: createKpiWidget('ventas-kpi-tickets'),
    defaultSize: { w: 3, h: 2 },
    category: 'kpi',
  },
  {
    type: 'ventas-kpi-ticket-promedio',
    name: 'Ticket Promedio',
    description: 'Importe promedio por factura',
    icon: DollarSign,
    component: createKpiWidget('ventas-kpi-ticket-promedio'),
    defaultSize: { w: 3, h: 2 },
    category: 'kpi',
  },
  {
    type: 'ventas-kpi-unidades',
    name: 'Unidades',
    description: 'Total de unidades vendidas',
    icon: Package,
    component: createKpiWidget('ventas-kpi-unidades'),
    defaultSize: { w: 3, h: 2 },
    category: 'kpi',
  },
  {
    type: 'ventas-kpi-clientes',
    name: 'Clientes Únicos',
    description: 'Clientes distintos con compras',
    icon: Users,
    component: createKpiWidget('ventas-kpi-clientes'),
    defaultSize: { w: 3, h: 2 },
    category: 'kpi',
  },
  {
    type: 'ventas-kpi-devolucion',
    name: 'Tasa Devolución',
    description: 'Porcentaje de NC sobre facturado',
    icon: TrendingDown,
    component: createKpiWidget('ventas-kpi-devolucion'),
    defaultSize: { w: 3, h: 2 },
    category: 'kpi',
  },
  {
    type: 'ventas-kpi-iva',
    name: 'IVA Débito Fiscal',
    description: 'IVA generado por facturas',
    icon: DollarSign,
    component: createKpiWidget('ventas-kpi-iva'),
    defaultSize: { w: 3, h: 2 },
    category: 'kpi',
  },
  {
    type: 'ventas-kpi-margen',
    name: 'Margen Bruto Est.',
    description: 'Margen bruto estimado sobre ventas con costo',
    icon: Activity,
    component: createKpiWidget('ventas-kpi-margen'),
    defaultSize: { w: 3, h: 2 },
    category: 'kpi',
  },
  // ── Charts ──
  {
    type: 'ventas-evolucion',
    name: 'Evolución Temporal',
    description: 'Facturado neto y tickets por período',
    icon: BarChart3,
    component: EvolucionTemporalWidget,
    defaultSize: { w: 8, h: 5 },
    category: 'chart',
  },
  {
    type: 'ventas-devoluciones',
    name: 'Devoluciones',
    description: 'NC y devoluciones por período',
    icon: TrendingDown,
    component: DevolucionesWidget,
    defaultSize: { w: 4, h: 4 },
    category: 'chart',
  },
  {
    type: 'ventas-pareto',
    name: 'Pareto Productos',
    description: 'Top 20 productos con curva 80/20',
    icon: BarChart3,
    component: ParetoProductosWidget,
    defaultSize: { w: 6, h: 4 },
    category: 'chart',
  },
  {
    type: 'ventas-por-rubro',
    name: 'Facturación por Rubro',
    description: 'Distribución de ventas por rubro',
    icon: Layers,
    component: FacturacionRubroWidget,
    defaultSize: { w: 4, h: 4 },
    category: 'chart',
  },
  {
    type: 'ventas-por-subrubro',
    name: 'Facturación por Subrubro',
    description: 'Desglose de ventas por subrubro de producto',
    icon: Layers,
    component: FacturacionSubrubroWidget,
    defaultSize: { w: 4, h: 4 },
    category: 'chart',
  },
  {
    type: 'ventas-vendedores',
    name: 'Ranking Vendedores',
    description: 'Gráfico y cards de vendedores',
    icon: Trophy,
    component: RankingVendedoresWidget,
    defaultSize: { w: 12, h: 5 },
    category: 'chart',
  },
  {
    type: 'ventas-abc-clientes',
    name: 'Segmentación ABC',
    description: 'Clasificación ABC de clientes',
    icon: PieChart,
    component: AbcClientesWidget,
    defaultSize: { w: 5, h: 4 },
    category: 'chart',
  },
  {
    type: 'ventas-comprobantes',
    name: 'Comprobantes',
    description: 'Distribución por tipo y condición de venta',
    icon: FileText,
    component: ComprobantesTipoWidget,
    defaultSize: { w: 7, h: 4 },
    category: 'chart',
  },
  // ── Tables ──
  {
    type: 'ventas-ranking-productos',
    name: 'Ranking Productos',
    description: 'Tabla detallada de productos',
    icon: List,
    component: RankingProductosWidget,
    defaultSize: { w: 6, h: 4 },
    category: 'table',
  },
  {
    type: 'ventas-ranking-clientes',
    name: 'Ranking Clientes',
    description: 'Tabla de clientes con segmentación',
    icon: Users,
    component: RankingClientesWidget,
    defaultSize: { w: 7, h: 4 },
    category: 'table',
  },
  {
    type: 'ventas-transacciones',
    name: 'Detalle Transacciones',
    description: 'Listado paginado de comprobantes',
    icon: FileText,
    component: TransaccionesWidget,
    defaultSize: { w: 12, h: 5 },
    category: 'table',
  },
  {
    type: 'ventas-facturas-im',
    name: 'Facturas de Venta (IM)',
    description: 'Listado de facturas desde InfoManager sincronizadas',
    icon: Receipt,
    component: FacturasVentaWidget,
    defaultSize: { w: 12, h: 6 },
    category: 'table',
  },
  {
    type: 'ventas-margen-lista',
    name: 'Margen por Lista de Precios',
    description: 'Rentabilidad por lista y artículo',
    icon: Tag,
    component: MargenPorListaWidget,
    defaultSize: { w: 12, h: 7 },
    category: 'table',
  },
  {
    type: 'ventas-cobranza',
    name: 'Eficiencia de Cobranza',
    description: 'Facturas del período: % cobrado vs. pendiente',
    icon: Receipt,
    component: EficienciaCobranzaWidget,
    defaultSize: { w: 12, h: 7 },
    category: 'table',
  },
];

export default VENTAS_WIDGET_CATALOG;

export function getVentasWidgetDef(type) {
  return VENTAS_WIDGET_CATALOG.find((w) => w.type === type);
}

// Default widgets and layouts for the ventas panel
export const VENTAS_DEFAULT_WIDGETS = [
  { id: 'v-1', type: 'ventas-kpi-facturado' },
  { id: 'v-2', type: 'ventas-kpi-tickets' },
  { id: 'v-3', type: 'ventas-kpi-ticket-promedio' },
  { id: 'v-4', type: 'ventas-kpi-unidades' },
  { id: 'v-5', type: 'ventas-kpi-clientes' },
  { id: 'v-6', type: 'ventas-kpi-devolucion' },
  { id: 'v-7', type: 'ventas-kpi-iva' },
  { id: 'v-8', type: 'ventas-kpi-margen' },
  { id: 'v-9', type: 'ventas-evolucion' },
  { id: 'v-10', type: 'ventas-devoluciones' },
  { id: 'v-11', type: 'ventas-pareto' },
  { id: 'v-12', type: 'ventas-por-rubro' },
  { id: 'v-13', type: 'ventas-vendedores' },
  { id: 'v-14', type: 'ventas-abc-clientes' },
  { id: 'v-15', type: 'ventas-comprobantes' },
  { id: 'v-16', type: 'ventas-ranking-productos' },
  { id: 'v-17', type: 'ventas-ranking-clientes' },
  { id: 'v-18', type: 'ventas-transacciones' },
  { id: 'v-19', type: 'ventas-facturas-im' },
  { id: 'v-20', type: 'ventas-margen-lista' },
  { id: 'v-21', type: 'ventas-cobranza'     },
];

export const VENTAS_DEFAULT_LAYOUTS = {
  lg: [
    // KPI row 1
    { i: 'v-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-3', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-4', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    // KPI row 2
    { i: 'v-5', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-6', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-7', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-8', x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    // Evolución + Devoluciones
    { i: 'v-9', x: 0, y: 4, w: 8, h: 5, minW: 4, minH: 3 },
    { i: 'v-10', x: 8, y: 4, w: 4, h: 5, minW: 3, minH: 3 },
    // Pareto + Rubro
    { i: 'v-11', x: 0, y: 9, w: 7, h: 4, minW: 4, minH: 3 },
    { i: 'v-12', x: 7, y: 9, w: 5, h: 4, minW: 3, minH: 3 },
    // Vendedores full width
    { i: 'v-13', x: 0, y: 13, w: 12, h: 5, minW: 6, minH: 4 },
    // ABC + Comprobantes
    { i: 'v-14', x: 0, y: 18, w: 5, h: 4, minW: 3, minH: 3 },
    { i: 'v-15', x: 5, y: 18, w: 7, h: 4, minW: 4, minH: 3 },
    // Tables
    { i: 'v-16', x: 0, y: 22, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'v-17', x: 6, y: 22, w: 6, h: 4, minW: 4, minH: 3 },
    // Transacciones full width
    { i: 'v-18', x: 0, y: 26, w: 12, h: 5, minW: 6, minH: 3 },
    { i: 'v-19', x: 0, y: 31, w: 12, h: 6, minW: 6, minH: 4 },
    { i: 'v-20', x: 0, y: 37, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'v-21', x: 0, y: 44, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  md: [
    { i: 'v-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-3', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-4', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-5', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-6', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-7', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-8', x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-9', x: 0, y: 4, w: 7, h: 5, minW: 4, minH: 3 },
    { i: 'v-10', x: 7, y: 4, w: 5, h: 5, minW: 3, minH: 3 },
    { i: 'v-11', x: 0, y: 9, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'v-12', x: 6, y: 9, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'v-13', x: 0, y: 13, w: 12, h: 5, minW: 6, minH: 4 },
    { i: 'v-14', x: 0, y: 18, w: 5, h: 4, minW: 3, minH: 3 },
    { i: 'v-15', x: 5, y: 18, w: 7, h: 4, minW: 4, minH: 3 },
    { i: 'v-16', x: 0, y: 22, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'v-17', x: 6, y: 22, w: 6, h: 4, minW: 4, minH: 3 },
    { i: 'v-18', x: 0, y: 26, w: 12, h: 5, minW: 6, minH: 3 },
    { i: 'v-19', x: 0, y: 31, w: 12, h: 6, minW: 6, minH: 4 },
    { i: 'v-20', x: 0, y: 37, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'v-21', x: 0, y: 44, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  sm: [
    { i: 'v-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-3', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-4', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-5', x: 0, y: 4, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-6', x: 3, y: 4, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-7', x: 0, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-8', x: 3, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-9', x: 0, y: 8, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'v-10', x: 0, y: 13, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'v-11', x: 0, y: 17, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'v-12', x: 0, y: 21, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'v-13', x: 0, y: 25, w: 6, h: 5, minW: 3, minH: 4 },
    { i: 'v-14', x: 0, y: 30, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'v-15', x: 0, y: 34, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'v-16', x: 0, y: 38, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'v-17', x: 0, y: 42, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'v-18', x: 0, y: 46, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'v-19', x: 0, y: 51, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 'v-20', x: 0, y: 57, w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'v-21', x: 0, y: 64, w: 6, h: 7, minW: 3, minH: 4 },
  ],
};
