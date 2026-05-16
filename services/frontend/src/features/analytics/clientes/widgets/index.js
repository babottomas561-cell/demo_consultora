import {
  Users, DollarSign, Activity, UserCheck, Award, TrendingUp, AlertTriangle, Percent,
  BarChart3, PieChart, LineChart, Search, FileText, Clock, Receipt, Wallet,
} from 'lucide-react';
import { createClientesKpiWidget } from './ClientesKpiWidget';
import RankingClientesWidget     from './RankingClientesWidget';
import SegmentacionClientesWidget from './SegmentacionClientesWidget';
import TemporalClientesWidget    from './TemporalClientesWidget';
import DetalleClienteWidget      from './DetalleClienteWidget';
import ComprobantesClienteWidget from './ComprobantesClienteWidget';
import SaldosClientesWidget      from '../../infomanager/widgets/SaldosClientesWidget';
import ComprobantesVencidosWidget from '../../infomanager/widgets/ComprobantesVencidosWidget';
import SaldosConsolidadosWidget   from '../../reportes/widgets/SaldosConsolidadosWidget';
import FacturasCobrarWidget       from '../../reportes/widgets/FacturasCobrarWidget';
import CreditoDisponibleWidget    from '../../reportes/widgets/CreditoDisponibleWidget';

