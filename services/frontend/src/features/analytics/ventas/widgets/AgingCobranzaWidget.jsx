import { useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';
import { formatCurrencyShort } from '../../analyticsUtils';

const BUCKET_COLORS = {
  'vigente':  '#22c55e',
  '0_30':     '#f59e0b',
  '31_60':    '#f97316',
  '61_90':    '#ef4444',
  '90_mas':   '#991b1b',
};

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Saldo</span>
        <span className="font-semibold tabular-nums">{fmtM(payload[0]?.value)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-slate-500">Comprobantes</span>
        <span className="font-semibold tabular-nums">{payload[0]?.payload?.cantidad ?? 0}</span>
      </div>
    </div>
  );
};

export default function AgingCobranzaWidget() {
  const { aging, loadingAging, fetchAging } = useVentasData();

  useEffect(() => { fetchAging(); }, [fetchAging]);

  if (loadingAging) return <ChartSkeleton />;

  const buckets = aging?.buckets ?? [];
  const topDeudores = aging?.top_deudores ?? [];
  const totalPendiente = aging?.total_pendiente ?? 0;

  if (!buckets.length) return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-center p-4">
      <span className="text-3xl">✓</span>
      <p className="text-sm font-medium text-slate-700">Sin saldos pendientes</p>
      <p className="text-xs text-slate-400">No hay deuda registrada en cuentas corrientes.</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col px-3 py-2 gap-2">
      {/* Nota aclaratoria */}
      <p className="text-[9px] text-slate-400 shrink-0 -mb-1">
        Snapshot al día de hoy — independiente del período filtrado
      </p>
      {/* KPI */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 flex-1">
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Total pendiente</p>
          <p className="text-lg font-bold text-red-700 tabular-nums">{formatCurrencyShort(totalPendiente)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 flex-1">
          <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">Vigente / No vencido</p>
          <p className="text-lg font-bold text-emerald-700 tabular-nums">{formatCurrencyShort(aging?.total_vigente ?? 0)}</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="shrink-0" style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtM} width={44} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" radius={[3, 3, 0, 0]}>
              {buckets.map((b) => <Cell key={b.bucket} fill={BUCKET_COLORS[b.bucket] ?? '#94a3b8'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top deudores */}
      {topDeudores.length > 0 && (
        <div className="flex-1 overflow-auto min-h-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Top deudores</p>
          <div className="space-y-1">
            {topDeudores.slice(0, 5).map((d, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                <p className="text-xs text-slate-700 truncate flex-1">{d.nombre ?? d.cliente_id}</p>
                <p className="text-xs font-semibold text-red-600 tabular-nums shrink-0">{fmtM(d.saldo)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
