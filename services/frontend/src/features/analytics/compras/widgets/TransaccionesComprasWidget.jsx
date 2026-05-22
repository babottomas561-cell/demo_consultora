import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { useComprasData } from '../ComprasDataContext';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';

const fmtCurrency = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(v ?? 0));

const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('es-AR');
};

const fmtNumber = (v) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(Number(v ?? 0));

const COLS = [
  { key: 'fecha', label: 'Fecha', render: (r) => fmtDate(r.fecha) },
  { key: 'proveedor_nombre', label: 'Proveedor', render: (r) => r.proveedor_nombre || '-' },
  { key: 'producto_nombre', label: 'Producto', render: (r) => r.producto_nombre || '-' },
  { key: 'cantidad', label: 'Cant.', render: (r) => fmtNumber(r.cantidad) },
  { key: 'precio_unitario', label: 'P. Unit.', render: (r) => fmtCurrency(r.precio_unitario) },
  { key: 'total', label: 'Total', render: (r) => fmtCurrency(r.total) },
];

export default function TransaccionesComprasWidget() {
  const { transacciones, loadingTransacciones, fetchTransacciones } = useComprasData();
  const [page, setPage] = useState(1);

  useEffect(() => { fetchTransacciones(page); }, [fetchTransacciones, page]);

  if (loadingTransacciones) {
    return <TableSkeleton />;
  }

  const rows = transacciones?.data ?? [];
  const total = transacciones?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  if (!rows.length) return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-400">
      <Inbox size={24} />
      <p className="text-sm">Sin transacciones en el período.</p>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          Transacciones <span className="text-slate-400 font-normal">({fmtNumber(total)})</span>
        </h3>
        {totalPages > 1 && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30">
              <ChevronLeft size={14} />
            </button>
            <span>{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-slate-100 disabled:opacity-30">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={`tx-${i}`} className="hover:bg-slate-50">
                {COLS.map((c) => (
                  <td key={c.key} className="px-4 py-2 text-slate-700 whitespace-nowrap">{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
