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

  useEffect(() => { if (!data) fetchTransacciones(1); }, []);

  if (loadingTransacciones) {
    return <TableSkeleton />;
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const pages = data?.pages ?? 1;

  return (
    <div className="h-full overflow-auto p-4 pt-0">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span>{formatNumber(total)} transacciones</span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => fetchTransacciones(page - 1)} disabled={page <= 1} className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40">‹</button>
            <span>Pág. {page} / {pages}</span>
            <button onClick={() => fetchTransacciones(page + 1)} disabled={page >= pages} className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40">›</button>
          </div>
        )}
      </div>
      <DataTable title="Transacciones" columns={columns} rows={rows} loading={false} exportFilename="transacciones_ventas" />
    </div>
  );
}
