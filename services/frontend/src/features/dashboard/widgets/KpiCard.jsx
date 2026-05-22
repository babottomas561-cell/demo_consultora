import { DollarSign, Users, ShoppingCart, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useDashboardData } from '../useDashboardData';

const formatCurrency = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const formatDate = (iso) => {
  if (!iso) return 'Nunca';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  const t = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diff === 0) return `Hoy ${t}`;
  if (diff === 1) return `Ayer ${t}`;
  return `${d.toLocaleDateString('es-AR')} ${t}`;
};

const CONFIGS = {
  'ventas-mes': {
    title: 'Ventas del Mes',
    icon: DollarSign,
    getValue: (k) => formatCurrency(k?.total_ventas_mes || 0),
    color: 'indigo',
  },
  'clientes-activos': {
    title: 'Clientes Activos',
    icon: Users,
    getValue: (k) => k?.total_clientes?.toLocaleString('es-AR') || '0',
    color: 'indigo',
  },
  'transacciones': {
    title: 'Transacciones',
    icon: ShoppingCart,
    getValue: (k) => k?.total_transacciones?.toLocaleString('es-AR') || '0',
    color: 'indigo',
  },
  'variacion-mensual': {
    title: 'Variación Mensual',
    icon: TrendingUp,
    getValue: (k) => {
      const actual = k?.total_ventas_mes || 0;
      const anterior = k?.total_ventas_mes_anterior || 0;
      if (!anterior && !actual) return 'Sin datos';
      if (!anterior) return 'Nuevo';
      const pct = ((actual - anterior) / Math.abs(anterior)) * 100;
      if (!isFinite(pct)) return '—';
      return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    },
    getIcon: (k) => {
      const actual = k?.total_ventas_mes || 0;
      const anterior = k?.total_ventas_mes_anterior || 0;
      return actual >= anterior ? TrendingUp : TrendingDown;
    },
    getColor: (k) => {
      const actual = k?.total_ventas_mes || 0;
      const anterior = k?.total_ventas_mes_anterior || 0;
      return actual >= anterior ? 'green' : 'red';
    },
    color: 'green',
  },
  'ultimo-sync': {
    title: 'Última Sincronización',
    icon: Activity,
    getValue: (k) => formatDate(k?.ultimo_sync),
    color: 'indigo',
  },
};

const colorClasses = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', bar: 'bg-indigo-600', barMuted: 'bg-indigo-100' },
  green: { bg: 'bg-green-50', text: 'text-green-600', bar: 'bg-green-600', barMuted: 'bg-green-100' },
  red: { bg: 'bg-red-50', text: 'text-red-600', bar: 'bg-red-600', barMuted: 'bg-red-100' },
};

export default function KpiCard({ type }) {
  const { kpis, loading } = useDashboardData();
  const config = CONFIGS[type];
  if (!config) return null;

  const Icon = config.getIcon ? config.getIcon(kpis) : config.icon;
  const color = config.getColor ? config.getColor(kpis) : config.color;
  const c = colorClasses[color] || colorClasses.indigo;

  return (
    <div className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">{config.title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-200 animate-pulse rounded mt-2" />
          ) : (
            <h3 className="text-2xl font-bold tracking-[-0.02em] text-slate-900 tabular-nums truncate">
              {config.getValue(kpis)}
            </h3>
          )}
        </div>
        <div className={`rounded-[10px] ${c.bg} p-3 ${c.text} shrink-0`}>
          <Icon size={18} />
        </div>
      </div>
      <div className={`mt-auto h-1 w-full rounded-full ${c.barMuted}`}>
        <div className={`h-full rounded-full ${c.bar} opacity-60`} style={{ width: '65%' }} />
      </div>
    </div>
  );
}

KpiCard.types = Object.keys(CONFIGS);
