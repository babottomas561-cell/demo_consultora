import { useEffect } from 'react';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import DataTable from '../../../../components/analytics/DataTable';
import { formatCurrency, formatNumber } from '../../analyticsUtils';
import { useVentasData } from '../VentasDataContext';

const columns = [
  { key: 'fecha', label: 'Fecha', render: (r) => { const d = r.fecha?.slice(0, 10); return d ? d.split('-').reverse().join('/') : '-'; } },
  { key: 'tipo_comprobante', label: 'Tipo' },
  { key: 'tipo_factura', label: 'Letra' },
  { key: 'punto_de_venta', label: 'Pto.Vta' },
  { key: 'cliente_nombre', label: 'Cliente' },
  { key: 'producto_nombre', label: 'Producto' },
  { key: 'cantidad', label: 'Cant.', align: 'right', render: (r) => formatNumber(r.cantidad) },
  { key: 'neto', label: 'Neto', align: 'right', render: (r) => formatCurrency(r.neto) },
  { key: 'total', label: 'Total', align: 'right', render: (r) => formatCurrency(r.total) },
  { key: 'anulada', label: 'Anul.', render: (r) => r.anulada === 'S' ? <span className="text-red-500 font-bold text-xs">S</span> : null },
];

export default function TransaccionesWidget() {
  const { transacciones: data, loadingTransacciones, fetchTransacciones } = useVentasData();

  // Re-fetch whenever filters change (fetchTransacciones changes when qs changes)
  useEffect(() => { fetchTransacciones(1); }, [fetchTransacciones]);

  if (loadingTransacciones) {
    return <TableSkeleton />;
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const pages = data?.pages ?? 1;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between text-xs text-slate-500 px-4 pt-2 pb-1.5 shrink-0">
        <span className="font-medium text-slate-600">{formatNumber(total)} transacciones</span>
        {pages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchTransacciones(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors min-w-[36px] text-center"
            >
              ‹
            </button>
            <span className="px-1">{page} / {pages}</span>
            <button
              onClick={() => fetchTransacciones(page + 1)}
              disabled={page >= pages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors min-w-[36px] text-center"
            >
              ›
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto min-h-0 px-4 pb-2">
        <DataTable title="Transacciones" columns={columns} rows={rows} loading={false} exportFilename="transacciones_ventas" />
      </div>
    </div>
  );
}
