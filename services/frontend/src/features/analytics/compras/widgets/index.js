import {
  DollarSign, ShoppingCart, Package, Users, AlertTriangle,
  Clock, CreditCard, Calculator, BarChart3, List, FileText,
  TrendingUp, Calendar, Receipt,
} from 'lucide-react';
import { createComprasKpiWidget } from './ComprasKpiWidget';
import EvolucionComprasWidget from './EvolucionComprasWidget';
import ParetoComprasWidget from './ParetoComprasWidget';
import RankingProveedoresWidget from './RankingProveedoresWidget';
import CalendarioPagosWidget from './CalendarioPagosWidget';
import VariacionPreciosWidget from './VariacionPreciosWidget';
import TransaccionesComprasWidget from './TransaccionesComprasWidget';
import FacturasCompraWidget from '../../infomanager/widgets/FacturasCompraWidget';
import VencimientosProveedoresWidget from '../../reportes/widgets/VencimientosProveedoresWidget';

const COMPRAS_WIDGET_CATALOG = [
  // ── KPIs ──
  { type: 'compras-kpi-total', name: 'Total comprado', description: 'Monto total de compras en el período', icon: DollarSign, component: createComprasKpiWidget('compras-kpi-total'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'compras-kpi-iva', name: 'IVA crédito fiscal', description: 'IVA recuperable por compras', icon: Calculator, component: createComprasKpiWidget('compras-kpi-iva'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'compras-kpi-ordenes', name: 'Órdenes de compra', description: 'Cantidad de órdenes emitidas', icon: ShoppingCart, component: createComprasKpiWidget('compras-kpi-ordenes'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'compras-kpi-ticket', name: 'Ticket prom. compra', description: 'Importe promedio por orden', icon: CreditCard, component: createComprasKpiWidget('compras-kpi-ticket'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'compras-kpi-proveedores', name: 'Proveedores activos', description: 'Proveedores con al menos una compra', icon: Users, component: createComprasKpiWidget('compras-kpi-proveedores'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'compras-kpi-deuda', name: 'Deuda vencida', description: 'Saldo vencido con proveedores', icon: AlertTriangle, component: createComprasKpiWidget('compras-kpi-deuda'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'compras-kpi-vencimientos', name: 'Vencimientos 30d', description: 'A pagar en los próximos 30 días', icon: Clock, component: createComprasKpiWidget('compras-kpi-vencimientos'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'compras-kpi-unidades', name: 'Unidades compradas', description: 'Total de unidades adquiridas', icon: Package, component: createComprasKpiWidget('compras-kpi-unidades'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  // ── Charts ──
  { type: 'compras-evolucion', name: 'Evolución temporal', description: 'Total comprado y órdenes por período', icon: BarChart3, component: EvolucionComprasWidget, defaultSize: { w: 8, h: 5 }, category: 'chart' },
  { type: 'compras-pareto', name: 'Pareto productos', description: 'Top 12 productos por volumen de compra', icon: BarChart3, component: ParetoComprasWidget, defaultSize: { w: 4, h: 5 }, category: 'chart' },
  { type: 'compras-precios', name: 'Variación de precios', description: 'Subas y bajas de precios por producto', icon: TrendingUp, component: VariacionPreciosWidget, defaultSize: { w: 6, h: 5 }, category: 'chart' },
  { type: 'compras-calendario', name: 'Calendario de pagos', description: 'Vencimientos agrupados por urgencia', icon: Calendar, component: CalendarioPagosWidget, defaultSize: { w: 6, h: 5 }, category: 'chart' },
  // ── Tables ──
  { type: 'compras-proveedores', name: 'Ranking proveedores', description: 'Tabla con totales y variación de precios', icon: List, component: RankingProveedoresWidget, defaultSize: { w: 12, h: 4 }, category: 'table' },
  { type: 'compras-transacciones', name: 'Transacciones', description: 'Detalle paginado de compras', icon: FileText, component: TransaccionesComprasWidget, defaultSize: { w: 12, h: 5 }, category: 'table' },
  { type: 'compras-facturas-im', name: 'Facturas de Compra (IM)', description: 'Facturas sincronizadas desde InfoManager', icon: Receipt, component: FacturasCompraWidget, defaultSize: { w: 12, h: 6 }, category: 'table' },
  { type: 'compras-vencimientos-prov', name: 'Próximos Vencimientos a Proveedores', description: 'Facturas pendientes ordenadas por urgencia', icon: Clock, component: VencimientosProveedoresWidget, defaultSize: { w: 12, h: 7 }, category: 'table' },
];

export default COMPRAS_WIDGET_CATALOG;

export function getComprasWidgetDef(type) {
  return COMPRAS_WIDGET_CATALOG.find((w) => w.type === type);
}

export const COMPRAS_DEFAULT_WIDGETS = [
  { id: 'c-1', type: 'compras-kpi-total' },
  { id: 'c-2', type: 'compras-kpi-iva' },
  { id: 'c-3', type: 'compras-kpi-ordenes' },
  { id: 'c-4', type: 'compras-kpi-ticket' },
  { id: 'c-5', type: 'compras-kpi-proveedores' },
  { id: 'c-6', type: 'compras-kpi-deuda' },
  { id: 'c-7', type: 'compras-kpi-vencimientos' },
  { id: 'c-8', type: 'compras-kpi-unidades' },
  { id: 'c-9', type: 'compras-evolucion' },
  { id: 'c-10', type: 'compras-pareto' },
  { id: 'c-11', type: 'compras-proveedores' },
  { id: 'c-12', type: 'compras-precios' },
  { id: 'c-13', type: 'compras-calendario' },
  { id: 'c-14', type: 'compras-transacciones' },
  { id: 'c-15', type: 'compras-facturas-im' },
  { id: 'c-16', type: 'compras-vencimientos-prov' },
];

export const COMPRAS_DEFAULT_LAYOUTS = {
  lg: [
    { i: 'c-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-3', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-4', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-5', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-6', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-7', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-8', x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-9', x: 0, y: 4, w: 8, h: 5, minW: 4, minH: 3 },
    { i: 'c-10', x: 8, y: 4, w: 4, h: 5, minW: 3, minH: 3 },
    { i: 'c-11', x: 0, y: 9, w: 12, h: 4, minW: 6, minH: 3 },
    { i: 'c-12', x: 0, y: 13, w: 6, h: 5, minW: 4, minH: 3 },
    { i: 'c-13', x: 6, y: 13, w: 6, h: 5, minW: 4, minH: 3 },
    { i: 'c-14', x: 0, y: 18, w: 12, h: 5, minW: 6, minH: 3 },
    { i: 'c-15', x: 0, y: 23, w: 12, h: 6, minW: 6, minH: 4 },
    { i: 'c-16', x: 0, y: 29, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  md: [
    { i: 'c-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-3', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-4', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-5', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-6', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-7', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-8', x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-9', x: 0, y: 4, w: 7, h: 5, minW: 4, minH: 3 },
    { i: 'c-10', x: 7, y: 4, w: 5, h: 5, minW: 3, minH: 3 },
    { i: 'c-11', x: 0, y: 9, w: 12, h: 4, minW: 6, minH: 3 },
    { i: 'c-12', x: 0, y: 13, w: 6, h: 5, minW: 4, minH: 3 },
    { i: 'c-13', x: 6, y: 13, w: 6, h: 5, minW: 4, minH: 3 },
    { i: 'c-14', x: 0, y: 18, w: 12, h: 5, minW: 6, minH: 3 },
    { i: 'c-15', x: 0, y: 23, w: 12, h: 6, minW: 6, minH: 4 },
    { i: 'c-16', x: 0, y: 29, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  sm: [
    { i: 'c-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-3', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-4', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-5', x: 0, y: 4, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-6', x: 3, y: 4, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-7', x: 0, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-8', x: 3, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-9', x: 0, y: 8, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'c-10', x: 0, y: 13, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'c-11', x: 0, y: 17, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'c-12', x: 0, y: 21, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'c-13', x: 0, y: 26, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'c-14', x: 0, y: 31, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 'c-15', x: 0, y: 36, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 'c-16', x: 0, y: 42, w: 6, h: 7, minW: 3, minH: 4 },
  ],
};
