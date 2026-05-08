import AnalyticsPage from './AnalyticsPage';
import { formatCurrency, formatNumber } from './analyticsUtils';

const ClientesAnalyticsView = () => (
  <AnalyticsPage
    title="Panel Clientes / Cta Cte"
    description="Facturación, cobros y saldos pendientes por cliente."
    endpoint="/analytics/clientes/resumen"
    buildView={(data, { KpiCard, DataTable }) => (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="Clientes con movimiento" value={formatNumber(data.summary?.clientes_con_movimiento)} />
          <KpiCard label="Facturado" value={formatCurrency(data.summary?.facturado)} />
          <KpiCard label="Cobrado" value={formatCurrency(data.summary?.cobrado)} />
          <KpiCard label="Saldo" value={formatCurrency(data.summary?.saldo_total)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <KpiCard label="Vencido" value={formatCurrency(data.summary?.vencido)} tone="danger" />
          <KpiCard label="A vencer" value={formatCurrency(data.summary?.a_vencer)} />
        </div>
        <DataTable
          title="Mayores saldos clientes"
          rows={data.top_saldos}
          columns={[
            { key: 'cliente_nombre', label: 'Cliente' },
            { key: 'saldo', label: 'Saldo', render: (row) => formatCurrency(row.saldo) },
            { key: 'ultimo_movimiento', label: 'Último movimiento', render: (row) => row.ultimo_movimiento?.slice(0, 10) || '-' },
          ]}
        />
      </>
    )}
  />
);

export default ClientesAnalyticsView;
