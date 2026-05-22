import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import apiClient from '../../../../api/client';
import useAuthStore from '../../../../store/authStore';
import { useFilterStore } from '../../../../store/filterStore';
import { formatCurrencyShort } from '../../analyticsUtils';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs min-w-[140px]">
      <p className="font-semibold text-slate-700 mb-1">{d?.nombre}</p>
      <div className="space-y-0.5 text-slate-600">
        <div className="flex justify-between gap-3"><span>Facturado</span><span className="font-semibold tabular-nums text-slate-800">{formatCurrencyShort(d?.facturado)}</span></div>
        <div className="flex justify-between gap-3"><span>% total</span><span className="font-semibold tabular-nums">{d?.pct_total?.toFixed(1)}%</span></div>
        <div className="flex justify-between gap-3"><span>Tickets</span><span className="tabular-nums">{d?.tickets}</span></div>
      </div>
    </div>
  );
};

export default function ListaPieWidget() {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore = useFilterStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const p = new URLSearchParams();
        if (user?.is_admin && activeCompany) p.set('company_id', activeCompany.id);
        if (filterStore.desde) p.set('desde', filterStore.desde);
        if (filterStore.hasta) p.set('hasta', filterStore.hasta);
        const res = await apiClient.get(`/analytics/ventas/por-lista?${p.toString()}`);
        setData(res.data);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchData();
  }, [user, activeCompany, filterStore.desde, filterStore.hasta]);

  if (loading) return <div className="h-full flex items-center justify-center"><div className="animate-pulse text-slate-300 text-sm">Cargando...</div></div>;

  const listas = data?.por_lista ?? [];
  if (!listas.length) return <div className="p-4 text-sm text-slate-400">Sin datos de listas.</div>;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden px-2 pb-1">
      <div className="px-2 pt-2 pb-1 shrink-0">
        <span className="text-xs text-slate-500">Total: <span className="font-semibold text-slate-700">{formatCurrencyShort(data?.total_facturado)}</span></span>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={listas}
              dataKey="facturado"
              nameKey="nombre"
              cx="50%"
              cy="50%"
              innerRadius="30%"
              outerRadius="68%"
              paddingAngle={1.5}
              label={({ nombre, pct_total }) => pct_total >= 5 ? `${nombre?.length > 12 ? nombre.slice(0,12)+'…' : nombre} ${pct_total.toFixed(0)}%` : null}
              labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
            >
              {listas.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
