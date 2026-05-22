import {
  ShoppingBag, DollarSign, Package, Activity, Award, TrendingUp, AlertTriangle, Calendar,
  BarChart3, PieChart, LineChart, Search, FileText, Clock,
} from 'lucide-react';
import { createProveedoresKpiWidget }      from './ProveedoresKpiWidget';
import RankingProveedoresWidget           from './RankingProveedoresWidget';
import SegmentacionProveedoresWidget      from './SegmentacionProveedoresWidget';
import TemporalProveedoresWidget          from './TemporalProveedoresWidget';
import DetalleProveedorWidget             from './DetalleProveedorWidget';
import ComprobantesProveedorWidget        from './ComprobantesProveedorWidget';
import CuentaCorrienteProveedoresWidget   from './CuentaCorrienteProveedoresWidget';

const PROVEEDORES_WIDGET_CATALOG = [
  // ── KPIs ──
  { type: 'p-kpi-activos',       name: 'Proveedores activos', description: 'Cantidad de proveedores con actividad en el período', icon: ShoppingBag,   component: createProveedoresKpiWidget('p-kpi-activos'),       defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'p-kpi-total',         name: 'Total comprado',      description: 'Monto total de compras en el período',                icon: DollarSign,    component: createProveedoresKpiWidget('p-kpi-total'),         defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'p-kpi-ordenes',       name: 'Órdenes de compra',  description: 'Cantidad total de órdenes de compra',               icon: Package,       component: createProveedoresKpiWidget('p-kpi-ordenes'),       defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'p-kpi-ticket',        name: 'Ticket promedio',     description: 'Valor promedio por orden de compra',                 icon: Activity,      component: createProveedoresKpiWidget('p-kpi-ticket'),        defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'p-kpi-mejor',         name: 'Mejor proveedor',     description: 'Proveedor con mayor volumen de compra',              icon: Award,         component: createProveedoresKpiWidget('p-kpi-mejor'),         defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'p-kpi-saldo-cta-cte', name: 'Saldo Cta Cte',      description: 'Saldo total en cuenta corriente con proveedores',   icon: TrendingUp,    component: createProveedoresKpiWidget('p-kpi-saldo-cta-cte'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'p-kpi-deuda-vencida', name: 'Deuda vencida',      description: 'Deuda vencida con proveedores',                     icon: AlertTriangle, component: createProveedoresKpiWidget('p-kpi-deuda-vencida'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'p-kpi-proximos-30d',  name: 'Vence en 30 días',   description: 'Pagos que vencen en los próximos 30 días',          icon: Calendar,      component: createProveedoresKpiWidget('p-kpi-proximos-30d'),  defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  // ── Charts & Tables ──
  { type: 'p-ranking',      name: 'Ranking proveedores', description: 'Top proveedores por volumen de compra con segmento ABC', icon: BarChart3, component: RankingProveedoresWidget,      defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'p-segmentacion', name: 'Segmentación ABC',   description: 'Distribución de gasto y proveedores por segmento',       icon: PieChart,  component: SegmentacionProveedoresWidget, defaultSize: { w: 6,  h: 6 }, category: 'chart' },
  { type: 'p-temporal',     name: 'Temporal',           description: 'Evolución mensual de gasto y órdenes de compra',         icon: LineChart, component: TemporalProveedoresWidget,     defaultSize: { w: 6,  h: 6 }, category: 'chart' },
  { type: 'p-detalle',      name: 'Detalle proveedor',  description: 'Drill-down: evolución, productos y vencimientos',        icon: Search,    component: DetalleProveedorWidget,        defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'p-comprobantes',    name: 'Comprobantes',         description: 'Facturas, saldos y pagos aplicados por proveedor',              icon: FileText,  component: ComprobantesProveedorWidget,         defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'p-cta-corriente',  name: 'Cuenta Corriente',     description: 'Saldos pendientes por proveedor con aging 0-30/31-60/+90 días',  icon: Clock,     component: CuentaCorrienteProveedoresWidget,    defaultSize: { w: 12, h: 8 }, category: 'table' },
];

export default PROVEEDORES_WIDGET_CATALOG;

export function getProveedoresWidgetDef(type) {
  return PROVEEDORES_WIDGET_CATALOG.find((w) => w.type === type);
}

export const PROVEEDORES_DEFAULT_WIDGETS = [
  { id: 'p-1',  type: 'p-kpi-activos'       },
  { id: 'p-2',  type: 'p-kpi-total'         },
  { id: 'p-3',  type: 'p-kpi-ordenes'       },
  { id: 'p-4',  type: 'p-kpi-ticket'        },
  { id: 'p-5',  type: 'p-kpi-mejor'         },
  { id: 'p-6',  type: 'p-kpi-saldo-cta-cte' },
  { id: 'p-7',  type: 'p-kpi-deuda-vencida' },
  { id: 'p-8',  type: 'p-kpi-proximos-30d'  },
  { id: 'p-14', type: 'p-cta-corriente'     },
  { id: 'p-9',  type: 'p-ranking'           },
  { id: 'p-10', type: 'p-segmentacion'      },
  { id: 'p-11', type: 'p-temporal'          },
  { id: 'p-12', type: 'p-detalle'           },
  { id: 'p-13', type: 'p-comprobantes'      },
];

export const PROVEEDORES_DEFAULT_LAYOUTS = {
  lg: [
    { i: 'p-1',  x: 0,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-2',  x: 3,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-3',  x: 6,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-4',  x: 9,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-5',  x: 0,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-6',  x: 3,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-7',  x: 6,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-8',  x: 9,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-14', x: 0,  y: 4,  w: 12, h: 8, minW: 6, minH: 5 },
    { i: 'p-9',  x: 0,  y: 12, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'p-10', x: 0,  y: 19, w: 6,  h: 6, minW: 3, minH: 4 },
    { i: 'p-11', x: 6,  y: 19, w: 6,  h: 6, minW: 3, minH: 4 },
    { i: 'p-12', x: 0,  y: 25, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'p-13', x: 0,  y: 32, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  md: [
    { i: 'p-1',  x: 0,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-2',  x: 3,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-3',  x: 6,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-4',  x: 9,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-5',  x: 0,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-6',  x: 3,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-7',  x: 6,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-8',  x: 9,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'p-14', x: 0,  y: 4,  w: 12, h: 8, minW: 6, minH: 5 },
    { i: 'p-9',  x: 0,  y: 12, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'p-10', x: 0,  y: 19, w: 6,  h: 6, minW: 3, minH: 4 },
    { i: 'p-11', x: 6,  y: 19, w: 6,  h: 6, minW: 3, minH: 4 },
    { i: 'p-12', x: 0,  y: 25, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'p-13', x: 0,  y: 32, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  sm: [
    { i: 'p-1',  x: 0, y: 0,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'p-2',  x: 3, y: 0,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'p-3',  x: 0, y: 2,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'p-4',  x: 3, y: 2,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'p-5',  x: 0, y: 4,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'p-6',  x: 3, y: 4,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'p-7',  x: 0, y: 6,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'p-8',  x: 3, y: 6,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'p-14', x: 0, y: 8,  w: 6, h: 8, minW: 3, minH: 5 },
    { i: 'p-9',  x: 0, y: 16, w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'p-10', x: 0, y: 23, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 'p-11', x: 0, y: 29, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 'p-12', x: 0, y: 35, w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'p-13', x: 0, y: 42, w: 6, h: 7, minW: 3, minH: 4 },
  ],
};
