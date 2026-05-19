import { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { X, Package, DollarSign, TrendingUp, Percent } from 'lucide-react';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;
const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

function ProductoDetail({ product, onClose }) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 line-clamp-2">{product.producto}</h2>
            {product.producto_id && <p className="text-xs text-slate-400 mt-0.5">Código {product.producto_id}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 shrink-0">
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          {[
            { icon: DollarSign, label: 'Facturado', value: formatCurrency(product.facturado), color: 'text-indigo-600' },
            { icon: Package, label: 'Unidades', value: formatNumber(product.unidades), color: 'text-teal-600' },
            { icon: TrendingUp, label: 'Margen', value: fmtPct(product.margen_pct), color: product.margen_pct > 30 ? 'text-emerald-600' : product.margen_pct > 10 ? 'text-amber-600' : 'text-red-500' },
            { icon: Percent, label: '% del total', value: fmtPct(product.pct_total), color: 'text-violet-600' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className={color} />
                <p className="text-[10px] font-medium text-slate-500">{label}</p>
              </div>
              <p className={`text-sm font-bold tabular-nums ${color}`}>{value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CustomDot = (props) => {
  const { cx, cy, payload, selectedId, onClick } = props;
  const isSelected = selectedId === payload.producto_id;
  const isIn80 = (payload.acumulado_pct ?? 100) <= 80;
  const r = Math.max(4, Math.min(16, Math.sqrt(payload.facturado / 50000)));
  return (
    <circle
      cx={cx} cy={cy} r={isSelected ? r + 3 : r}
      fill={isIn80 ? '#4f46e5' : '#cbd5e1'}
      fillOpacity={isSelected ? 1 : 0.75}
      stroke={isSelected ? '#312e81' : 'none'}
      strokeWidth={2}
      style={{ cursor: 'pointer' }}
      onClick={() => onClick(payload)}
    />
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1 truncate max-w-[180px]">{d.producto}</p>
      <div className="space-y-0.5 text-slate-500">
        <div className="flex justify-between gap-3"><span>Unidades</span><span className="font-semibold tabular-nums text-slate-800">{formatNumber(d.unidades)}</span></div>
        <div className="flex justify-between gap-3"><span>Margen%</span><span className={`font-semibold tabular-nums ${d.margen_pct > 20 ? 'text-emerald-600' : 'text-amber-600'}`}>{fmtPct(d.margen_pct)}</span></div>
        <div className="flex justify-between gap-3"><span>Facturado</span><span className="font-semibold tabular-nums text-slate-800">{fmtM(d.facturado)}</span></div>
      </div>
    </div>
  );
};

export default function ScatterPortafolioWidget() {
  const { productos, loadingProductos } = useVentasData();
  const [selected, setSelected] = useState(null);

  if (loadingProductos) return <TableSkeleton />;

  const ranking = productos?.ranking ?? [];
  if (!ranking.length) return <p className="p-4 text-sm text-slate-400">Sin datos de productos.</p>;

  const data = ranking
    .filter(r => Number(r.unidades) > 0)
    .map(r => ({
      ...r,
      producto: r.nombre ?? r.producto_id,
      x: Number(r.unidades),
      y: Number(r.margen_pct ?? 0),
    }));

  const avgMargen = data.reduce((a, d) => a + d.y, 0) / (data.length || 1);
  const avgUnidades = data.reduce((a, d) => a + d.x, 0) / (data.length || 1);

  // Contar productos por cuadrante para labels informativos
  const quadrants = data.reduce((acc, d) => {
    if (d.y >= avgMargen && d.x >= avgUnidades) acc.stars++;
    else if (d.y >= avgMargen && d.x < avgUnidades) acc.niche++;
    else if (d.y < avgMargen && d.x >= avgUnidades) acc.cows++;
    else acc.dogs++;
    return acc;
  }, { stars: 0, niche: 0, cows: 0, dogs: 0 });

  return (
    <>
      <div className="h-full flex flex-col px-2 py-2">
        <div className="flex items-center gap-3 mb-1 shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />Top 80% Pareto
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0 ml-2" />Resto
          </div>
          <p className="text-[10px] text-slate-400 ml-auto">Clic en un punto para ver detalle</p>
        </div>
        <div className="flex-1 min-h-0 relative">
          {/* Etiquetas de cuadrantes BCG — sutiles, en esquinas */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <span className="absolute top-1 right-3 text-[9px] font-semibold text-emerald-600/70" title="Alto volumen + alto margen">
              ★ Estrellas <span className="text-slate-400 font-normal">({quadrants.stars})</span>
            </span>
            <span className="absolute top-1 left-12 text-[9px] font-semibold text-violet-600/70" title="Bajo volumen + alto margen">
              ◆ Nicho <span className="text-slate-400 font-normal">({quadrants.niche})</span>
            </span>
            <span className="absolute bottom-7 right-3 text-[9px] font-semibold text-indigo-600/70" title="Alto volumen + bajo margen">
              ● Vacas <span className="text-slate-400 font-normal">({quadrants.cows})</span>
            </span>
            <span className="absolute bottom-7 left-12 text-[9px] font-semibold text-slate-500/70" title="Bajo volumen + bajo margen">
              ▾ Perros <span className="text-slate-400 font-normal">({quadrants.dogs})</span>
            </span>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ left: 8, right: 8, top: 18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" dataKey="x" name="Unidades"
                axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }}
                label={{ value: 'Unidades vendidas →', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#94a3b8' }} />
              <YAxis type="number" dataKey="y" name="Margen%"
                axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={v => `${v}%`}
                label={{ value: 'Margen% →', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={avgMargen} stroke="#cbd5e1" strokeDasharray="4 2"
                label={{ value: `prom. ${avgMargen.toFixed(0)}%`, position: 'right', fontSize: 9, fill: '#94a3b8' }} />
              <ReferenceLine x={avgUnidades} stroke="#cbd5e1" strokeDasharray="4 2" />
              <Scatter
                data={data}
                shape={(props) => <CustomDot {...props} selectedId={selected?.producto_id} onClick={setSelected} />}
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      {selected && <ProductoDetail product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