const CLIENTES_WIDGET_CATALOG = [
  // ── KPIs ──
  { type: 'c-kpi-activos',       name: 'Clientes activos',  description: 'Cantidad de clientes con actividad en el período', icon: Users,         component: createClientesKpiWidget('c-kpi-activos'),       defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'c-kpi-facturado',     name: 'Facturado neto',    description: 'Total facturado neto del período',                 icon: DollarSign,    component: createClientesKpiWidget('c-kpi-facturado'),     defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'c-kpi-ticket',        name: 'Ticket promedio',   description: 'Valor promedio por transacción',                  icon: Activity,      component: createClientesKpiWidget('c-kpi-ticket'),        defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'c-kpi-nuevos',        name: 'Clientes nuevos',   description: 'Nuevos clientes captados en el período',          icon: UserCheck,     component: createClientesKpiWidget('c-kpi-nuevos'),        defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'c-kpi-mejor',         name: 'Mejor cliente',     description: 'Cliente con mayor facturación',                   icon: Award,         component: createClientesKpiWidget('c-kpi-mejor'),         defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'c-kpi-saldo-cta-cte', name: 'Saldo Cta Cte',    description: 'Saldo total en cuenta corriente',                 icon: TrendingUp,    component: createClientesKpiWidget('c-kpi-saldo-cta-cte'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'c-kpi-deuda-vencida', name: 'Deuda vencida',    description: 'Deuda vencida total de clientes',                 icon: AlertTriangle, component: createClientesKpiWidget('c-kpi-deuda-vencida'), defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'c-kpi-retencion',     name: 'Tasa retención',   description: 'Porcentaje de clientes que repiten compra',       icon: Percent,       component: createClientesKpiWidget('c-kpi-retencion'),     defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  // ── Charts & Tables ──
  { type: 'c-ranking',      name: 'Ranking clientes',    description: 'Top clientes por facturación con segmento ABC',    icon: BarChart3,      component: RankingClientesWidget,      defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'c-segmentacion', name: 'Segmentación ABC',    description: 'Distribución de revenue y clientes por segmento',  icon: PieChart,       component: SegmentacionClientesWidget, defaultSize: { w: 6,  h: 6 }, category: 'chart' },
  { type: 'c-temporal',     name: 'Temporal',            description: 'Evolución mensual de facturación y clientes',      icon: LineChart,      component: TemporalClientesWidget,     defaultSize: { w: 6,  h: 6 }, category: 'chart' },
  { type: 'c-detalle',      name: 'Detalle cliente',     description: 'Drill-down: evolución y productos por cliente',    icon: Search,         component: DetalleClienteWidget,       defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'c-comprobantes', name: 'Comprobantes',        description: 'Facturas, saldos y pagos aplicados por cliente',   icon: FileText,       component: ComprobantesClienteWidget,  defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'c-saldos-im',    name: 'Saldos Cta. Cte. (IM)', description: 'Saldos sincronizados desde InfoManager con semáforo de mora', icon: TrendingUp, component: SaldosClientesWidget, defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'c-pendientes-im', name: 'Comprobantes Vencidos (IM)', description: 'Comprobantes pendientes con aging por cliente', icon: Clock, component: ComprobantesVencidosWidget, defaultSize: { w: 12, h: 7 }, category: 'table' },
  // ── Reportes en tiempo real (Infomanager) ──
  { type: 'c-saldos-consolidados', name: 'Saldos consolidados (Infomanager)', description: 'Deuda total y facturas pendientes por cliente', icon: Wallet, component: SaldosConsolidadosWidget, defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'c-facturas-cobrar',     name: 'Facturas por Cobrar', description: 'Comprobantes vencidos ordenados por mora', icon: Receipt, component: FacturasCobrarWidget, defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'c-credito-disponible',  name: 'Crédito Disponible por Cliente', description: 'Facturado vs. cobrado con barra de progreso', icon: Percent, component: CreditoDisponibleWidget, defaultSize: { w: 12, h: 7 }, category: 'table' },
];

export default CLIENTES_WIDGET_CATALOG;

export function getClientesWidgetDef(type) {
  return CLIENTES_WIDGET_CATALOG.find((w) => w.type === type);
}

export const CLIENTES_DEFAULT_WIDGETS = [
  { id: 'c-1',  type: 'c-kpi-activos'       },
  { id: 'c-2',  type: 'c-kpi-facturado'     },
  { id: 'c-3',  type: 'c-kpi-ticket'        },
  { id: 'c-4',  type: 'c-kpi-nuevos'        },
  { id: 'c-5',  type: 'c-kpi-mejor'         },
  { id: 'c-6',  type: 'c-kpi-saldo-cta-cte' },
  { id: 'c-7',  type: 'c-kpi-deuda-vencida' },
  { id: 'c-8',  type: 'c-kpi-retencion'     },
  { id: 'c-9',  type: 'c-ranking'           },
  { id: 'c-10', type: 'c-segmentacion'      },
  { id: 'c-11', type: 'c-temporal'          },
  { id: 'c-12', type: 'c-detalle'           },
  { id: 'c-13', type: 'c-comprobantes'      },
  { id: 'c-14', type: 'c-saldos-im'         },
  { id: 'c-15', type: 'c-pendientes-im'     },
  { id: 'c-16', type: 'c-saldos-consolidados' },
  { id: 'c-17', type: 'c-facturas-cobrar'     },
  { id: 'c-18', type: 'c-credito-disponible'  },
];

export const CLIENTES_DEFAULT_LAYOUTS = {
  lg: [
    { i: 'c-1',  x: 0,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-2',  x: 3,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-3',  x: 6,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-4',  x: 9,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-5',  x: 0,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-6',  x: 3,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-7',  x: 6,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-8',  x: 9,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-9',  x: 0,  y: 4,  w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-10', x: 0,  y: 11, w: 6,  h: 6, minW: 3, minH: 4 },
    { i: 'c-11', x: 6,  y: 11, w: 6,  h: 6, minW: 3, minH: 4 },
    { i: 'c-12', x: 0,  y: 17, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-13', x: 0,  y: 24, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-14', x: 0,  y: 31, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-15', x: 0,  y: 38, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-16', x: 0,  y: 45, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-17', x: 0,  y: 52, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-18', x: 0,  y: 59, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  md: [
    { i: 'c-1',  x: 0,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-2',  x: 3,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-3',  x: 6,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-4',  x: 9,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-5',  x: 0,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-6',  x: 3,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-7',  x: 6,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-8',  x: 9,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'c-9',  x: 0,  y: 4,  w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-10', x: 0,  y: 11, w: 6,  h: 6, minW: 3, minH: 4 },
    { i: 'c-11', x: 6,  y: 11, w: 6,  h: 6, minW: 3, minH: 4 },
    { i: 'c-12', x: 0,  y: 17, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-13', x: 0,  y: 24, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-14', x: 0,  y: 31, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-15', x: 0,  y: 38, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-16', x: 0,  y: 45, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-17', x: 0,  y: 52, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'c-18', x: 0,  y: 59, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  sm: [
    { i: 'c-1',  x: 0, y: 0,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-2',  x: 3, y: 0,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-3',  x: 0, y: 2,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-4',  x: 3, y: 2,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-5',  x: 0, y: 4,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-6',  x: 3, y: 4,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-7',  x: 0, y: 6,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-8',  x: 3, y: 6,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'c-9',  x: 0, y: 8,  w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'c-10', x: 0, y: 15, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 'c-11', x: 0, y: 21, w: 6, h: 6, minW: 3, minH: 4 },
    { i: 'c-12', x: 0, y: 27, w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'c-13', x: 0, y: 34, w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'c-14', x: 0, y: 41, w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'c-15', x: 0, y: 48, w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'c-16', x: 0, y: 55, w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'c-17', x: 0, y: 62, w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'c-18', x: 0, y: 69, w: 6, h: 7, minW: 3, minH: 4 },
  ],
};
