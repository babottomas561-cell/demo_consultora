import { useEffect } from 'react';
import {
  CartesianGrid, Cell, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useResultadoData } from '../ResultadoDataContext';
import { formatCurrency } from '../../analyticsUtils';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-900 mb-1">{d.nombre}</p>
      <p>Facturado: {formatCurrency(d.facturado)}</p>
      <p>Margen $: {formatCurrency(d.margen_dolares)}</p>
      <p>Margen %: {fmtPct(d.y)}</p>
      <p>Desc. prom: {fmtPct(d.descuento_promedio_pct)}</p>
    </div>
  );
};

export default function ClientesResultadoWidget() {
  const { clientes, loadingClientes, fetchClientes } = useResultadoData();

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  if (loadingClientes) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={24} /></div>;
  }

  const ranking = clientes?.ranking ?? [];

  const sorted = [...ranking].sort((a, b) => a.facturado - b.facturado);
  const medFact = sorted.length ? sorted[Math.floor(sorted.length / 2)].facturado : 0;
  const medMarg = ranking.length
    ? [...ranking].sort((a, b) => a.margen_pct - b.margen_pct)[Math.floor(ranking.length / 2)].margen_pct
    : 0;

  const lowMarginHigh = ranking.filter((c) => c.facturado > medFact && c.margen_pct < medMarg);

  const scatterData = ranking.map((c) => ({
    x: Math.max(c.facturado, 1),
    y: c.margen_pct,
    nombre: c.cliente_nombre,
    facturado: c.facturado,
    margen_dolares: c.margen_dolares,
    descuento_promedio_pct: c.descuento_promedio_pct,
  }));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {lowMarginHigh.length > 0 && (
        <div className="mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 font-medium shrink-0">
          💡 {lowMarginHigh.length} cliente{lowMarginHigh.length > 1 ? 's tienen' : ' tiene'} alta facturación pero bajo margen
        </div>
      )}

      {/* Scatter chart */}
      <div className="flex-1 min-h-0 px-2 pt-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-2 mb-1">Clientes: Facturación vs Margen %</p>
        <ResponsiveContainer width="100%" height="60%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="x" type="number" scale="log" domain={['auto', 'auto']} tickFormatter={fmtM} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="y" type="number" domain={['auto', 'auto']} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <ReferenceLine x={medFact} stroke="#94a3b8" strokeDasharray="4 4" />
            <ReferenceLine y={medMarg} stroke="#94a3b8" strokeDasharray="4 4" />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={scatterData} fill="#4f46e5" fillOpacity={0.6} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="shrink-0 max-h-[35%] overflow-auto border-t border-slate-100">
        <table className="min-w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {['Cliente', 'Facturado', 'COGS', 'Margen $', 'Margen %', 'Desc. Prom %'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ranking.map((c, i) => (
              <tr key={c.cliente_id ?? i} className="hover:bg-slate-50">
                <td className="px-3 py-1.5 font-medium text-slate-800 max-w-[160px] truncate">{c.cliente_nombre}</td>
                <td className="px-3 py-1.5 tabular-nums text-right text-slate-700">{formatCurrency(c.facturado)}</td>
                <td className="px-3 py-1.5 tabular-nums text-right text-slate-600">{formatCurrency(c.cogs)}</td>
                <td className="px-3 py-1.5 tabular-nums text-right text-slate-700">{formatCurrency(c.margen_dolares)}</td>
                <td className={`px-3 py-1.5 tabular-nums text-right ${c.margen_pct < 0 ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{fmtPct(c.margen_pct)}</td>
                <td className="px-3 py-1.5 tabular-nums text-right text-slate-600">{fmtPct(c.descuento_promedio_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!ranking.length && <p className="p-4 text-sm text-slate-400">Sin datos de clientes.</p>}
      </div>
    </div>
  );
}
