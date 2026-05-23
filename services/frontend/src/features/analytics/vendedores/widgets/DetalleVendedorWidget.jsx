import { useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useVendedoresData } from '../VendedoresDataContext';
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

function MiniTable({ title, rows, columns, rowKey }) {
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{title}</h3>
      </div>
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 text-left font-semibold text-slate-400 whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {(rows ?? []).map((row, i) => (
            <tr key={row[rowKey] ?? i} className="hover:bg-slate-50">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-1.5 text-slate-700">
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
          {!(rows?.length) && (
            <tr><td colSpan={columns.length} className="px-3 py-3 text-slate-400">Sin datos</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function DetalleVendedorWidget() {
  const { ranking, detalle, loadingDetalle, fetchDetalle } = useVendedoresData();
  const [selected, setSelected] = useState('');

  const vendedores = ranking?.vendedores ?? [];

  const handleSelect = (e) => {
    const cod = e.target.value;
    setSelected(cod);
    if (cod) fetchDetalle(Number(cod));
  };

  const chartData = (detalle?.evolucion ?? []).map((e) => ({
    periodo: fmtPeriod(e.periodo),
    facturado: e.facturado,
  }));

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Vendedor selector */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
        <label className="text-sm font-medium text-slate-700 shrink-0">Vendedor:</label>
        <select
          value={selected}
          onChange={handleSelect}
          className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Seleccionar vendedor...</option>
          {vendedores.map((v) => (
            <option key={v.cod_vendedor} value={v.cod_vendedor}>{v.nombre ?? `V${v.cod_vendedor}`}</option>
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
          Seleccioná un vendedor para ver el detalle.
        </div>
      )}

      {!loadingDetalle && selected && !detalle && (
        <p className="px-4 text-sm text-slate-400">Sin datos para este vendedor.</p>
      )}

      {!loadingDetalle && detalle && (
        <div className="flex-1 overflow-auto min-h-0 px-4 pb-4 space-y-4">
          {/* Vendor header card */}
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white shrink-0">
              {(detalle.vendedor?.nombre ?? '?')[0]}
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">{detalle.vendedor?.nombre}</p>
              {detalle.vendedor?.cuota_mensual > 0 && (
                <p className="text-xs text-slate-500">Cuota mensual: {formatCurrency(detalle.vendedor.cuota_mensual)}</p>
              )}
            </div>
          </div>

          {/* Evolution chart */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Evolución de facturación</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtM} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [formatCurrency(v), 'Facturado']} />
                  <Bar dataKey="facturado" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top clientes & productos */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <MiniTable
              title="Top 10 clientes"
              rows={detalle.top_clientes}
              rowKey="cliente_id"
              columns={[
                { key: 'nombre',    label: 'Cliente' },
                { key: 'facturado', label: 'Facturado', render: (r) => formatCurrency(r.facturado) },
                { key: 'tickets',   label: 'Tickets',   render: (r) => formatNumber(r.tickets) },
              ]}
            />
            <MiniTable
              title="Top 10 productos"
              rows={detalle.top_productos}
              rowKey="producto_id"
              columns={[
                { key: 'nombre',    label: 'Producto' },
                { key: 'facturado', label: 'Facturado', render: (r) => formatCurrency(r.facturado) },
                { key: 'unidades',  label: 'Unids.',    render: (r) => formatNumber(r.unidades) },
              ]}
            />
          </div>

          {/* Presupuestos pendientes */}
          {detalle.presupuestos_pendientes?.length > 0 && (
            <MiniTable
              title="Presupuestos pendientes"
              rows={detalle.presupuestos_pendientes}
              rowKey="id"
              columns={[
                { key: 'fecha',          label: 'Fecha'   },
                { key: 'cliente_nombre', label: 'Cliente' },
                { key: 'total',          label: 'Total',  render: (r) => formatCurrency(r.total) },
              ]}
            />
          )}
        </div>
      )}
    </div>
  );
}
