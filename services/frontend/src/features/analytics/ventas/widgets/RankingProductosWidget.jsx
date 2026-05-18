import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import DataTable from '../../../../components/analytics/DataTable';
import { formatCurrency, formatNumber } from '../../analyticsUtils';
import { useVentasData } from '../VentasDataContext';

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const columns = [
  { key: 'nombre', label: 'Producto' },
  { key: 'unidades', label: 'Unid.', align: 'right', render: (r) => formatNumber(r.unidades) },
  { key: 'facturado', label: 'Facturado', align: 'right', render: (r) => formatCurrency(r.facturado) },
  { key: 'pct_total', label: '% Total', align: 'right', render: (r) => fmtPct(r.pct_total) },
  { key: 'margen_pct', label: 'Margen%', align: 'right', render: (r) => (
    <span className={r.margen_pct > 30 ? 'text-emerald-600 font-semibold' : 'text-slate-700'}>
      {fmtPct(r.margen_pct)}
    </span>
  ) },
  { key: 'tickets', label: 'Tickets', align: 'right', render: (r) => formatNumber(r.tickets) },
];

export default function RankingProductosWidget() {
  const { productos, loadingProductos } = useVentasData();

  if (loadingProductos) {
    return <TableSkeleton />;
  }

  const ranking = productos?.ranking ?? [];

  return (
    <div className="h-full overflow-auto p-4 pt-0">
      <DataTable title="Ranking de productos" columns={columns} rows={ranking} loading={false} exportFilename="productos" />
    </div>
  );
}
