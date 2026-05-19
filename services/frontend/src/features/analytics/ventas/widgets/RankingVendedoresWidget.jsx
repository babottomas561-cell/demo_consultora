import { BarChart, Bar, Cell, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1 truncate max-w-[180px]">{label}</p>
      <div className="space-y-0.5 text-slate-600">
        <div className="flex justify-between gap-4">
          <span>Facturado</span>
          <span className="font-semibold tabular-nums text-slate-800">{fmtM(d?.facturado_neto)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Tickets</span>
          <span className="font-semibold tabular-nums">{d?.tickets}</span>
        </div>
        {d?.margen_pct != null && (
          <div className="flex justify-between gap-4">
            <span>Margen</span>
            <span className={`font-semibold tabular-nums ${d.margen_pct >= 25 ? 'text-emerald-600' : d.margen_pct >= 15 ? 'text-amber-500' : 'text-red-500'}`}>
              {fmtPct(d.margen_pct)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function RankingVendedoresWidget() {
  const { vendedores: data, loadingVendedores } = useVentasData();

  if (loadingVendedores) {
    return <TableSkeleton />;
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
            <Tooltip content={<CustomTooltip />} />
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
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                {initials(v.nombre_vendedor)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">{v.nombre_vendedor}</p>
                <span className="text-[10px] font-bold text-slate-400">#{i + 1}</span>
              </div>
            </div>
            <p className="text-sm font-bold text-slate-900">{formatCurrency(v.facturado_neto)}</p>
            <p className="text-[10px] text-slate-400">{formatNumber(v.tickets)} tickets · {fmtPct(v.pct_del_total)}</p>
            {v.margen_pct != null && (
              <p className={`text-[10px] font-semibold mt-0.5 ${v.margen_pct >= 25 ? 'text-emerald-600' : v.margen_pct >= 15 ? 'text-amber-500' : 'text-red-500'}`}>
                Margen {fmtPct(v.margen_pct)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
