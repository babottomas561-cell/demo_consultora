import {
  CartesianGrid, Cell, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useCrossFilter } from '../../../../hooks/useCrossFilter';
import { useResultadoData } from '../ResultadoDataContext';
import { formatCurrency } from '../../analyticsUtils';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const QUAD_COLORS = { estrella: '#16a34a', diamante: '#4f46e5', vaca: '#eab308', perro: '#ef4444' };
const QUAD_LABELS = { estrella: '⭐ Estrellas', diamante: '💎 Diamantes', vaca: '🐄 Vacas', perro: '🐕 Perros' };

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-900 mb-1">{d.nombre}</p>
      <p>Facturado: {formatCurrency(d.facturado)}</p>
      <p>Margen $: {formatCurrency(d.margen_dolares)}</p>
      <p>Margen %: {fmtPct(d.y)}</p>
      <p className="mt-1 text-slate-500">{QUAD_LABELS[d.cuadrante]}</p>
    </div>
  );
};

export default function ProductosResultadoWidget() {
  const { productos, loadingProductos } = useResultadoData();
  const { applyFilter } = useCrossFilter();

  if (loadingProductos) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={24} /></div>;
  }

  const ranking = productos?.ranking ?? [];
  const medianas = productos?.medianas ?? { facturado: 0, margen_pct: 0 };
  const bajoCosto = ranking.filter((p) => p.margen_pct < 0);

  const scatterData = ranking.map((p) => ({
    x: Math.max(p.facturado, 1),
    y: p.margen_pct,
    z: Math.max(p.unidades, 10),
    nombre: p.nombre,
    cuadrante: p.cuadrante,
    margen_dolares: p.margen_dolares,
    facturado: p.facturado,
    producto_id: p.producto_id,
  }));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {bajoCosto.length > 0 && (
        <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800 font-medium shrink-0">
          ⚠️ {bajoCosto.length} producto{bajoCosto.length > 1 ? 's están' : ' está'} bajo el costo de compra
        </div>
      )}

      {/* Scatter chart */}
      <div className="flex-1 min-h-0 px-2 pt-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-2 mb-1">Cuadrante: Facturación vs Margen %</p>
        <ResponsiveContainer width="100%" height="70%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="x" type="number" scale="log" domain={['auto', 'auto']} tickFormatter={fmtM} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="y" type="number" domain={['auto', 'auto']} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <ZAxis dataKey="z" type="number" range={[30, 300]} />
            <ReferenceLine x={medianas.facturado} stroke="#94a3b8" strokeDasharray="4 4" />
            <ReferenceLine y={medianas.margen_pct} stroke="#94a3b8" strokeDasharray="4 4" />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={scatterData} isAnimationActive={false}
              onClick={(d) => applyFilter('producto_id', [d.producto_id])}>
              {scatterData.map((d, i) => (
                <Cell key={i} fill={QUAD_COLORS[d.cuadrante] ?? '#94a3b8'} fillOpacity={0.7} cursor="pointer" />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex justify-center gap-3 mt-1 text-[10px] font-medium flex-wrap">
          {Object.entries(QUAD_LABELS).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: QUAD_COLORS[k] }} />
              {v}
            </span>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="shrink-0 max-h-[35%] overflow-auto border-t border-slate-100">
        <table className="min-w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {['Producto', 'Cuadrante', 'Facturado', 'COGS', 'Margen $', 'Margen %'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ranking.map((p, i) => (
              <tr key={p.producto_id ?? i} className={`hover:bg-slate-50 ${p.margen_pct < 0 ? 'bg-red-50' : ''}`}>
                <td className="px-3 py-1.5 font-medium text-slate-800 max-w-[160px] truncate">{p.nombre}</td>
                <td className="px-3 py-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: (QUAD_COLORS[p.cuadrante] ?? '#94a3b8') + '18', color: QUAD_COLORS[p.cuadrante] ?? '#64748b' }}>
                    {QUAD_LABELS[p.cuadrante]?.split(' ')[0]} {p.cuadrante}
                  </span>
                </td>
                <td className="px-3 py-1.5 tabular-nums text-right text-slate-700">{formatCurrency(p.facturado)}</td>
                <td className="px-3 py-1.5 tabular-nums text-right text-slate-600">{formatCurrency(p.cogs)}</td>
                <td className={`px-3 py-1.5 tabular-nums text-right ${p.margen_pct < 0 ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{formatCurrency(p.margen_dolares)}</td>
                <td className={`px-3 py-1.5 tabular-nums text-right ${p.margen_pct < 0 ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{fmtPct(p.margen_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!ranking.length && <p className="p-4 text-sm text-slate-400">Sin datos de productos.</p>}
      </div>
    </div>
  );
}
