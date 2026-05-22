import { useEffect } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Inbox } from 'lucide-react';
import { useComprasData } from '../ComprasDataContext';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

export default function VariacionPreciosWidget() {
  const { precios, loadingPrecios, fetchPrecios } = useComprasData();

  useEffect(() => { fetchPrecios(); }, [fetchPrecios]);

  if (loadingPrecios) {
    return <ChartSkeleton />;
  }

  const rows = Array.isArray(precios) ? precios : [];
  if (!rows.length) return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-400">
      <Inbox size={24} />
      <p className="text-sm">Sin variaciones de precio en el período.</p>
    </div>
  );

  const alertas = rows.filter((r) => Number(r.variacion_pct ?? 0) > 30);
  const top = rows.slice(0, 14);

  return (
    <div className="h-full w-full p-4 flex flex-col">
      {alertas.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 mb-3 text-xs font-medium text-red-700">
          <AlertTriangle size={14} />
          {alertas.length} producto{alertas.length !== 1 ? 's' : ''} subió más del 30%
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-700 mb-2">Variación de precios por producto</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ left: 8, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tickFormatter={fmtPct} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="nombre" width={130} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v) => [fmtPct(v), 'Variación']} />
            <Bar dataKey="variacion_pct" fill="#dc2626" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
