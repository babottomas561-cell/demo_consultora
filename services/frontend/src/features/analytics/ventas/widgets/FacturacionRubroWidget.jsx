import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';
import ChartTooltip from '../../../../components/analytics/ChartTooltip';
import { useVentasData } from '../VentasDataContext';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export default function FacturacionRubroWidget() {
  const { productos, loadingProductos } = useVentasData();

  if (loadingProductos) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;
  }

  const rubros = productos?.por_rubro ?? [];
  if (!rubros.length) return <p className="p-4 text-sm text-slate-400">Sin datos de rubros.</p>;

  const hasMargen = rubros.some((r) => r.margen_abs != null && r.margen_abs > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="border-b border-slate-100 px-3 py-2">Rubro</th>
              <th className="border-b border-slate-100 px-3 py-2 text-right">Facturado</th>
              {hasMargen && <th className="border-b border-slate-100 px-3 py-2 text-right">Margen $</th>}
              {hasMargen && <th className="border-b border-slate-100 px-3 py-2 text-right">Margen %</th>}
              <th className="border-b border-slate-100 px-3 py-2 text-right">% Total</th>
              <th className="border-b border-slate-100 px-3 py-2 text-right">Tickets</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rubros.map((r) => (
              <tr key={r.cod_rubro} className="hover:bg-slate-50">
                <td className="px-3 py-1.5 font-medium text-slate-700">{r.nombre}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-700">{fmtM(r.facturado)}</td>
                {hasMargen && (
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-green-700">{fmtM(r.margen_abs)}</td>
                )}
                {hasMargen && (
                  <td className={`whitespace-nowrap px-3 py-1.5 text-right font-semibold ${
                    r.margen_pct >= 30 ? 'text-green-600' : r.margen_pct >= 15 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {r.margen_pct != null ? `${r.margen_pct.toFixed(1)}%` : '-'}
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-500">{r.pct_total?.toFixed(1)}%</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-400">{r.tickets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="min-h-0 flex-1 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rubros} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} />
            <YAxis type="category" dataKey="nombre" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={80} />
            <Tooltip content={<ChartTooltip format="currency" />} />
            {hasMargen && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
            <Bar dataKey="facturado" name="Facturado" fill="#818cf8" radius={[0, 3, 3, 0]} />
            {hasMargen && <Bar dataKey="margen_abs" name="Margen $" fill="#34d399" radius={[0, 3, 3, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
