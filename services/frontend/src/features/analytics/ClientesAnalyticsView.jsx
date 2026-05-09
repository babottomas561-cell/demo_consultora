import AnalyticsPage from './AnalyticsPage';
import { formatCurrency, formatNumber } from './analyticsUtils';

const ClientesAnalyticsView = () => (
  <AnalyticsPage
    title="Panel Clientes / Cta Cte"
    description="Facturación, cobros y saldos pendientes por cliente."
    endpoint="/analytics/clientes/resumen"
    buildView={(data, { KpiCard, DataTable, DonutChart, Badge }) => {
      const ageing = data.ageing || {};
      const donutData = [
        { name: 'Corriente (a vencer)', value: ageing.corriente || 0, color: '#16a34a' },
        { name: 'Vencido 0-30 días', value: ageing.vencido_0_30 || 0, color: '#eab308' },
        { name: 'Vencido 31-60 días', value: ageing.vencido_31_60 || 0, color: '#f97316' },
        { name: 'Vencido 61-90 días', value: ageing.vencido_61_90 || 0, color: '#ef4444' },
        { name: 'Vencido +90 días', value: ageing.vencido_90_plus || 0, color: '#991b1b' },
      ].filter(d => d.value > 0);

      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard label="Clientes con movimiento" value={formatNumber(data.summary?.clientes_con_movimiento)} />
            <KpiCard label="Facturado" value={formatCurrency(data.summary?.facturado)} />
            <KpiCard label="Cobrado" value={formatCurrency(data.summary?.cobrado)} tone="success" />
            <KpiCard label="Saldo pendiente" value={formatCurrency(data.summary?.saldo_total)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiCard label="Vencido" value={formatCurrency(data.summary?.vencido)} tone="danger" />
            <KpiCard label="A vencer" value={formatCurrency(data.summary?.a_vencer)} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DonutChart data={donutData} title="Aging de Deuda Clientes" />
            <DataTable
              title="Mayores saldos clientes"
              rows={data.top_saldos}
              columns={[
                { key: 'cliente_nombre', label: 'Cliente' },
                { key: 'saldo', label: 'Saldo', render: (row) => formatCurrency(row.saldo) },
                { key: 'ultimo_movimiento', label: 'Último mov.', render: (row) => row.ultimo_movimiento?.slice(0, 10) || '-' },
                { key: 'estado', label: 'Estado', render: (row) =>
                  row.estado === 'vencido'
                    ? <Badge text="Vencido" tone="danger" />
                    : <Badge text="Al día" tone="success" />
                },
              ]}
            />
          </div>
        </>
      );
    }}
  />
);

export default ClientesAnalyticsView;
