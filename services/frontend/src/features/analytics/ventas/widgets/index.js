import {
  DollarSign, ShoppingCart, Package, Users, TrendingDown,
  Activity, BarChart3, PieChart, Trophy, FileText, List, Layers, Receipt, Tag,
  Zap, CalendarDays, TrendingUp, Crosshair, Scissors, GitFork, Clock, Target,
} from 'lucide-react';
import { createKpiWidget } from './VentasKpiWidget';
import EvolucionTemporalWidget from './EvolucionTemporalWidget';
import PulseStripWidget from './PulseStripWidget';
import SeasonalityHeatmap from './SeasonalityHeatmap';
import YearOverYearWidget from './YearOverYearWidget';
import RFMMatrixWidget from './RFMMatrixWidget';
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
import VentasPorListaWidget from './VentasPorListaWidget';
import EficienciaCobranzaWidget from '../../reportes/widgets/EficienciaCobranzaWidget';
import DescuentosWidget from './DescuentosWidget';
import ScatterPortafolioWidget from './ScatterPortafolioWidget';
import AgingCobranzaWidget from './AgingCobranzaWidget';
import TicketDistribucionWidget from './TicketDistribucionWidget';
import CohortRetencionWidget from './CohortRetencionWidget';
import GoalTrackerWidget from './GoalTrackerWidget';

