import {
  Package, TrendingUp, TrendingDown, AlertTriangle, Archive,
  BarChart3, List, ShoppingBag, Activity,
} from 'lucide-react';
import { createStockKpiWidget } from './StockKpiWidget';
import InventarioWidget from './InventarioWidget';
import AlertasStockWidget from './AlertasStockWidget';
import ReposicionWidget from './ReposicionWidget';
import RotacionAbcWidget from './RotacionAbcWidget';
import StockDisponibleWidget from '../../infomanager/widgets/StockDisponibleWidget';
import MovimientosStockWidget from '../../infomanager/widgets/MovimientosStockWidget';

const STOCK_WIDGET_CATALOG = [
  // ── KPIs ──
  { type: 'stock-kpi-total', name: 'Total artículos', description: 'Artículos habilitados en catálogo', icon: Package, component: createStockKpiWidget('stock-kpi-total'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'stock-kpi-con-stock', name: 'Con stock', description: 'Artículos con existencia > 0', icon: TrendingUp, component: createStockKpiWidget('stock-kpi-con-stock'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'stock-kpi-sin-stock', name: 'Sin stock', description: 'Artículos con existencia = 0', icon: TrendingDown, component: createStockKpiWidget('stock-kpi-sin-stock'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'stock-kpi-bajo', name: 'Stock bajo', description: 'Por debajo del mínimo configurado', icon: AlertTriangle, component: createStockKpiWidget('stock-kpi-bajo'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'stock-kpi-valor-costo', name: 'Valor (costo)', description: 'Valor del inventario a precio de costo', icon: Archive, component: createStockKpiWidget('stock-kpi-valor-costo'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'stock-kpi-valor-venta', name: 'Valor (venta)', description: 'Valor del inventario a precio de venta', icon: Archive, component: createStockKpiWidget('stock-kpi-valor-venta'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'stock-kpi-dias', name: 'Días inventario', description: 'Cobertura promedio en días', icon: Package, component: createStockKpiWidget('stock-kpi-dias'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'stock-kpi-sin-movimiento', name: 'Sin movimiento 90d', description: 'Artículos sin ventas/compras en 90 días', icon: AlertTriangle, component: createStockKpiWidget('stock-kpi-sin-movimiento'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  // ── Charts & Tables ──
  { type: 'stock-inventario', name: 'Inventario', description: 'Stock por artículo con estado y valor', icon: List, component: InventarioWidget, defaultSize: { w: 12, h: 6 }, category: 'table' },
  { type: 'stock-rotacion-abc', name: 'Rotación ABC', description: 'Clasificación ABC con gráfico de valor', icon: BarChart3, component: RotacionAbcWidget, defaultSize: { w: 7, h: 6 }, category: 'chart' },
  { type: 'stock-alertas', name: 'Alertas de stock', description: 'Alertas críticas, advertencias e informativas', icon: AlertTriangle, component: AlertasStockWidget, defaultSize: { w: 5, h: 6 }, category: 'chart' },
  { type: 'stock-reposicion', name: 'Reposición', description: 'Sugerencias de compra con costo estimado', icon: ShoppingBag, component: ReposicionWidget, defaultSize: { w: 12, h: 5 }, category: 'table' },
  { type: 'stock-disponible-im', name: 'Stock Disponible (IM)', description: 'Stock sincronizado desde InfoManager con alertas de reposición', icon: Package, component: StockDisponibleWidget, defaultSize: { w: 12, h: 6 }, category: 'table' },
  { type: 'stock-movimientos-im', name: 'Movimientos de Stock (IM)', description: 'Entradas y salidas sincronizadas desde InfoManager', icon: Activity, component: MovimientosStockWidget, defaultSize: { w: 12, h: 6 }, category: 'table' },
];

export default STOCK_WIDGET_CATALOG;

export function getStockWidgetDef(type) {
  return STOCK_WIDGET_CATALOG.find((w) => w.type === type);
}

export const STOCK_DEFAULT_WIDGETS = [
  { id: 's-1', type: 'stock-kpi-total' },
  { id: 's-2', type: 'stock-kpi-con-stock' },
  { id: 's-3', type: 'stock-kpi-sin-stock' },
  { id: 's-4', type: 'stock-kpi-bajo' },
  { id: 's-5', type: 'stock-kpi-valor-costo' },
  { id: 's-6', type: 'stock-kpi-valor-venta' },
  { id: 's-7', type: 'stock-kpi-dias' },
  { id: 's-8', type: 'stock-kpi-sin-movimiento' },
  { id: 's-9', type: 'stock-inventario' },
  { id: 's-10', type: 'stock-rotacion-abc' },
  { id: 's-11', type: 'stock-alertas' },
  { id: 's-12', type: 'stock-reposicion' },
  { id: 's-13', type: 'stock-disponible-im' },
  { id: 's-14', type: 'stock-movimientos-im' },
];

export const STOCK_DEFAULT_LAYOUTS = {
  lg: [
    { i: 's-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-3', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-4', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-5', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-6', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-7', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-8', x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-9', x: 0, y: 4, w: 12, h: 6, minW: 6, minH: 4 },
    { i: 's-10', x: 0, y: 10, w: 7, h: 6, minW: 4, minH: 4 },
    { i: 's-11', x: 7, y: 10, w: 5, h: 6, minW: 3, minH: 4 },
    { i: 's-12', x: 0, y: 16, w: 12, h: 5, minW: 6, minH: 3 },
    { i: 's-13', x: 0, y: 21, w: 12, h: 6, minW: 6, minH: 4 },
    { i: 's-14', x: 0, y: 27, w: 12, h: 6, minW: 6, minH: 4 },
  ],
  md: [
    { i: 's-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-3', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-4', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-5', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-6', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-7', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-8', x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-9', x: 0, y: 4, w: 12, h: 6, minW: 6, minH: 4 },
    { i: 's-10', x: 0, y: 10, w: 7, h: 6, minW: 4, minH: 4 },
    { i: 's-11', x: 7, y: 10, w: 5, h: 6, minW: 3, minH: 4 },
    { i: 's-12', x: 0, y: 16, w: 12, h: 5, minW: 6, minH: 3 },
    { i: 's-13', x: 0, y: 21, w: 12, h: 6, minW: 6, minH: 4 },
    { i: 's-14', x: 0, y: 27, w: 12, h: 6, minW: 6, minH: 4 },
  ],
  sm: [
    { i: 's-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-3', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-4', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-5', x: 0, y: 4, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-6', x: 3, y: 4, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-7', x: 0, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-8', x: 3, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 's-9', x: 0, y: 8, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 's-10', x: 0, y: 14, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 's-11', x: 0, y: 20, w: 6, h: 5, minW: 3, minH: 4 },
    { i: 's-12', x: 0, y: 25, w: 6, h: 5, minW: 3, minH: 3 },
    { i: 's-13', x: 0, y: 30, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 's-14', x: 0, y: 36, w: 6, h: 6, minW: 3, minH: 4 },
  ],
};
