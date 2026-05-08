import AnalyticsPage from './AnalyticsPage';
import { formatCurrency, formatNumber } from './analyticsUtils';

const VentasAnalyticsView = () => (
  <AnalyticsPage
    title="Panel Ventas"
    description="Ingresos, unidades vendidas, clientes activos y productos con mayor facturación."
    endpoint="/analytics/ventas/resumen"
    buildView={(data, { KpiCard, DataTable, SeriesChart }) => (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="Ventas" value={formatCurrency(data.summary?.total_ventas)} />
          <KpiCard label="Unidades" value={formatNumber(data.summary?.unidades)} />
          <KpiCard label="Transacciones" value={formatNumber(data.summary?.transacciones)} />
          <KpiCard label="Clientes" value={formatNumber(data.summary?.clientes)} />
        </div>
        <SeriesChart data={data.series} bars={[{ key: 'total', label: 'Ventas', color: '#4f46e5' }]} />
        <DataTable
          title="Top productos"
          rows={data.top_productos}
          columns={[
            { key: 'producto_nombre', label: 'Producto' },
            { key: 'unidades', label: 'Unidades', render: (row) => formatNumber(row.unidades) },
            { key: 'total', label: 'Total', render: (row) => formatCurrency(row.total) },
          ]}
        />
      </>
    )}
  />
);

export default VentasAnalyticsView;
