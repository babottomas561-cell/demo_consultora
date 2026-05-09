import AnalyticsPage from './AnalyticsPage';
import { formatCurrency, formatNumber } from './analyticsUtils';

const CajaAnalyticsView = () => (
  <AnalyticsPage
    title="Panel Flujo de Caja"
    description="Ingresos, egresos, saldo neto y últimos movimientos de caja."
    endpoint="/analytics/caja/resumen"
    buildView={(data, { KpiCard, DataTable, SeriesChart }) => (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="Cobros" value={formatCurrency(data.summary?.ingresos)} tone="success" />
          <KpiCard label="Pagos" value={formatCurrency(data.summary?.egresos)} tone="danger" />
          <KpiCard label="Saldo neto" value={formatCurrency(data.summary?.saldo_neto)} tone={(data.summary?.saldo_neto || 0) >= 0 ? 'success' : 'danger'} />
          <KpiCard label="Movimientos" value={formatNumber(data.summary?.movimientos)} />
        </div>
        <SeriesChart
          title="Flujo de Caja Mensual"
          data={data.series}
          bars={[
            { key: 'cobros', label: 'Cobros', color: '#16a34a' },
            { key: 'pagos', label: 'Pagos', color: '#dc2626' },
          ]}
          lines={[
            { key: 'saldo_acumulado', label: 'Saldo acumulado', color: '#4f46e5', yAxisId: 'right' },
          ]}
          yAxisRight
        />
        <DataTable
          title="Últimos movimientos"
          rows={data.ultimos_movimientos}
          columns={[
            { key: 'fecha', label: 'Fecha', render: (row) => row.fecha?.slice(0, 10) || '-' },
            { key: 'tipo', label: 'Tipo' },
            { key: 'descripcion', label: 'Descripción' },
            { key: 'importe', label: 'Importe', render: (row) => formatCurrency(row.importe) },
            { key: 'saldo_acumulado', label: 'Saldo', render: (row) => formatCurrency(row.saldo_acumulado) },
          ]}
        />
      </>
    )}
  />
);

export default CajaAnalyticsView;
