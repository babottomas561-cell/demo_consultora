import AnalyticsPage from './AnalyticsPage';
import { formatCurrency, formatNumber } from './analyticsUtils';

const ComprasAnalyticsView = () => (
  <AnalyticsPage
    title="Panel Compras"
    description="Volumen comprado, órdenes emitidas y proveedores con mayor peso en costos."
    endpoint="/analytics/compras/resumen"
    buildView={(data, { KpiCard, DataTable, SeriesChart }) => (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="Compras" value={formatCurrency(data.summary?.total_compras)} />
          <KpiCard label="Unidades" value={formatNumber(data.summary?.unidades)} />
          <KpiCard label="Órdenes" value={formatNumber(data.summary?.ordenes)} />
          <KpiCard label="Proveedores" value={formatNumber(data.summary?.proveedores)} />
        </div>
        <SeriesChart data={data.series} bars={[{ key: 'total', label: 'Compras', color: '#0f766e' }]} />
        <DataTable
          title="Top proveedores"
          rows={data.top_proveedores}
          columns={[
            { key: 'proveedor_nombre', label: 'Proveedor' },
            { key: 'ordenes', label: 'Órdenes', render: (row) => formatNumber(row.ordenes) },
            { key: 'total', label: 'Total', render: (row) => formatCurrency(row.total) },
          ]}
        />
      </>
    )}
  />
);

export default ComprasAnalyticsView;
