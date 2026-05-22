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
    getSubtitle: (k) => k?.referencia_label || null,
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
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', accent: 'border-indigo-500' },
  green:  { bg: 'bg-emerald-50', text: 'text-emerald-600', accent: 'border-emerald-500' },
  red:    { bg: 'bg-red-50', text: 'text-red-600', accent: 'border-red-500' },
};

export default function KpiCard({ type }) {
  const { kpis, loading } = useDashboardData();
  const config = CONFIGS[type];
  if (!config) return null;

  const Icon = config.getIcon ? config.getIcon(kpis) : config.icon;
  const color = config.getColor ? config.getColor(kpis) : config.color;
  const c = colorClasses[color] || colorClasses.indigo;
  const subtitle = config.getSubtitle ? config.getSubtitle(kpis) : null;

  return (
    <div className={`flex h-full flex-col justify-center p-5 border-l-[3px] ${c.accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{config.title}</p>
          {loading ? (
            <div className="space-y-2 mt-1">
              <div className="h-7 w-24 bg-slate-200 animate-pulse rounded" />
              <div className="h-2 w-16 bg-slate-100 animate-pulse rounded" />
            </div>
          ) : (
            <>
              <h3 className="text-2xl font-bold tracking-[-0.02em] text-slate-900 tabular-nums truncate leading-tight">
                {config.getValue(kpis)}
              </h3>
              {subtitle && <p className="text-[10px] text-slate-400 mt-1 capitalize">{subtitle}</p>}
            </>
          )}
        </div>
        <div className={`rounded-xl ${c.bg} p-2.5 ${c.text} shrink-0`}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

KpiCard.types = Object.keys(CONFIGS);
