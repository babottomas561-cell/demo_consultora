import { useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
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

export default function DetalleClienteWidget() {
  const { ranking, detalle, loadingDetalle, fetchDetalle } = useClientesData();
  const [selected, setSelected] = useState('');

  const clientes = ranking?.clientes ?? [];

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelected(id);
    if (id) fetchDetalle(Number(id));
  };

  const chartData = (detalle?.evolucion ?? []).map((e) => ({
    periodo: fmtPeriod(e.periodo),
    facturado: e.facturado,
  }));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Selector */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
        <label className="text-sm font-medium text-slate-700 shrink-0">Cliente:</label>
        <select
          value={selected}
          onChange={handleSelect}
          className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Seleccionar cliente...</option>
          {clientes.map((c) => (
            <option key={c.cliente_id} value={c.cliente_id}>{c.nombre ?? `C${c.cliente_id}`}</option>
          ))}
        </select>
      </div>

      {loadingDetalle && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      )}

      {!loadingDetalle && !selected && (
        <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">
          Seleccioná un cliente para ver el detalle.
        </div>
      )}

      {!loadingDetalle && selected && !detalle && (
        <p className="px-4 text-sm text-slate-400">Sin datos para el período seleccionado.</p>
      )}

      {!loadingDetalle && detalle && (
        <div className="flex-1 overflow-auto min-h-0 px-4 pb-4 space-y-4">
          {/* Header card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white shrink-0">
                {(detalle.cliente?.nombre ?? '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-slate-900 truncate">{detalle.cliente?.nombre}</p>
                <p className="text-xs text-slate-500">Última compra: {detalle.cliente?.ultima_compra?.slice(0, 10) ?? '-'}</p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-[10px] text-slate-500">Facturado</p>
                  <p className="text-sm font-bold text-indigo-600">{formatCurrency(detalle.cliente?.facturado)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Tickets</p>
                  <p className="text-sm font-bold text-slate-900">{formatNumber(detalle.cliente?.tickets)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Saldo Cta Cte</p>
                  <p className={`text-sm font-bold ${(detalle.cliente?.saldo_cta_cte ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatCurrency(detalle.cliente?.saldo_cta_cte)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Evolution chart */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Evolución de compras</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtM} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [formatCurrency(v), 'Facturado']} />
                  <Bar dataKey="facturado" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top productos */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Top 10 productos comprados</h3>
            </div>
            <table className="min-w-full text-xs border-collapse">
              <thead>
                <tr>
                  {['Producto', 'Facturado', 'Unidades'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(detalle.top_productos ?? []).map((p, i) => (
                  <tr key={p.producto_id ?? i} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 font-medium text-slate-800 max-w-[200px] truncate">{p.nombre}</td>
                    <td className="px-3 py-1.5 tabular-nums text-right text-slate-700">{formatCurrency(p.facturado)}</td>
                    <td className="px-3 py-1.5 tabular-nums text-right text-slate-600">{formatNumber(p.unidades)}</td>
                  </tr>
                ))}
                {!(detalle.top_productos?.length) && (
                  <tr><td colSpan={3} className="px-3 py-3 text-slate-400">Sin productos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
