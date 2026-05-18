import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useComprasData } from '../ComprasDataContext';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtCurrency = (v) => {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
};

export default function ParetoComprasWidget() {
  const { productos, loadingProductos } = useComprasData();

  if (loadingProductos) {
    return <TableSkeleton />;
  }

  const rows = Array.isArray(productos?.productos) ? productos.productos : (Array.isArray(productos) ? productos : []);
  if (!rows.length) return <p className="p-4 text-sm text-slate-400">Sin datos de productos.</p>;

  const top = rows.slice(0, 12);

  return (
    <div className="h-full w-full p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Pareto de compras por producto</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ left: 8, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [fmtCurrency(v), 'Total comprado']} />
            <Bar dataKey="total_comprado" fill="#0f766e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
