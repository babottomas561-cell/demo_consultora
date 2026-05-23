import { useEffect } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useResultadoData } from '../ResultadoDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

export default function VendedoresResultadoWidget() {
  const { vendedores, loadingVendedores, fetchVendedores } = useResultadoData();

  useEffect(() => { fetchVendedores(); }, [fetchVendedores]);

  if (loadingVendedores) {
    return <ChartSkeleton />;
  }

  const ranking = vendedores?.ranking ?? [];
  const avgDesc = ranking.length
    ? ranking.reduce((s, v) => s + (v.descuento_promedio_pct ?? 0), 0) / ranking.length
    : 0;
  const highDiscount = ranking.filter((v) => v.descuento_promedio_pct > avgDesc * 2);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {highDiscount.length > 0 && (
        <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 font-medium shrink-0">
          ⚠️ {highDiscount.map((v) => v.nombre).join(', ')} tiene{highDiscount.length > 1 ? 'n' : ''} descuento {'>'} 2× el promedio del equipo
        </div>
      )}

      {/* Horizontal bar: facturado vs margen */}
      <div className="flex-1 min-h-0 px-2 pt-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-2 mb-1">Facturación vs Margen</p>
        <ResponsiveContainer width="100%" height="45%">
          <BarChart data={ranking} layout="vertical" margin={{ top: 4, right: 24, left: 90, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="nombre" width={85} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [formatCurrency(v)]} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="facturado"      name="Facturado"  fill="#4f46e5" radius={[0, 3, 3, 0]} />
            <Bar dataKey="margen_dolares" name="Margen $"   fill="#16a34a" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-2 mb-1 mt-2">Descuento promedio %</p>
        <ResponsiveContainer width="100%" height="45%">
          <BarChart data={ranking} layout="vertical" margin={{ top: 4, right: 24, left: 90, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="nombre" width={85} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [fmtPct(v), 'Desc. %']} />
            <ReferenceLine x={avgDesc} stroke="#94a3b8" strokeDasharray="4 4" />
            <Bar dataKey="descuento_promedio_pct" name="Desc. %" isAnimationActive={false} radius={[0, 3, 3, 0]}>
              {ranking.map((v, i) => (
                <Cell key={i} fill={v.descuento_promedio_pct > 10 ? '#ef4444' : v.descuento_promedio_pct > 5 ? '#eab308' : '#16a34a'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="shrink-0 max-h-36 overflow-auto border-t border-slate-100">
        <table className="min-w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {['Vendedor', 'Facturado', 'COGS', 'Margen $', 'Margen %', 'Desc. Prom %', 'Tickets'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ranking.map((v, i) => (
              <tr key={v.cod_vendedor ?? i} className="hover:bg-slate-50">
                <td className="px-3 py-1.5 font-medium text-slate-800 max-w-[120px] truncate">{v.nombre}</td>
                <td className="px-3 py-1.5 tabular-nums text-right text-slate-700">{formatCurrency(v.facturado)}</td>
                <td className="px-3 py-1.5 tabular-nums text-right text-slate-600">{formatCurrency(v.cogs)}</td>
                <td className="px-3 py-1.5 tabular-nums text-right text-slate-700">{formatCurrency(v.margen_dolares)}</td>
                <td className="px-3 py-1.5 tabular-nums text-right text-slate-700">{fmtPct(v.margen_pct)}</td>
                <td className="px-3 py-1.5 tabular-nums text-right">
                  <span className={v.descuento_promedio_pct > 10 ? 'text-red-600 font-bold' : v.descuento_promedio_pct > 5 ? 'text-amber-600' : 'text-emerald-600'}>
                    {fmtPct(v.descuento_promedio_pct)}
                  </span>
                </td>
                <td className="px-3 py-1.5 tabular-nums text-right text-slate-600">{formatNumber(v.tickets)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!ranking.length && <p className="p-4 text-sm text-slate-400">Sin datos de vendedores.</p>}
      </div>
    </div>
  );
}
