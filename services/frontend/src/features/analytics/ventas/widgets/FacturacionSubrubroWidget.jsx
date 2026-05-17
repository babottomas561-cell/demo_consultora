import { useState } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';
import ChartTooltip from '../../../../components/analytics/ChartTooltip';
import { useVentasData } from '../VentasDataContext';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const COLORS = ['#818cf8','#34d399','#fb923c','#f472b6','#60a5fa','#a78bfa','#facc15','#4ade80','#f87171','#38bdf8'];

export default function FacturacionSubrubroWidget() {
  const { productos, loadingProductos } = useVentasData();
  const [showAll, setShowAll] = useState(false);

  if (loadingProductos) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;
  }

  const all = productos?.por_subrubro ?? [];
  if (!all.length) return <p className="p-4 text-sm text-slate-400">Sin datos de subrubros para el período.</p>;

  const data = showAll ? all : all.slice(0, 15);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 p-4 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} />
            <YAxis
              type="category"
              dataKey="nombre"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              width={100}
              tickFormatter={(v) => v?.length > 16 ? v.slice(0, 16) + '…' : v}
            />
            <Tooltip content={<ChartTooltip format="currency" extraFields={[{ key: 'pct_total', label: '% del total', suffix: '%' }, { key: 'rubro_nombre', label: 'Rubro' }]} />} />
            <Bar dataKey="facturado" name="Facturado" radius={[0, 3, 3, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {all.length > 15 && (
        <div className="shrink-0 border-t border-slate-100 px-4 py-2 text-center">
          <button
            onClick={() => setShowAll(v => !v)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            {showAll ? `Mostrar top 15` : `Ver los ${all.length} subrubros`}
          </button>
        </div>
      )}
    </div>
  );
}
