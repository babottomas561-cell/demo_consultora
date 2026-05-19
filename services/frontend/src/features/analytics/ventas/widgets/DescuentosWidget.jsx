import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';
import { formatCurrencyShort } from '../../analyticsUtils';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const TABS = ['Vendedores', 'Productos', 'Top ops.'];

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#6366f1'];

export default function DescuentosWidget() {
  const { descuentos, loadingDescuentos, fetchDescuentos } = useVentasData();
  const [tab, setTab] = useState(0);

  useEffect(() => { fetchDescuentos(); }, [fetchDescuentos]);

  if (loadingDescuentos) return <ChartSkeleton />;

  if (!descuentos) return (
    <div className="h-full flex items-center justify-center text-sm text-slate-400">Sin datos</div>
  );

  const { total_descontado, pct_sobre_facturacion, por_vendedor = [], por_producto = [], mayores_descuentos = [] } = descuentos;

  return (
    <div className="h-full flex flex-col px-3 py-2 gap-2">
      {/* KPI header */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Total descontado</p>
          <p className="text-lg font-bold text-red-700 tabular-nums">{formatCurrencyShort(total_descontado)}</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide">% sobre facturación</p>
          <p className="text-lg font-bold text-amber-700 tabular-nums">{fmtPct(pct_sobre_facturacion)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 shrink-0">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${tab === i ? 'bg-red-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {tab === 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={por_vendedor.slice(0, 8)} layout="vertical" margin={{ left: 4, right: 48, top: 2, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtM} />
              <YAxis type="category" dataKey="nombre" axisLine={false} tickLine={false}
                tick={{ fill: '#475569', fontSize: 10 }} width={90} />
              <Tooltip formatter={(v, n) => n === 'Desc. prom.' ? fmtPct(v) : fmtM(v)}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="descuento_total" name="Descontado" radius={[0, 3, 3, 0]}>
                {por_vendedor.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {tab === 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={por_producto.slice(0, 8)} layout="vertical" margin={{ left: 4, right: 48, top: 2, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={fmtM} />
              <YAxis type="category" dataKey="nombre" axisLine={false} tickLine={false}
                tick={{ fill: '#475569', fontSize: 10 }} width={90} tickFormatter={(v) => String(v ?? '').slice(0, 14)} />
              <Tooltip formatter={(v) => fmtM(v)}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="descuento_total" name="Descontado" fill="#f97316" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {tab === 2 && (
          <div className="overflow-auto h-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-1.5 px-2 text-slate-400 font-medium">Cliente</th>
                  <th className="text-left py-1.5 px-2 text-slate-400 font-medium">Producto</th>
                  <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Desc%</th>
                  <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Importe</th>
                </tr>
              </thead>
              <tbody>
                {mayores_descuentos.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-1.5 px-2 text-slate-700 max-w-[100px] truncate">{r.cliente ?? '—'}</td>
                    <td className="py-1.5 px-2 text-slate-500 max-w-[100px] truncate">{r.producto ?? '—'}</td>
                    <td className="py-1.5 px-2 text-right font-semibold text-red-600">{fmtPct(r.descuento_pct)}</td>
                    <td className="py-1.5 px-2 text-right font-semibold text-slate-800 tabular-nums">{fmtM(r.descuento_dolares)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