const VENTAS_WIDGET_CATALOG = [
  // ── Pulse Strip (mega-KPI row) ──
  {
    type: 'ventas-pulse-strip',
    name: 'Pulse Strip KPIs',
    description: '6 KPIs principales con sparklines y narrativa automática',
    icon: Zap,
    component: PulseStripWidget,
    defaultSize: { w: 12, h: 4 },
    category: 'kpi',
  },
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
  // ── RFM ──
  {
    type: 'ventas-rfm',
    name: 'Matriz RFM',
    description: 'Segmentación Recencia-Frecuencia-Monetario como scatter plot',
    icon: Crosshair,
    component: RFMMatrixWidget,
    defaultSize: { w: 5, h: 5 },
    category: 'chart',
  },
  // ── New temporal analysis ──
  {
    type: 'ventas-heatmap',
    name: 'Heatmap Estacionalidad',
    description: 'Mapa de calor diario estilo GitHub por facturado',
    icon: CalendarDays,
    component: SeasonalityHeatmap,
    defaultSize: { w: 8, h: 4 },
    category: 'chart',
  },
  {
    type: 'ventas-yoy',
    name: 'Año a Año',
    description: 'Facturado mensual de los últimos 3 años superpuestos',
    icon: TrendingUp,
    component: YearOverYearWidget,
    defaultSize: { w: 12, h: 4 },
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
    type: 'ventas-por-lista',
    name: 'Análisis Ventas por Lista',
    description: 'Facturado, margen y vendedores por lista de precios usada',
    icon: Layers,
    component: VentasPorListaWidget,
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
  // ── Nuevos widgets ──
  {
    type: 'ventas-descuentos',
    name: 'Motor de Descuentos',
    description: 'Cuánto se descuenta, quién descuenta más y en qué productos',
    icon: Scissors,
    component: DescuentosWidget,
    defaultSize: { w: 6, h: 5 },
    category: 'chart',
  },
  {
    type: 'ventas-scatter',
    name: 'Portafolio Productos',
    description: 'Scatter: unidades vs. margen%, tamaño = revenue. Clic para detalle.',
    icon: Crosshair,
    component: ScatterPortafolioWidget,
    defaultSize: { w: 6, h: 5 },
    category: 'chart',
  },
  {
    type: 'ventas-aging',
    name: 'Aging Cobranza',
    description: 'Antigüedad de saldos pendientes por cobrar',
    icon: Clock,
    component: AgingCobranzaWidget,
    defaultSize: { w: 4, h: 5 },
    category: 'chart',
  },
  {
    type: 'ventas-ticket-dist',
    name: 'Distribución de Tickets',
    description: 'Histograma de tickets FA por rango de importe',
    icon: BarChart3,
    component: TicketDistribucionWidget,
    defaultSize: { w: 5, h: 5 },
    category: 'chart',
  },
  {
    type: 'ventas-cohort',
    name: 'Cohort de Retención',
    description: '% clientes que volvieron a comprar mes a mes por cohorte',
    icon: Users,
    component: CohortRetencionWidget,
    defaultSize: { w: 7, h: 5 },
    category: 'chart',
  },
  {
    type: 'ventas-goal',
    name: 'Goal Tracker',
    description: 'Gauge de progreso vs. meta configurable con proyección',
    icon: Target,
    component: GoalTrackerWidget,
    defaultSize: { w: 3, h: 5 },
    category: 'kpi',
  },
];

export default VENTAS_WIDGET_CATALOG;

export function getVentasWidgetDef(type) {
  return VENTAS_WIDGET_CATALOG.find((w) => w.type === type);
}

// Default widgets and layouts for the ventas panel
export const VENTAS_DEFAULT_WIDGETS = [
  { id: 'v-0',  type: 'ventas-pulse-strip'     },
  { id: 'v-30', type: 'ventas-goal'            },
  { id: 'v-9',  type: 'ventas-evolucion'        },
  { id: 'v-10', type: 'ventas-devoluciones'     },
  { id: 'v-23', type: 'ventas-heatmap'          },
  { id: 'v-24', type: 'ventas-yoy'              },
  { id: 'v-11', type: 'ventas-pareto'           },
  { id: 'v-27', type: 'ventas-scatter'          },
  { id: 'v-12', type: 'ventas-por-rubro'        },
  { id: 'v-25', type: 'ventas-por-subrubro'     },
  { id: 'v-28', type: 'ventas-descuentos'       },
  { id: 'v-13', type: 'ventas-vendedores'       },
  { id: 'v-14', type: 'ventas-abc-clientes'     },
  { id: 'v-26', type: 'ventas-rfm'              },
  { id: 'v-15', type: 'ventas-comprobantes'     },
  { id: 'v-29', type: 'ventas-aging'            },
  { id: 'v-31', type: 'ventas-ticket-dist'      },
  { id: 'v-32', type: 'ventas-cohort'           },
  { id: 'v-16', type: 'ventas-ranking-productos'},
  { id: 'v-17', type: 'ventas-ranking-clientes' },
  { id: 'v-18', type: 'ventas-transacciones'    },
  { id: 'v-19', type: 'ventas-facturas-im'      },
  { id: 'v-20', type: 'ventas-margen-lista'     },
  { id: 'v-21', type: 'ventas-por-lista'        },
  { id: 'v-22', type: 'ventas-cobranza'         },
];

export const VENTAS_DEFAULT_LAYOUTS = {
  lg: [
    // Row 0: Pulse strip + Goal Tracker
    { i: 'v-0',  x: 0,  y: 0,  w: 9,  h: 4,  minW: 6, minH: 3  },
    { i: 'v-30', x: 9,  y: 0,  w: 3,  h: 4,  minW: 2, minH: 3  },
    // Row 1: Evolución + Devoluciones
    { i: 'v-9',  x: 0,  y: 4,  w: 8,  h: 5,  minW: 4, minH: 3  },
    { i: 'v-10', x: 8,  y: 4,  w: 4,  h: 5,  minW: 3, minH: 3  },
    // Row 2: Heatmap + YoY
    { i: 'v-23', x: 0,  y: 9,  w: 5,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-24', x: 5,  y: 9,  w: 7,  h: 4,  minW: 4, minH: 3  },
    // Row 3: Pareto + Scatter Portafolio
    { i: 'v-11', x: 0,  y: 13, w: 6,  h: 5,  minW: 4, minH: 3  },
    { i: 'v-27', x: 6,  y: 13, w: 6,  h: 5,  minW: 4, minH: 3  },
    // Row 4: Rubro + Subrubro + Descuentos
    { i: 'v-12', x: 0,  y: 18, w: 4,  h: 5,  minW: 3, minH: 3  },
    { i: 'v-25', x: 4,  y: 18, w: 4,  h: 5,  minW: 3, minH: 3  },
    { i: 'v-28', x: 8,  y: 18, w: 4,  h: 5,  minW: 3, minH: 3  },
    // Row 5: Vendedores full width
    { i: 'v-13', x: 0,  y: 23, w: 12, h: 5,  minW: 6, minH: 4  },
    // Row 6: ABC + RFM + Comprobantes
    { i: 'v-14', x: 0,  y: 28, w: 4,  h: 5,  minW: 3, minH: 3  },
    { i: 'v-26', x: 4,  y: 28, w: 4,  h: 5,  minW: 3, minH: 3  },
    { i: 'v-15', x: 8,  y: 28, w: 4,  h: 5,  minW: 3, minH: 3  },
    // Row 7: Aging + Ticket Dist + Cohort
    { i: 'v-29', x: 0,  y: 33, w: 4,  h: 5,  minW: 3, minH: 4  },
    { i: 'v-31', x: 4,  y: 33, w: 4,  h: 5,  minW: 3, minH: 4  },
    { i: 'v-32', x: 8,  y: 33, w: 4,  h: 5,  minW: 3, minH: 4  },
    // Tables
    { i: 'v-16', x: 0,  y: 38, w: 6,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-17', x: 6,  y: 38, w: 6,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-18', x: 0,  y: 42, w: 12, h: 5,  minW: 6, minH: 3  },
    { i: 'v-19', x: 0,  y: 47, w: 12, h: 6,  minW: 6, minH: 4  },
    { i: 'v-20', x: 0,  y: 53, w: 12, h: 7,  minW: 6, minH: 4  },
    { i: 'v-21', x: 0,  y: 60, w: 12, h: 7,  minW: 6, minH: 4  },
    { i: 'v-22', x: 0,  y: 67, w: 12, h: 7,  minW: 6, minH: 4  },
  ],
  md: [
    { i: 'v-0',  x: 0,  y: 0,  w: 9,  h: 4,  minW: 6, minH: 3  },
    { i: 'v-30', x: 9,  y: 0,  w: 3,  h: 4,  minW: 2, minH: 3  },
    { i: 'v-9',  x: 0,  y: 4,  w: 7,  h: 5,  minW: 4, minH: 3  },
    { i: 'v-10', x: 7,  y: 4,  w: 5,  h: 5,  minW: 3, minH: 3  },
    { i: 'v-23', x: 0,  y: 9,  w: 5,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-24', x: 5,  y: 9,  w: 7,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-11', x: 0,  y: 13, w: 6,  h: 5,  minW: 4, minH: 3  },
    { i: 'v-27', x: 6,  y: 13, w: 6,  h: 5,  minW: 4, minH: 3  },
    { i: 'v-12', x: 0,  y: 18, w: 4,  h: 5,  minW: 3, minH: 3  },
    { i: 'v-25', x: 4,  y: 18, w: 4,  h: 5,  minW: 3, minH: 3  },
    { i: 'v-28', x: 8,  y: 18, w: 4,  h: 5,  minW: 3, minH: 3  },
    { i: 'v-13', x: 0,  y: 23, w: 12, h: 5,  minW: 6, minH: 4  },
    { i: 'v-14', x: 0,  y: 28, w: 4,  h: 5,  minW: 3, minH: 3  },
    { i: 'v-26', x: 4,  y: 28, w: 4,  h: 5,  minW: 3, minH: 3  },
    { i: 'v-15', x: 8,  y: 28, w: 4,  h: 5,  minW: 3, minH: 3  },
    { i: 'v-29', x: 0,  y: 33, w: 4,  h: 5,  minW: 3, minH: 4  },
    { i: 'v-31', x: 4,  y: 33, w: 4,  h: 5,  minW: 3, minH: 4  },
    { i: 'v-32', x: 8,  y: 33, w: 4,  h: 5,  minW: 3, minH: 4  },
    { i: 'v-16', x: 0,  y: 38, w: 6,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-17', x: 6,  y: 38, w: 6,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-18', x: 0,  y: 42, w: 12, h: 5,  minW: 6, minH: 3  },
    { i: 'v-19', x: 0,  y: 47, w: 12, h: 6,  minW: 6, minH: 4  },
    { i: 'v-20', x: 0,  y: 53, w: 12, h: 7,  minW: 6, minH: 4  },
    { i: 'v-21', x: 0,  y: 60, w: 12, h: 7,  minW: 6, minH: 4  },
    { i: 'v-22', x: 0,  y: 67, w: 12, h: 7,  minW: 6, minH: 4  },
  ],
  sm: [
    { i: 'v-0',  x: 0, y: 0,  w: 4, h: 5,  minW: 3, minH: 3  },
    { i: 'v-30', x: 4, y: 0,  w: 2, h: 5,  minW: 2, minH: 3  },
    { i: 'v-9',  x: 0, y: 5,  w: 6, h: 5,  minW: 3, minH: 3  },
    { i: 'v-10', x: 0, y: 10, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-23', x: 0, y: 14, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-24', x: 0, y: 18, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-11', x: 0, y: 22, w: 6, h: 5,  minW: 3, minH: 3  },
    { i: 'v-27', x: 0, y: 27, w: 6, h: 5,  minW: 3, minH: 3  },
    { i: 'v-12', x: 0, y: 32, w: 3, h: 4,  minW: 3, minH: 3  },
    { i: 'v-25', x: 3, y: 32, w: 3, h: 4,  minW: 3, minH: 3  },
    { i: 'v-28', x: 0, y: 36, w: 6, h: 5,  minW: 3, minH: 3  },
    { i: 'v-13', x: 0, y: 41, w: 6, h: 5,  minW: 3, minH: 4  },
    { i: 'v-14', x: 0, y: 46, w: 3, h: 4,  minW: 3, minH: 3  },
    { i: 'v-26', x: 3, y: 46, w: 3, h: 5,  minW: 3, minH: 3  },
    { i: 'v-15', x: 0, y: 51, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-29', x: 0, y: 55, w: 6, h: 5,  minW: 3, minH: 4  },
    { i: 'v-31', x: 0, y: 60, w: 6, h: 5,  minW: 3, minH: 4  },
    { i: 'v-32', x: 0, y: 65, w: 6, h: 5,  minW: 3, minH: 4  },
    { i: 'v-16', x: 0, y: 70, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-17', x: 0, y: 74, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-18', x: 0, y: 78, w: 6, h: 5,  minW: 3, minH: 3  },
    { i: 'v-19', x: 0, y: 83, w: 6, h: 6,  minW: 3, minH: 4  },
    { i: 'v-20', x: 0, y: 89, w: 6, h: 7,  minW: 3, minH: 4  },
    { i: 'v-21', x: 0, y: 96, w: 6, h: 7,  minW: 3, minH: 4  },
    { i: 'v-22', x: 0, y: 103,w: 6, h: 7,  minW: 3, minH: 4  },
  ],
};
