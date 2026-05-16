import {
  Users, DollarSign, Activity, TrendingUp, Award, Target, Percent, Tag,
  BarChart3, LineChart, PieChart, Search,
} from 'lucide-react';
import { createVendedoresKpiWidget } from './VendedoresKpiWidget';
import RankingVendedoresWidget    from './RankingVendedoresWidget';
import EvolucionVendedoresWidget  from './EvolucionVendedoresWidget';
import ConversionVendedoresWidget from './ConversionVendedoresWidget';
import DetalleVendedorWidget      from './DetalleVendedorWidget';
import ComisionesVendedoresWidget from './ComisionesVendedoresWidget';

const VENDEDORES_WIDGET_CATALOG = [
  // ── KPIs ──
  { type: 'v-kpi-total-vendedores', name: 'Vendedores activos',    description: 'Cantidad de vendedores con actividad en el período', icon: Users,       component: createVendedoresKpiWidget('v-kpi-total-vendedores'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'v-kpi-facturado',        name: 'Facturado neto',        description: 'Total facturado neto del equipo',                    icon: DollarSign,  component: createVendedoresKpiWidget('v-kpi-facturado'),        defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'v-kpi-ticket',           name: 'Ticket prom. global',   description: 'Ticket promedio del equipo completo',                icon: Activity,    component: createVendedoresKpiWidget('v-kpi-ticket'),           defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'v-kpi-margen',           name: 'Margen total',          description: 'Margen en pesos del período',                       icon: TrendingUp,  component: createVendedoresKpiWidget('v-kpi-margen'),           defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'v-kpi-mejor-vendedor',   name: 'Mejor vendedor',        description: 'Vendedor con mayor facturación en el período',      icon: Award,       component: createVendedoresKpiWidget('v-kpi-mejor-vendedor'),   defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'v-kpi-presupuestos',     name: 'Presupuestos emitidos', description: 'Total de presupuestos generados',                   icon: Target,      component: createVendedoresKpiWidget('v-kpi-presupuestos'),     defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'v-kpi-conversion',       name: 'Tasa conversión',       description: 'Tasa de conversión presupuesto → venta',            icon: Percent,     component: createVendedoresKpiWidget('v-kpi-conversion'),       defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'v-kpi-descuento',        name: 'Descuento prom.',       description: 'Descuento promedio aplicado por el equipo',         icon: Tag,         component: createVendedoresKpiWidget('v-kpi-descuento'),        defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  // ── Charts & Tables ──
  { type: 'v-ranking',    name: 'Ranking vendedores', description: 'Comparativa de facturación, tickets y cuota por vendedor', icon: BarChart3,  component: RankingVendedoresWidget,    defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'v-evolucion',  name: 'Evolución temporal', description: 'Evolución mensual de facturación por vendedor',            icon: LineChart,  component: EvolucionVendedoresWidget,  defaultSize: { w: 7,  h: 6 }, category: 'chart' },
  { type: 'v-conversion', name: 'Conversión',         description: 'Presupuestos confirmados vs. perdidos por vendedor',       icon: PieChart,   component: ConversionVendedoresWidget, defaultSize: { w: 5,  h: 6 }, category: 'chart' },
  { type: 'v-detalle',    name: 'Detalle vendedor',   description: 'Drill-down: evolución, clientes y productos por vendedor', icon: Search,     component: DetalleVendedorWidget,      defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'v-comisiones', name: 'Comisiones',         description: 'Comisiones calculadas sobre importes cobrados',            icon: DollarSign, component: ComisionesVendedoresWidget, defaultSize: { w: 12, h: 7 }, category: 'table' },
];

export default VENDEDORES_WIDGET_CATALOG;

export function getVendedoresWidgetDef(type) {
  return VENDEDORES_WIDGET_CATALOG.find((w) => w.type === type);
}

export const VENDEDORES_DEFAULT_WIDGETS = [
  { id: 'v-1',  type: 'v-kpi-total-vendedores' },
  { id: 'v-2',  type: 'v-kpi-facturado'        },
  { id: 'v-3',  type: 'v-kpi-ticket'           },
  { id: 'v-4',  type: 'v-kpi-margen'           },
  { id: 'v-5',  type: 'v-kpi-mejor-vendedor'   },
  { id: 'v-6',  type: 'v-kpi-presupuestos'     },
  { id: 'v-7',  type: 'v-kpi-conversion'       },
  { id: 'v-8',  type: 'v-kpi-descuento'        },
  { id: 'v-9',  type: 'v-ranking'              },
  { id: 'v-10', type: 'v-evolucion'            },
  { id: 'v-11', type: 'v-conversion'           },
  { id: 'v-12', type: 'v-detalle'              },
  { id: 'v-13', type: 'v-comisiones'           },
];

export const VENDEDORES_DEFAULT_LAYOUTS = {
  lg: [
    { i: 'v-1',  x: 0,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-2',  x: 3,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-3',  x: 6,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-4',  x: 9,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-5',  x: 0,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-6',  x: 3,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-7',  x: 6,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-8',  x: 9,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-9',  x: 0,  y: 4,  w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'v-10', x: 0,  y: 11, w: 7,  h: 6, minW: 4, minH: 4 },
    { i: 'v-11', x: 7,  y: 11, w: 5,  h: 6, minW: 3, minH: 4 },
    { i: 'v-12', x: 0,  y: 17, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'v-13', x: 0,  y: 24, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  md: [
    { i: 'v-1',  x: 0,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-2',  x: 3,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-3',  x: 6,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-4',  x: 9,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-5',  x: 0,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-6',  x: 3,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-7',  x: 6,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-8',  x: 9,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'v-9',  x: 0,  y: 4,  w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'v-10', x: 0,  y: 11, w: 7,  h: 6, minW: 4, minH: 4 },
    { i: 'v-11', x: 7,  y: 11, w: 5,  h: 6, minW: 3, minH: 4 },
    { i: 'v-12', x: 0,  y: 17, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'v-13', x: 0,  y: 24, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  sm: [
    { i: 'v-1',  x: 0, y: 0,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-2',  x: 3, y: 0,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-3',  x: 0, y: 2,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-4',  x: 3, y: 2,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-5',  x: 0, y: 4,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-6',  x: 3, y: 4,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-7',  x: 0, y: 6,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-8',  x: 3, y: 6,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'v-9',  x: 0, y: 8,  w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'v-10', x: 0, y: 15, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 'v-11', x: 0, y: 21, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 'v-12', x: 0, y: 27, w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'v-13', x: 0, y: 34, w: 6, h: 7, minW: 3, minH: 4 },
  ],
};
