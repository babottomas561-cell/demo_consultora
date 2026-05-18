import {
  DollarSign, ShoppingCart, Package, Users, TrendingDown,
  Activity, BarChart3, PieChart, Trophy, FileText, List, Layers, Receipt, Tag,
  Zap, CalendarDays, TrendingUp,
} from 'lucide-react';
import { createKpiWidget } from './VentasKpiWidget';
import EvolucionTemporalWidget from './EvolucionTemporalWidget';
import PulseStripWidget from './PulseStripWidget';
import SeasonalityHeatmap from './SeasonalityHeatmap';
import YearOverYearWidget from './YearOverYearWidget';
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
];

export default VENTAS_WIDGET_CATALOG;

export function getVentasWidgetDef(type) {
  return VENTAS_WIDGET_CATALOG.find((w) => w.type === type);
}

// Default widgets and layouts for the ventas panel
export const VENTAS_DEFAULT_WIDGETS = [
  { id: 'v-0',  type: 'ventas-pulse-strip'     },
  { id: 'v-9',  type: 'ventas-evolucion'        },
  { id: 'v-10', type: 'ventas-devoluciones'     },
  { id: 'v-23', type: 'ventas-heatmap'          },
  { id: 'v-24', type: 'ventas-yoy'              },
  { id: 'v-11', type: 'ventas-pareto'           },
  { id: 'v-12', type: 'ventas-por-rubro'        },
  { id: 'v-25', type: 'ventas-por-subrubro'     },
  { id: 'v-13', type: 'ventas-vendedores'       },
  { id: 'v-14', type: 'ventas-abc-clientes'     },
  { id: 'v-15', type: 'ventas-comprobantes'     },
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
    // Pulse strip full width
    { i: 'v-0',  x: 0,  y: 0,  w: 12, h: 4,  minW: 8, minH: 3  },
    // Evolución + Devoluciones
    { i: 'v-9',  x: 0,  y: 4,  w: 8,  h: 5,  minW: 4, minH: 3  },
    { i: 'v-10', x: 8,  y: 4,  w: 4,  h: 5,  minW: 3, minH: 3  },
    // Heatmap + YoY
    { i: 'v-23', x: 0,  y: 9,  w: 5,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-24', x: 5,  y: 9,  w: 7,  h: 4,  minW: 4, minH: 3  },
    // Pareto + Rubro + Subrubro
    { i: 'v-11', x: 0,  y: 13, w: 5,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-12', x: 5,  y: 13, w: 4,  h: 4,  minW: 3, minH: 3  },
    { i: 'v-25', x: 9,  y: 13, w: 3,  h: 4,  minW: 3, minH: 3  },
    // Vendedores full width
    { i: 'v-13', x: 0,  y: 17, w: 12, h: 5,  minW: 6, minH: 4  },
    // ABC + Comprobantes
    { i: 'v-14', x: 0,  y: 22, w: 5,  h: 4,  minW: 3, minH: 3  },
    { i: 'v-15', x: 5,  y: 22, w: 7,  h: 4,  minW: 4, minH: 3  },
    // Tables
    { i: 'v-16', x: 0,  y: 26, w: 6,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-17', x: 6,  y: 26, w: 6,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-18', x: 0,  y: 30, w: 12, h: 5,  minW: 6, minH: 3  },
    { i: 'v-19', x: 0,  y: 35, w: 12, h: 6,  minW: 6, minH: 4  },
    { i: 'v-20', x: 0,  y: 41, w: 12, h: 7,  minW: 6, minH: 4  },
    { i: 'v-21', x: 0,  y: 48, w: 12, h: 7,  minW: 6, minH: 4  },
    { i: 'v-22', x: 0,  y: 55, w: 12, h: 7,  minW: 6, minH: 4  },
  ],
  md: [
    { i: 'v-0',  x: 0,  y: 0,  w: 12, h: 4,  minW: 8, minH: 3  },
    { i: 'v-9',  x: 0,  y: 4,  w: 7,  h: 5,  minW: 4, minH: 3  },
    { i: 'v-10', x: 7,  y: 4,  w: 5,  h: 5,  minW: 3, minH: 3  },
    { i: 'v-23', x: 0,  y: 9,  w: 5,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-24', x: 5,  y: 9,  w: 7,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-11', x: 0,  y: 13, w: 5,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-12', x: 5,  y: 13, w: 4,  h: 4,  minW: 3, minH: 3  },
    { i: 'v-25', x: 9,  y: 13, w: 3,  h: 4,  minW: 3, minH: 3  },
    { i: 'v-13', x: 0,  y: 17, w: 12, h: 5,  minW: 6, minH: 4  },
    { i: 'v-14', x: 0,  y: 22, w: 5,  h: 4,  minW: 3, minH: 3  },
    { i: 'v-15', x: 5,  y: 22, w: 7,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-16', x: 0,  y: 26, w: 6,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-17', x: 6,  y: 26, w: 6,  h: 4,  minW: 4, minH: 3  },
    { i: 'v-18', x: 0,  y: 30, w: 12, h: 5,  minW: 6, minH: 3  },
    { i: 'v-19', x: 0,  y: 35, w: 12, h: 6,  minW: 6, minH: 4  },
    { i: 'v-20', x: 0,  y: 41, w: 12, h: 7,  minW: 6, minH: 4  },
    { i: 'v-21', x: 0,  y: 48, w: 12, h: 7,  minW: 6, minH: 4  },
    { i: 'v-22', x: 0,  y: 55, w: 12, h: 7,  minW: 6, minH: 4  },
  ],
  sm: [
    { i: 'v-0',  x: 0, y: 0,  w: 6, h: 5,  minW: 4, minH: 3  },
    { i: 'v-9',  x: 0, y: 5,  w: 6, h: 5,  minW: 3, minH: 3  },
    { i: 'v-10', x: 0, y: 10, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-23', x: 0, y: 14, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-24', x: 0, y: 18, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-11', x: 0, y: 22, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-12', x: 0, y: 26, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-25', x: 0, y: 30, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-13', x: 0, y: 34, w: 6, h: 5,  minW: 3, minH: 4  },
    { i: 'v-14', x: 0, y: 39, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-15', x: 0, y: 43, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-16', x: 0, y: 47, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-17', x: 0, y: 51, w: 6, h: 4,  minW: 3, minH: 3  },
    { i: 'v-18', x: 0, y: 55, w: 6, h: 5,  minW: 3, minH: 3  },
    { i: 'v-19', x: 0, y: 60, w: 6, h: 6,  minW: 3, minH: 4  },
    { i: 'v-20', x: 0, y: 66, w: 6, h: 7,  minW: 3, minH: 4  },
    { i: 'v-21', x: 0, y: 73, w: 6, h: 7,  minW: 3, minH: 4  },
    { i: 'v-22', x: 0, y: 80, w: 6, h: 7,  minW: 3, minH: 4  },
  ],
};
