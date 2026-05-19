import { useMemo } from 'react';
import {
  DollarSign, ShoppingCart, Users, TrendingUp, Package, PercentIcon,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle,
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
    id: 'tasa_conversion_presupuestos',
    label: 'Conv. Presup.',
    icon: CheckCircle,
    accent: '#0891b2',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    valueFmt: (v) => (v != null && !Number.isNaN(Number(v))) ? `${Number(v).toFixed(1)}%` : '—',
    sparkKey: null,
    getSeverity: (v) => v == null ? 'neutral' : v > 60 ? 'success' : v > 30 ? 'warning' : 'danger',
    tooltip: 'Presupuestos confirmados / emitidos en el período',
  },
  {
    id: 'dso_dias',
    label: 'Días de cobro',
    icon: Clock,
    accent: '#dc2626',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    valueFmt: (v) => (v != null && !Number.isNaN(Number(v))) ? `${Number(v).toFixed(0)} d` : '—',
    sparkKey: null,
    getSeverity: (v) => v == null ? 'neutral' : v > 60 ? 'danger' : v > 30 ? 'warning' : 'success',
    invertTrend: true,
  },
];

const KpiCard = ({ kpi, raw, sparkData, comparar }) => {
  const rawActual = raw?.actual ?? raw;
  const isNull = rawActual == null;
  const actual = isNull ? null : Number(rawActual);
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
      <p className="text-lg font-bold text-slate-900 tabular-nums leading-none truncate">{isNull ? '—' : kpi.valueFmt(actual)}</p>
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
    kpis, resultadoKpis, temporal, loadingKpis, comparar,
    clientes, vendedores, productos,
  } = useVentasData();

  const productosBajoCosto = resultadoKpis?.productos_bajo_costo?.actual ?? 0;
  const coberturaCosto = resultadoKpis?.cobertura_costo_pct ?? null;

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
      {productosBajoCosto > 0 && (
        <div className="shrink-0 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          <span className="text-base leading-none">⚠</span>
          <span>
            <strong>{productosBajoCosto} producto{productosBajoCosto !== 1 ? 's' : ''}</strong> {productosBajoCosto !== 1 ? 'se vendieron' : 'se vendió'} por debajo del costo en este período.
            {coberturaCosto != null && coberturaCosto < 60 && (
              <span className="ml-1 text-red-500">(solo {coberturaCosto}% de líneas tienen costo cargado — el margen puede estar subestimado)</span>
            )}
          </span>
        </div>
      )}
      <NarrativeInsight
        rules={VENTAS_RULES}
        context={narrativeCtx}
        maxInsights={3}
      />
    </div>
  );
}
