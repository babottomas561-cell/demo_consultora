import { useState } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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

function marginColor(pct) {
  if (pct >= 40) return '#22c55e';
  if (pct >= 25) return '#84cc16';
  if (pct >= 15) return '#f59e0b';
  if (pct > 0)   return '#f97316';
  return '#94a3b8';
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1.5 truncate max-w-[200px]">{label}</p>
      <div className="space-y-1 text-slate-600">
        <div className="flex justify-between gap-4">
          <span>Facturado</span>
          <span className="font-semibold tabular-nums text-slate-800">{formatCurrencyShort(d?.facturado)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>% del total</span>
          <span className="font-semibold tabular-nums">{fmtPct(d?.pct_total)}</span>
        </div>
        {d?.margen_pct != null && (
          <div className="flex justify-between gap-4">
            <span>Margen bruto</span>
            <span className={`font-semibold tabular-nums ${d.margen_pct >= 25 ? 'text-emerald-600' : d.margen_pct >= 15 ? 'text-amber-600' : 'text-red-500'}`}>
              {fmtPct(d.margen_pct)}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span>Tickets</span>
          <span className="font-semibold tabular-nums">{d?.tickets}</span>
        </div>
      </div>
    </div>
  );
};

export default function FacturacionRubroWidget() {
  const { productos, loadingProductos } = useVentasData();
  const [showTable, setShowTable] = useState(false);

  if (loadingProductos) {
    return <ChartSkeleton />;
  }

  const rubros = productos?.por_rubro?.length
    ? productos.por_rubro
    : (productos?.por_subrubro ?? []);
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
                {['Rubro', 'Facturado', '% total', 'Margen%', 'Tickets'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rubros.map((r, i) => (
                <tr key={r.cod_rubro ?? i} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800 max-w-[200px] truncate">{r.nombre}</td>
                  <td className="px-3 py-2 tabular-nums text-right text-slate-700">{formatCurrencyShort(r.facturado)}</td>
                  <td className="px-3 py-2 tabular-nums text-right text-slate-500">{fmtPct(r.pct_total)}</td>
                  <td className="px-3 py-2 tabular-nums text-right">
                    <span className={`font-semibold ${r.margen_pct >= 25 ? 'text-emerald-600' : r.margen_pct >= 15 ? 'text-amber-600' : r.margen_pct > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {r.margen_pct != null ? fmtPct(r.margen_pct) : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-right text-slate-500">{r.tickets}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 min-h-0 px-2 pb-1 flex flex-col">
          <div className="flex-1 min-h-0">
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
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="facturado" name="Facturado" radius={[0, 3, 3, 0]} label={{ position: 'right', formatter: fmtM, fontSize: 9, fill: '#94a3b8' }}>
                  {rubros.map((r, i) => (
                    <Cell key={i} fill={r.margen_pct != null ? marginColor(r.margen_pct) : '#818cf8'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-3 shrink-0 pb-1 text-[9px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 shrink-0" />≥40%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-lime-500 shrink-0" />25-40%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 shrink-0" />15-25%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-400 shrink-0" />{'<15%'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
