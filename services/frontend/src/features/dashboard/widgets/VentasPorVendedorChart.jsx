import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useAnalyticsData } from '../useDashboardData';

const COLORS = ['#4f46e5', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#ec4899'];

const fmt = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export default function VentasPorVendedorChart() {
  const { data, loading } = useAnalyticsData('/ventas/por-vendedor');

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;

  const raw = data?.vendedores || data;
  const items = (Array.isArray(raw) ? raw : []).slice(0, 8).map(v => ({
    name: v.nombre || v.vendedor || `Vendedor ${v.cod_vendedor}`,
    value: v.total || v.total_ventas || 0,
  }));

  if (!items.length) return <p className="p-4 text-sm text-slate-400">Sin datos de vendedores.</p>;

  return (
    <div className="h-full w-full p-2">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={items} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius="70%" innerRadius="40%" paddingAngle={2}>
            {items.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
