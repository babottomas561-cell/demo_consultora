import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Loader2, Package } from 'lucide-react';
import { useAnalyticsData } from '../useDashboardData';

const fmt = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export default function TopProductosChart() {
  const { data, loading } = useAnalyticsData('/ventas/productos');

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;

  const raw = data?.productos || data;
  const items = (Array.isArray(raw) ? raw : []).slice(0, 10).map(p => ({
    name: (p.producto || p.producto_nombre || p.descripcion || '').slice(0, 25),
    total: p.total || p.total_ventas || 0,
  }));

  if (!items.length) return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
      <Package size={24} />
      <p className="text-sm">Sin datos de productos.</p>
    </div>
  );

  return (
    <div className="h-full w-full p-4 pt-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={items} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" tickFormatter={(v) => { if (v >= 1e6) return `$${(v/1e6).toFixed(1)}M`; if (v >= 1e3) return `$${(v/1e3).toFixed(0)}K`; return `$${v}`; }} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
          <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
          <Bar dataKey="total" fill="#7c3aed" radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
