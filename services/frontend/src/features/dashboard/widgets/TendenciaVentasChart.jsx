import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useAnalyticsData } from '../useDashboardData';

const fmt = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export default function TendenciaVentasChart() {
  const { data, loading } = useAnalyticsData('/ventas/temporal');

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;

  const raw = data?.series || data;
  const series = (Array.isArray(raw) ? raw : []).map(s => ({
    periodo: s.periodo || s.mes || s.fecha,
    total: s.total || s.total_ventas || 0,
  }));

  if (!series.length) return <p className="p-4 text-sm text-slate-400">Sin datos de tendencia.</p>;

  return (
    <div className="h-full w-full p-4 pt-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series}>
          <defs>
            <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="periodo" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => { if (v >= 1e6) return `$${(v/1e6).toFixed(1)}M`; if (v >= 1e3) return `$${(v/1e3).toFixed(0)}K`; return `$${v}`; }} />
          <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
          <Area type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} fill="url(#gradientArea)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
