import {
  DollarSign, Package, TrendingUp, Percent, ShoppingCart,
  AlertTriangle, Tag, TrendingDown,
  BarChart3, LineChart, Users, UserCheck, Scissors, BookOpen,
} from 'lucide-react';
import { createResultadoKpiWidget }   from './ResultadoKpiWidget';
import TemporalResultadoWidget        from './TemporalResultadoWidget';
import ProductosResultadoWidget       from './ProductosResultadoWidget';
import VendedoresResultadoWidget      from './VendedoresResultadoWidget';
import ClientesResultadoWidget        from './ClientesResultadoWidget';
import DescuentosResultadoWidget      from './DescuentosResultadoWidget';
import LibroMayorWidget               from '../../infomanager/widgets/LibroMayorWidget';
import MargenPorListaWidget           from '../../infomanager/widgets/MargenPorListaWidget';

const RESULTADO_WIDGET_CATALOG = [
  // ── KPIs ──
  { type: 'r-kpi-facturado',      name: 'Facturado neto',      description: 'Facturación neta del período',                       icon: DollarSign,   component: createResultadoKpiWidget('r-kpi-facturado'),      defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'r-kpi-cogs',           name: 'COGS / Costo merc.',  description: 'Costo de mercadería vendida',                        icon: Package,      component: createResultadoKpiWidget('r-kpi-cogs'),           defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'r-kpi-margen-bruto',   name: 'Margen bruto $',      description: 'Margen bruto en pesos',                              icon: TrendingUp,   component: createResultadoKpiWidget('r-kpi-margen-bruto'),   defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'r-kpi-margen-pct',     name: 'Margen bruto %',      description: 'Porcentaje de margen bruto',                         icon: Percent,      component: createResultadoKpiWidget('r-kpi-margen-pct'),     defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'r-kpi-ticket-margen',  name: 'Ticket prom. margen', description: 'Margen promedio por ticket',                         icon: ShoppingCart, component: createResultadoKpiWidget('r-kpi-ticket-margen'),  defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'r-kpi-bajo-costo',     name: 'Productos bajo costo',description: 'Artículos vendidos por debajo del costo de compra',  icon: AlertTriangle, component: createResultadoKpiWidget('r-kpi-bajo-costo'),    defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'r-kpi-descuento-total',name: 'Descuento total',     description: 'Total descontado en el período',                     icon: Tag,          component: createResultadoKpiWidget('r-kpi-descuento-total'),defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  { type: 'r-kpi-descuento-pct',  name: 'Descuento prom. %',   description: 'Porcentaje de descuento promedio',                   icon: TrendingDown, component: createResultadoKpiWidget('r-kpi-descuento-pct'),  defaultSize: { w: 3, h: 2 }, category: 'kpi' },
  // ── Charts & Analysis ──
  { type: 'r-temporal',    name: 'Evolución temporal',   description: 'Facturación, COGS, margen $ y % por período con selector de granularidad', icon: LineChart,  component: TemporalResultadoWidget,   defaultSize: { w: 12, h: 8 }, category: 'chart' },
  { type: 'r-productos',   name: 'Análisis productos',   description: 'Cuadrante scatter (facturado vs margen) + ranking',                        icon: BarChart3,  component: ProductosResultadoWidget,  defaultSize: { w: 8,  h: 8 }, category: 'chart' },
  { type: 'r-vendedores',  name: 'Resultado vendedores', description: 'Margen y descuentos por vendedor con alertas de exceso',                    icon: Users,     component: VendedoresResultadoWidget, defaultSize: { w: 6,  h: 8 }, category: 'chart' },
  { type: 'r-clientes',    name: 'Resultado clientes',   description: 'Scatter clientes: facturación vs margen, alertas de bajo margen',            icon: UserCheck,  component: ClientesResultadoWidget,  defaultSize: { w: 6,  h: 8 }, category: 'chart' },
  { type: 'r-descuentos',  name: 'Análisis descuentos',  description: 'Resumen de descuentos: monto, % y mayores individuales',                    icon: Scissors,   component: DescuentosResultadoWidget, defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'r-libro-mayor', name: 'Libro Mayor (IM)',     description: 'Movimientos contables sincronizados desde InfoManager',                      icon: BookOpen,   component: LibroMayorWidget,          defaultSize: { w: 12, h: 7 }, category: 'table' },
  { type: 'r-margen-lista', name: 'Margen por Lista (IM)', description: 'Rentabilidad por lista de precios y artículo',                            icon: Tag,        component: MargenPorListaWidget,      defaultSize: { w: 12, h: 7 }, category: 'table' },
];

export default RESULTADO_WIDGET_CATALOG;

export function getResultadoWidgetDef(type) {
  return RESULTADO_WIDGET_CATALOG.find((w) => w.type === type);
}

export const RESULTADO_DEFAULT_WIDGETS = [
  { id: 'r-1',  type: 'r-kpi-facturado'       },
  { id: 'r-2',  type: 'r-kpi-cogs'            },
  { id: 'r-3',  type: 'r-kpi-margen-bruto'    },
  { id: 'r-4',  type: 'r-kpi-margen-pct'      },
  { id: 'r-5',  type: 'r-kpi-ticket-margen'   },
  { id: 'r-6',  type: 'r-kpi-bajo-costo'      },
  { id: 'r-7',  type: 'r-kpi-descuento-total' },
  { id: 'r-8',  type: 'r-kpi-descuento-pct'   },
  { id: 'r-9',  type: 'r-temporal'            },
  { id: 'r-10', type: 'r-productos'           },
  { id: 'r-11', type: 'r-vendedores'          },
  { id: 'r-12', type: 'r-clientes'            },
  { id: 'r-13', type: 'r-descuentos'          },
  { id: 'r-14', type: 'r-libro-mayor'         },
  { id: 'r-15', type: 'r-margen-lista'        },
];

export const RESULTADO_DEFAULT_LAYOUTS = {
  lg: [
    { i: 'r-1',  x: 0,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-2',  x: 3,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-3',  x: 6,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-4',  x: 9,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-5',  x: 0,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-6',  x: 3,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-7',  x: 6,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-8',  x: 9,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-9',  x: 0,  y: 4,  w: 12, h: 8, minW: 6, minH: 5 },
    { i: 'r-10', x: 0,  y: 12, w: 8,  h: 8, minW: 4, minH: 5 },
    { i: 'r-11', x: 0,  y: 20, w: 6,  h: 8, minW: 3, minH: 5 },
    { i: 'r-12', x: 6,  y: 20, w: 6,  h: 8, minW: 3, minH: 5 },
    { i: 'r-13', x: 0,  y: 28, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'r-14', x: 0,  y: 35, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'r-15', x: 0,  y: 42, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  md: [
    { i: 'r-1',  x: 0,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-2',  x: 3,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-3',  x: 6,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-4',  x: 9,  y: 0,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-5',  x: 0,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-6',  x: 3,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-7',  x: 6,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-8',  x: 9,  y: 2,  w: 3,  h: 2, minW: 2, minH: 2 },
    { i: 'r-9',  x: 0,  y: 4,  w: 12, h: 8, minW: 6, minH: 5 },
    { i: 'r-10', x: 0,  y: 12, w: 12, h: 8, minW: 4, minH: 5 },
    { i: 'r-11', x: 0,  y: 20, w: 6,  h: 8, minW: 3, minH: 5 },
    { i: 'r-12', x: 6,  y: 20, w: 6,  h: 8, minW: 3, minH: 5 },
    { i: 'r-13', x: 0,  y: 28, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'r-14', x: 0,  y: 35, w: 12, h: 7, minW: 6, minH: 4 },
    { i: 'r-15', x: 0,  y: 42, w: 12, h: 7, minW: 6, minH: 4 },
  ],
  sm: [
    { i: 'r-1',  x: 0, y: 0,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'r-2',  x: 3, y: 0,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'r-3',  x: 0, y: 2,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'r-4',  x: 3, y: 2,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'r-5',  x: 0, y: 4,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'r-6',  x: 3, y: 4,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'r-7',  x: 0, y: 6,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'r-8',  x: 3, y: 6,  w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'r-9',  x: 0, y: 8,  w: 6, h: 8, minW: 3, minH: 5 },
    { i: 'r-10', x: 0, y: 16, w: 6, h: 8, minW: 3, minH: 5 },
    { i: 'r-11', x: 0, y: 24, w: 6, h: 8, minW: 3, minH: 5 },
    { i: 'r-12', x: 0, y: 32, w: 6, h: 8, minW: 3, minH: 5 },
    { i: 'r-13', x: 0, y: 40, w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'r-14', x: 0, y: 47, w: 6, h: 7, minW: 3, minH: 4 },
    { i: 'r-15', x: 0, y: 54, w: 6, h: 7, minW: 3, minH: 4 },
  ],
};
