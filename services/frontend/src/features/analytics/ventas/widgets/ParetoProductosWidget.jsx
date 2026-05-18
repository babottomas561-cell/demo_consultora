import { useState } from 'react';
import {
  ComposedChart, Bar, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell,
} from 'recharts';
import { X, TrendingUp, Package, DollarSign, Percent } from 'lucide-react';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

// ── Producto360 modal ────────────────────────────────────────────────────────
function Producto360({ product, pareto, onClose }) {
  if (!product) return null;
  const total = pareto.reduce((a, p) => a + (p.facturado ?? 0), 0);
  const rank = pareto.findIndex((p) => p.producto_id === product.producto_id) + 1;
  const isIn80 = (product.acumulado_pct ?? 0) <= 80;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-lg bg-indigo-600 text-white text-xs font-bold px-2 py-0.5">#{rank}</span>
              {isIn80 && <span className="rounded-lg bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5">80% Pareto</span>}
            </div>
            <h2 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">{product.producto}</h2>
            {product.producto_id && <p className="text-xs text-slate-400 mt-0.5">Código {product.producto_id}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 shrink-0">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 p-4">
          {[
            { icon: DollarSign, label: 'Facturado',    value: formatCurrency(product.facturado),          color: 'text-indigo-600' },
            { icon: Percent,    label: '% del total',  value: fmtPct(product.pct ?? ((product.facturado / total) * 100)), color: 'text-violet-600' },
            { icon: TrendingUp, label: '% acumulado',  value: fmtPct(product.acumulado_pct),              color: 'text-cyan-600' },
            { icon: Package,    label: 'Unidades',      value: formatNumber(product.unidades ?? product.cantidad), color: 'text-teal-600' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className={s.color} />
                  <p className="text-[10px] font-medium text-slate-500">{s.label}</p>
                </div>
                <p className={`text-sm font-bold tabular-nums ${s.color}`}>{s.value ?? '—'}</p>
              </div>
            );
          })}
        </div>

        {/* Contribution bar */}
        <div className="px-4 pb-4">
          <p className="text-[10px] text-slate-500 mb-1">Contribución acumulada al total</p>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(product.acumulado_pct ?? 0, 100)}%`,
                background: isIn80 ? '#4f46e5' : '#94a3b8',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>0%</span>
            <span className={isIn80 ? 'text-indigo-600 font-semibold' : ''}>{fmtPct(product.acumulado_pct)}</span>
            <span>100%</span>
          </div>
          {isIn80 && (
            <p className="text-[11px] text-indigo-700 font-medium mt-2 bg-indigo-50 rounded-lg px-3 py-1.5">
              ✓ Este producto está en el <strong>80% Pareto</strong> — clave para el negocio.
            </p>
          )}
          {!isIn80 && rank <= 20 && (
            <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 rounded-lg px-3 py-1.5">
              Está en el top 20 pero fuera del 80% core. Revisa si hay oportunidad de crecimiento.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main widget ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-1 truncate max-w-[180px]">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4 text-slate-600">
          <span>{p.name}</span>
          <span className="font-semibold tabular-nums">
            {p.dataKey === 'acumulado_pct' ? fmtPct(p.value) : fmtM(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ParetoProductosWidget() {
  const { productos, loadingProductos } = useVentasData();
  const [selected, setSelected] = useState(null);

  if (loadingProductos) return <TableSkeleton />;

  const pareto = productos?.pareto ?? [];
  if (!pareto.length) return <p className="p-4 text-sm text-slate-400">Sin datos de productos.</p>;

  const handleBarClick = (data) => {
    if (data?.activePayload?.[0]?.payload) {
      setSelected(data.activePayload[0].payload);
    }
  };

  return (
    <>
      <div className="h-full w-full p-4 pt-1 flex flex-col gap-1">
        <p className="text-[10px] text-slate-400 shrink-0">Clic en una barra para ver detalles del producto</p>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pareto} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="producto" axisLine={false} tickLine={false} tick={false} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="left" dataKey="facturado" name="Facturado" radius={[3, 3, 0, 0]}>
                {pareto.map((p, i) => (
                  <Cell
                    key={i}
                    fill={(p.acumulado_pct ?? 0) <= 80 ? '#4f46e5' : '#cbd5e1'}
                    fillOpacity={selected?.producto_id === p.producto_id ? 1 : 0.85}
                    stroke={selected?.producto_id === p.producto_id ? '#312e81' : 'none'}
                    strokeWidth={2}
                  />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="acumulado_pct" name="% Acum." stroke="#f97316" strokeWidth={2} dot={false} />
              <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '80%', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shrink-0" />Dentro del 80%</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300 shrink-0" />Fuera del 80%</span>
        </div>
      </div>
      {selected && <Producto360 product={selected} pareto={pareto} onClose={() => setSelected(null)} />}
    </>
  );
}
