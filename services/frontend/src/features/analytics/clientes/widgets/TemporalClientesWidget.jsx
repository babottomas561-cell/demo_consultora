import { useEffect } from 'react';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useClientesData } from '../ClientesDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const fmtPeriod = (v) => {
  if (!v) return '';
  const raw = String(v);
  const date = raw.length === 7 ? new Date(`${raw}-01T00:00:00`) : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return `${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
};

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export default function TemporalClientesWidget() {
  const { temporal, loadingTemporal, fetchTemporal } = useClientesData();

  useEffect(() => { fetchTemporal(); }, [fetchTemporal]);

  if (loadingTemporal) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={24} /></div>;
  }

  const series = temporal?.series ?? [];
  const chartData = series.map((s) => ({
    periodo: fmtPeriod(s.periodo),
    facturado: s.facturado,
    clientes_activos: s.clientes_activos,
    tickets: s.tickets,
  }));

  if (!chartData.length) {
    return <p className="p-4 text-sm text-slate-400">Sin datos temporales.</p>;
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden gap-1">
      {/* Facturación line chart */}
      <div className="flex-1 min-h-0 px-2 pt-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-2 mb-1">Facturación mensual</p>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [formatCurrency(v), 'Facturado neto']} />
            <Line type="monotone" dataKey="facturado" stroke="#4f46e5" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Clientes activos bar chart */}
      <div className="flex-1 min-h-0 px-2 pb-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-2 mb-1">Clientes activos por mes</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [formatNumber(v), 'Clientes activos']} />
            <Bar dataKey="clientes_activos" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
