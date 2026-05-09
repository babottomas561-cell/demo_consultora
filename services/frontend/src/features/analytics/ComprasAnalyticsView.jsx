import AnalyticsPage from './AnalyticsPage';
import { formatCurrency, formatNumber } from './analyticsUtils';

const ComprasAnalyticsView = () => (
  <AnalyticsPage
    title="Panel Compras"
    description="Volumen comprado, órdenes emitidas y proveedores con mayor peso en costos."
    endpoint="/analytics/compras/resumen"
    buildView={(data, { KpiCard, DataTable, SeriesChart, ProgressBar }) => (
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label="Compras" value={formatCurrency(data.summary?.total_compras)} sparklineData={data.series?.map((row) => row.total)} />
          <KpiCard label="Unidades" value={formatNumber(data.summary?.unidades)} />
          <KpiCard label="Órdenes" value={formatNumber(data.summary?.ordenes)} sparklineData={data.series?.map((row) => row.ordenes)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label="Proveedores" value={formatNumber(data.summary?.proveedores)} />
          <KpiCard label="Ratio compra/venta" value={`${data.summary?.ratio_compra_venta || 0}%`} tone="warning" subtitle="Compras como % de ventas" />
          <KpiCard label="Margen bruto estimado" value={`${data.summary?.margen_bruto || 0}%`} tone="success" subtitle="(Ventas - Compras) / Ventas" />
        </div>
        <SeriesChart data={data.series} bars={[{ key: 'total', label: 'Compras', color: '#0f766e' }]} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DataTable
            title="Top proveedores"
            rows={data.top_proveedores}
            columns={[
              { key: 'proveedor_nombre', label: 'Proveedor' },
              { key: 'ordenes', label: 'Órdenes', render: (row) => formatNumber(row.ordenes) },
              { key: 'total', label: 'Monto', render: (row) => formatCurrency(row.total) },
              { key: 'porcentaje', label: '% del total', render: (row) => <ProgressBar value={row.porcentaje} max={100} color="#0f766e" /> },
            ]}
          />
          <DataTable
            title="Productos más comprados"
            rows={data.top_productos}
            columns={[
              { key: 'producto_nombre', label: 'Producto' },
              { key: 'cantidad', label: 'Cantidad', render: (row) => formatNumber(row.cantidad) },
              { key: 'total', label: 'Monto total', render: (row) => formatCurrency(row.total) },
            ]}
          />
        </div>
      </>
    )}
  />
);

export default ComprasAnalyticsView;
