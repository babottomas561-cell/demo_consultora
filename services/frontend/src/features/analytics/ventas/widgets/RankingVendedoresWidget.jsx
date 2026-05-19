import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import ChartTooltip from '../../../../components/analytics/ChartTooltip';
import { formatCurrency, formatNumber } from '../../analyticsUtils';
import { useVentasData } from '../VentasDataContext';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const COLORS = ['#4f46e5', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

const initials = (name) =>
  name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

// Progress bar for cuota achievement
function CuotaBar({ facturado, cuota }) {
  if (!cuota || cuota <= 0) return null;
  const pct = Math.min((facturado / cuota) * 100, 100);
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
        <span>Cuota</span>
        <span>{fmtPct(pct)}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-slate-100">
        <div className={`h-1 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function RankingVendedoresWidget() {
  const { vendedores: data, loadingVendedores } = useVentasData();

  if (loadingVendedores) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;
  }

  const list = data?.vendedores ?? [];
  if (!list.length) return <p className="p-4 text-sm text-slate-400">Sin datos de vendedores.</p>;

  return (
    <div className="h-full w-full p-4 pt-0 flex flex-col gap-3 overflow-auto">
      <div className="h-[200px] min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={list} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} />
            <YAxis type="category" dataKey="nombre_vendedor" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={100} />
            <Tooltip content={<ChartTooltip format="currency" />} />
            <Bar dataKey="facturado_neto" name="Facturado" radius={[0, 3, 3, 0]}>
              {list.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {list.map((v, i) => (
          <div key={v.cod_vendedor} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 shrink-0">
                {initials(v.nombre_vendedor)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">{v.nombre_vendedor}</p>
                <span className="text-[10px] font-bold text-slate-400">#{i + 1}</span>
              </div>
            </div>

            <p className="text-sm font-bold text-slate-900">{formatCurrency(v.facturado_neto)}</p>
            <p className="text-[10px] text-slate-400 mb-1">{formatNumber(v.tickets)} tickets · {fmtPct(v.pct_del_total)}</p>

            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
              <span className={`font-semibold ${v.margen_pct > 30 ? 'text-emerald-600' : v.margen_pct > 15 ? 'text-slate-600' : 'text-amber-600'}`}>
                Margen {fmtPct(v.margen_pct)}
              </span>
              {v.presupuestos_emitidos > 0 && (
                <span className="text-slate-400">
                  Conv. {fmtPct(v.tasa_conversion)}
                  <span className="text-slate-300"> ({v.presupuestos_confirmados}/{v.presupuestos_emitidos})</span>
                </span>
              )}
            </div>

            <CuotaBar facturado={v.facturado_neto} cuota={v.cuota_mensual} />
          </div>
        ))}
      </div>
    </div>
  );
}
