import {
  TrendingUp, TrendingDown, DollarSign, RefreshCw,
  ArrowUpCircle, ArrowDownCircle, Activity, BarChart2,
  PieChart, List, Receipt, BookOpen, Landmark,
} from 'lucide-react';
import { createCajaKpiWidget } from './CajaKpiWidget';
import FlujoWidget            from './FlujoWidget';
import PorTipoWidget          from './PorTipoWidget';
import MovimientosWidget      from './MovimientosWidget';
import RecibosDelPeriodoWidget   from '../../infomanager/widgets/RecibosDelPeriodoWidget';
import FlujoCajaContableWidget   from '../../infomanager/widgets/FlujoCajaContableWidget';
import CajaYBancosWidget         from './CajaYBancosWidget';

const CAJA_WIDGET_CATALOG = [
  // ── KPIs ──
  { type: 'caja-kpi-ingresos',      name: 'Ingresos totales',    description: 'Ingresos totales del período',              icon: ArrowUpCircle,   component: createCajaKpiWidget('caja-kpi-ingresos'),      defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'caja-kpi-egresos',       name: 'Egresos totales',     description: 'Egresos totales del período',               icon: ArrowDownCircle, component: createCajaKpiWidget('caja-kpi-egresos'),       defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'caja-kpi-flujo-neto',    name: 'Flujo neto',          description: 'Diferencia entre ingresos y egresos',       icon: TrendingUp,      component: createCajaKpiWidget('caja-kpi-flujo-neto'),    defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'caja-kpi-movimientos',   name: 'Movimientos',         description: 'Cantidad de movimientos en el período',     icon: RefreshCw,       component: createCajaKpiWidget('caja-kpi-movimientos'),   defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'caja-kpi-saldo-actual',  name: 'Saldo actual',        description: 'Saldo de caja al cierre del período',       icon: DollarSign,      component: createCajaKpiWidget('caja-kpi-saldo-actual'),  defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'caja-kpi-mayor-ingreso', name: 'Mayor ingreso',       description: 'Ingreso individual más alto del período',   icon: TrendingUp,      component: createCajaKpiWidget('caja-kpi-mayor-ingreso'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'caja-kpi-mayor-egreso',  name: 'Mayor egreso',        description: 'Egreso individual más alto del período',    icon: TrendingDown,    component: createCajaKpiWidget('caja-kpi-mayor-egreso'),  defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'caja-kpi-ratio',         name: 'Ratio cobro/pago',    description: 'Relación entre cobros y pagos del período', icon: Activity,        component: createCajaKpiWidget('caja-kpi-ratio'),         defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  // ── Charts & Tables ──
  { type: 'caja-flujo',       name: 'Flujo de caja',    description: 'Ingresos vs. egresos mensuales y saldo acumulado',            icon: BarChart2, component: FlujoWidget,            defaultSize: { w: 12, h: 9  }, category: 'chart' },
  { type: 'caja-por-tipo',    name: 'Por tipo',         description: 'Distribución de ingresos y egresos por tipo de movimiento',   icon: PieChart,  component: PorTipoWidget,           defaultSize: { w: 8,  h: 9  }, category: 'chart' },
  { type: 'caja-movimientos', name: 'Movimientos',      description: 'Listado paginado de movimientos de caja',                     icon: List,      component: MovimientosWidget,       defaultSize: { w: 12, h: 10 }, category: 'table' },
  { type: 'caja-recibos-im',  name: 'Recibos (IM)',     description: 'Recibos sincronizados desde InfoManager con total cobrado',   icon: Receipt,   component: RecibosDelPeriodoWidget, defaultSize: { w: 12, h: 7  }, category: 'table' },
  { type: 'caja-flujo-contable', name: 'Flujo Contable (IM)', description: 'Flujo de caja desde movimientos contables sincronizados de InfoManager', icon: BookOpen,  component: FlujoCajaContableWidget, defaultSize: { w: 12, h: 8 }, category: 'table' },
  { type: 'caja-saldo-cuentas',  name: 'Caja y Bancos',       description: 'Saldo real de cuentas de caja y bancos desde el mayor contable',       icon: Landmark, component: CajaYBancosWidget,       defaultSize: { w: 6,  h: 9 }, category: 'kpi'   },
];

export default CAJA_WIDGET_CATALOG;

export function getCajaWidgetDef(type) {
  return CAJA_WIDGET_CATALOG.find((w) => w.type === type);
}

export const CAJA_DEFAULT_WIDGETS = [
  { id: 'cj-1',  type: 'caja-kpi-ingresos'      },
  { id: 'cj-2',  type: 'caja-kpi-egresos'       },
  { id: 'cj-3',  type: 'caja-kpi-flujo-neto'    },
  { id: 'cj-4',  type: 'caja-kpi-movimientos'   },
  { id: 'cj-5',  type: 'caja-kpi-saldo-actual'  },
  { id: 'cj-6',  type: 'caja-kpi-mayor-ingreso' },
  { id: 'cj-7',  type: 'caja-kpi-mayor-egreso'  },
  { id: 'cj-8',  type: 'caja-kpi-ratio'         },
  { id: 'cj-14', type: 'caja-saldo-cuentas'     },
  { id: 'cj-9',  type: 'caja-flujo'             },
  { id: 'cj-10', type: 'caja-por-tipo'          },
  { id: 'cj-11', type: 'caja-movimientos'       },
  { id: 'cj-12', type: 'caja-recibos-im'        },
  { id: 'cj-13', type: 'caja-flujo-contable'    },
];

export const CAJA_DEFAULT_LAYOUTS = {
  lg: [
    { i: 'cj-1',  x: 0,  y: 0,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-2',  x: 3,  y: 0,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-3',  x: 6,  y: 0,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-4',  x: 9,  y: 0,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-5',  x: 0,  y: 2,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-6',  x: 3,  y: 2,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-7',  x: 6,  y: 2,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-8',  x: 9,  y: 2,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-14', x: 0,  y: 4,  w: 6,  h: 9,  minW: 4, minH: 6 },
    { i: 'cj-9',  x: 6,  y: 4,  w: 6,  h: 9,  minW: 4, minH: 6 },
    { i: 'cj-10', x: 0,  y: 13, w: 8,  h: 9,  minW: 4, minH: 6 },
    { i: 'cj-11', x: 0,  y: 22, w: 12, h: 10, minW: 6, minH: 6 },
    { i: 'cj-12', x: 0,  y: 32, w: 12, h: 7,  minW: 6, minH: 4 },
    { i: 'cj-13', x: 0,  y: 39, w: 12, h: 8,  minW: 6, minH: 5 },
  ],
  md: [
    { i: 'cj-1',  x: 0,  y: 0,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-2',  x: 3,  y: 0,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-3',  x: 6,  y: 0,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-4',  x: 9,  y: 0,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-5',  x: 0,  y: 2,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-6',  x: 3,  y: 2,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-7',  x: 6,  y: 2,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-8',  x: 9,  y: 2,  w: 3,  h: 2,  minW: 2, minH: 2 },
    { i: 'cj-9',  x: 0,  y: 4,  w: 12, h: 9,  minW: 6, minH: 6 },
    { i: 'cj-10', x: 0,  y: 13, w: 12, h: 9,  minW: 4, minH: 6 },
    { i: 'cj-11', x: 0,  y: 22, w: 12, h: 10, minW: 6, minH: 6 },
    { i: 'cj-12', x: 0,  y: 32, w: 12, h: 7,  minW: 6, minH: 4 },
    { i: 'cj-13', x: 0,  y: 39, w: 12, h: 8,  minW: 6, minH: 5 },
  ],
  sm: [
    { i: 'cj-1',  x: 0, y: 0,  w: 3, h: 2,  minW: 2, minH: 2 },
    { i: 'cj-2',  x: 3, y: 0,  w: 3, h: 2,  minW: 2, minH: 2 },
    { i: 'cj-3',  x: 0, y: 2,  w: 3, h: 2,  minW: 2, minH: 2 },
    { i: 'cj-4',  x: 3, y: 2,  w: 3, h: 2,  minW: 2, minH: 2 },
    { i: 'cj-5',  x: 0, y: 4,  w: 3, h: 2,  minW: 2, minH: 2 },
    { i: 'cj-6',  x: 3, y: 4,  w: 3, h: 2,  minW: 2, minH: 2 },
    { i: 'cj-7',  x: 0, y: 6,  w: 3, h: 2,  minW: 2, minH: 2 },
    { i: 'cj-8',  x: 3, y: 6,  w: 3, h: 2,  minW: 2, minH: 2 },
    { i: 'cj-9',  x: 0, y: 8,  w: 6, h: 9,  minW: 3, minH: 6 },
    { i: 'cj-10', x: 0, y: 17, w: 6, h: 9,  minW: 3, minH: 6 },
    { i: 'cj-11', x: 0, y: 26, w: 6, h: 10, minW: 3, minH: 6 },
    { i: 'cj-12', x: 0, y: 36, w: 6, h: 7,  minW: 3, minH: 4 },
    { i: 'cj-13', x: 0, y: 43, w: 6, h: 8,  minW: 3, minH: 5 },
  ],
};
