import { useMemo } from 'react';
import {
  DollarSign, ShoppingCart, Users, TrendingUp, Package, PercentIcon,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { useVentasData } from '../VentasDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';
import { Sparkline, NarrativeInsight } from '../../../../components/analytics';
import { VENTAS_RULES } from '../../../../lib/narrativeRules';

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const fmtShort = (v) => {
  const n = Number(v ?? 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

const KPIS = [
  {
    id: 'facturado_neto',
    label: 'Facturado Neto',
    icon: DollarSign,
    accent: '#4f46e5',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    valueFmt: fmtShort,
    sparkKey: 'facturado',
  },
  {
    id: 'ticket_promedio',
    label: 'Ticket Promedio',
    icon: ShoppingCart,
    accent: '#0891b2',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    valueFmt: formatCurrency,
    sparkKey: null,
  },
  {
    id: 'margen_bruto_pct',
    label: 'Margen Bruto',
    icon: PercentIcon,
    accent: '#059669',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    valueFmt: fmtPct,
    sparkKey: null,
  },
  {
    id: 'clientes_unicos',
    label: 'Clientes',
    icon: Users,
    accent: '#d97706',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    valueFmt: formatNumber,
    sparkKey: null,
  },
  {
    id: 'tickets',
    label: 'Tickets FA',
    icon: Package,
    accent: '#7c3aed',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    valueFmt: formatNumber,
    sparkKey: 'tickets',
  },
  {
    id: 'unidades',
    label: 'Unidades',
    icon: TrendingUp,
    accent: '#0d9488',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    valueFmt: formatNumber,
    sparkKey: null,
  },
];

const KpiCard = ({ kpi, raw, sparkData, comparar }) => {
  const actual = Number(raw?.actual ?? raw ?? 0);
  const anterior = raw?.anterior != null ? Number(raw.anterior) : null;

  let delta = null;
  if (comparar && anterior != null && anterior !== 0) {
    delta = ((actual - anterior) / Math.abs(anterior)) * 100;
  }

  const positive = delta != null ? delta >= 0 : null;
  const sparkValues = kpi.sparkKey ? sparkData[kpi.sparkKey] : null;
  const Icon = kpi.icon;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm hover:shadow-md transition-shadow min-w-0">
      <div className="flex items-center justify-between gap-1">
        <div className={`rounded-lg p-1.5 ${kpi.iconBg} shrink-0`}>
          <Icon size={13} className={kpi.iconColor} />
        </div>
        {delta != null && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5 shrink-0 ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
            {positive ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-[11px] font-medium text-slate-500 truncate leading-tight">{kpi.label}</p>
      <p className="text-lg font-bold text-slate-900 tabular-nums leading-none truncate">{kpi.valueFmt(actual)}</p>
      {sparkValues && sparkValues.length > 2 && (
        <div className="mt-0.5">
          <Sparkline
            data={sparkValues}
            width={120}
            height={22}
            stroke={kpi.accent}
            showArea
            showLastDot
            responsive
          />
        </div>
      )}
      {!sparkValues && anterior != null && comparar && (
        <p className="text-[10px] text-slate-400 tabular-nums leading-tight">
          ant: {kpi.valueFmt(anterior)}
        </p>
      )}
    </div>
  );
};

export default function PulseStripWidget() {
  const {
    kpis, temporal, loadingKpis, comparar,
    clientes, vendedores, productos,
  } = useVentasData();

  const sparkData = useMemo(() => {
    const series = temporal?.series ?? [];
    return {
      facturado: series.map((r) => Number(r.facturado ?? 0)),
      tickets: series.map((r) => Number(r.tickets ?? 0)),
    };
  }, [temporal]);

  const narrativeCtx = useMemo(() => ({
    kpis,
    clientesRanking: clientes?.clientes,
    rubrosRanking: productos?.por_rubro,
    productosRanking: productos?.ranking,
    vendedores: vendedores?.vendedores,
  }), [kpis, clientes, productos, vendedores]);

  if (loadingKpis) {
    return (
      <div className="h-full p-3 grid grid-cols-3 sm:grid-cols-6 gap-3">
        {KPIS.map((k) => (
          <div key={k.id} className="rounded-xl border border-slate-100 bg-white p-3 animate-pulse">
            <div className="h-7 w-7 rounded-lg bg-slate-200 mb-2" />
            <div className="h-2.5 w-16 rounded bg-slate-200 mb-2" />
            <div className="h-5 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 p-3 overflow-auto">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPIS.map((kpi) => (
          <KpiCard
            key={kpi.id}
            kpi={kpi}
            raw={kpis?.[kpi.id]}
            sparkData={sparkData}
            comparar={comparar}
          />
        ))}
      </div>
      <NarrativeInsight
        rules={VENTAS_RULES}
        context={narrativeCtx}
        maxInsights={3}
      />
    </div>
  );
}
