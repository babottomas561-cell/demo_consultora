import AnalyticsPage from './AnalyticsPage';
import { formatCurrency, formatNumber } from './analyticsUtils';

const VentasAnalyticsView = () => (
  <AnalyticsPage
    title="Panel Ventas"
    description="Ingresos, unidades vendidas, clientes activos y productos con mayor facturación."
    endpoint="/analytics/ventas/resumen"
    buildView={(data, { KpiCard, DataTable, SeriesChart, ProgressBar }) => (
      <>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <KpiCard label="Ventas" value={formatCurrency(data.summary?.total_ventas)} />
          <KpiCard label="Unidades" value={formatNumber(data.summary?.unidades)} />
          <KpiCard label="Transacciones" value={formatNumber(data.summary?.transacciones)} />
          <KpiCard label="Clientes" value={formatNumber(data.summary?.clientes)} />
          <KpiCard label="Ticket promedio" value={formatCurrency(data.summary?.ticket_promedio)} tone="success" />
        </div>
        <SeriesChart data={data.series} bars={[{ key: 'total', label: 'Ventas', color: '#4f46e5' }]} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DataTable
            title="Top productos"
            rows={data.top_productos}
            columns={[
              { key: 'producto_nombre', label: 'Producto' },
              { key: 'unidades', label: 'Unidades', render: (row) => formatNumber(row.unidades) },
              { key: 'total', label: 'Facturación', render: (row) => formatCurrency(row.total) },
              { key: 'porcentaje', label: '% del total', render: (row) => <ProgressBar value={row.porcentaje} max={100} /> },
            ]}
          />
          <DataTable
            title="Top clientes"
            rows={data.top_clientes}
            columns={[
              { key: 'cliente_nombre', label: 'Cliente' },
              { key: 'transacciones', label: 'Transacciones', render: (row) => formatNumber(row.transacciones) },
              { key: 'facturacion', label: 'Facturación', render: (row) => formatCurrency(row.facturacion) },
              { key: 'ticket_promedio', label: 'Ticket prom.', render: (row) => formatCurrency(row.ticket_promedio) },
            ]}
          />
        </div>
      </>
    )}
  />
);

export default VentasAnalyticsView;
