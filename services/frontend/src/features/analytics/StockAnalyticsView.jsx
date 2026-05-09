import AnalyticsPage from './AnalyticsPage';
import { formatCurrency, formatNumber } from './analyticsUtils';

const StockAnalyticsView = () => (
  <AnalyticsPage
    title="Panel Stock"
    description="Stock estimado por producto basado en compras y ventas registradas."
    endpoint="/analytics/stock/resumen"
    buildView={(data, { KpiCard, DataTable, Badge }) => (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="Total artículos" value={formatNumber(data.total_articulos)} />
          <KpiCard label="Con stock" value={formatNumber(data.articulos_con_stock)} tone="success" />
          <KpiCard label="Sin stock" value={formatNumber(data.articulos_sin_stock)} tone="danger" />
          <KpiCard label="Valor inventario est." value={formatCurrency(data.valor_inventario_estimado)} />
        </div>
        <DataTable
          title="Stock por producto"
          rows={data.stock_por_producto}
          columns={[
            { key: 'producto_nombre', label: 'Producto' },
            { key: 'unidades_compradas', label: 'Compradas', render: (row) => formatNumber(row.unidades_compradas) },
            { key: 'unidades_vendidas', label: 'Vendidas', render: (row) => formatNumber(row.unidades_vendidas) },
            { key: 'stock_estimado', label: 'Stock est.', render: (row) => (
              <span className={row.stock_estimado <= 0 ? 'text-red-600 font-bold' : row.stock_estimado < 20 ? 'text-amber-600 font-semibold' : 'text-slate-700'}>
                {formatNumber(row.stock_estimado)}
              </span>
            )},
            { key: 'valor_stock_estimado', label: 'Valor stock', render: (row) => formatCurrency(Math.max(row.valor_stock_estimado, 0)) },
            { key: 'estado', label: 'Estado', render: (row) =>
              row.estado === 'sin_stock' ? <Badge text="Sin stock" tone="danger" />
              : row.estado === 'bajo' ? <Badge text="Stock bajo" tone="warning" />
              : <Badge text="OK" tone="success" />
            },
          ]}
        />
      </>
    )}
  />
);

export default StockAnalyticsView;
