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
          <KpiCard label="Ingresos caja" value={formatCurrency(data.summary?.ingresos)} tone="success" />
          <KpiCard label="Egresos caja" value={formatCurrency(data.summary?.egresos)} tone="danger" />
          <KpiCard label="Saldo neto" value={formatCurrency(data.summary?.saldo_neto)} />
          <KpiCard label="Movimientos" value={formatNumber(data.summary?.movimientos)} />
        </div>
        <SeriesChart
          data={data.series}
          bars={[
            { key: 'ingresos', label: 'Ingresos', color: '#16a34a' },
            { key: 'egresos', label: 'Egresos', color: '#dc2626' },
            { key: 'saldo_neto', label: 'Saldo neto', color: '#4f46e5' },
          ]}
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
