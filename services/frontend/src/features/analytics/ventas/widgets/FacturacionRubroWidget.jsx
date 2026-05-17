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

export default function FacturacionRubroWidget() {
  const { productos, loadingProductos } = useVentasData();

  if (loadingProductos) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;
  }

  const rubros = productos?.por_rubro ?? [];
  if (!rubros.length) return <p className="p-4 text-sm text-slate-400">Sin datos de rubros.</p>;

  return (
    <div className="h-full w-full p-4 pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rubros} layout="vertical" margin={{ left: 0, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} />
          <YAxis
            type="category"
            dataKey="nombre"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10 }}
            width={90}
            tickFormatter={(v) => v?.length > 14 ? v.slice(0, 14) + '…' : v}
          />
          <Tooltip content={<ChartTooltip format="currency" extraFields={[{ key: 'pct_total', label: '% del total', suffix: '%' }]} />} />
          <Bar dataKey="facturado" name="Facturado" radius={[0, 3, 3, 0]}>
            {rubros.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
