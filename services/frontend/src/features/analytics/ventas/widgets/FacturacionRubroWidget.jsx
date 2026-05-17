import { useState } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';
import ChartTooltip from '../../../../components/analytics/ChartTooltip';
import { useVentasData } from '../VentasDataContext';
import { formatCurrencyShort } from '../../analyticsUtils';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const COLORS = ['#818cf8','#34d399','#fb923c','#f472b6','#60a5fa','#a78bfa','#facc15','#4ade80','#f87171','#38bdf8'];

export default function FacturacionRubroWidget() {
  const { productos, loadingProductos } = useVentasData();
  const [showTable, setShowTable] = useState(false);

  if (loadingProductos) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;
  }

  const rubros = productos?.por_rubro ?? [];
  if (!rubros.length) return <p className="p-4 text-sm text-slate-400">Sin datos de rubros.</p>;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-end px-4 pt-2 pb-1 shrink-0">
        <button
          onClick={() => setShowTable(v => !v)}
          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
        >
          {showTable ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      </div>

      {showTable ? (
        <div className="flex-1 overflow-auto min-h-0 px-3 pb-3">
          <table className="min-w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                {['Rubro', 'Facturado', '% total', 'Tickets'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rubros.map((r, i) => (
                <tr key={r.cod_rubro ?? i} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800 max-w-[200px] truncate">{r.nombre}</td>
                  <td className="px-3 py-2 tabular-nums text-right text-slate-700">{formatCurrencyShort(r.facturado)}</td>
                  <td className="px-3 py-2 tabular-nums text-right text-slate-500">{Number(r.pct_total ?? 0).toFixed(1)}%</td>
                  <td className="px-3 py-2 tabular-nums text-right text-slate-500">{r.tickets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 min-h-0 px-2 pb-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rubros} layout="vertical" margin={{ left: 4, right: 40, top: 2, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} />
              <YAxis
                type="category"
                dataKey="nombre"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 10 }}
                width={110}
                tickFormatter={(v) => v?.length > 18 ? v.slice(0, 18) + '…' : v}
              />
              <Tooltip content={<ChartTooltip format="currency" extraFields={[{ key: 'pct_total', label: '% del total', suffix: '%' }]} />} />
              <Bar dataKey="facturado" name="Facturado" radius={[0, 3, 3, 0]} label={{ position: 'right', formatter: fmtM, fontSize: 9, fill: '#94a3b8' }}>
                {rubros.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
