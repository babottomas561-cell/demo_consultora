import AnalyticsPage from './AnalyticsPage';
import { formatCurrency, formatNumber } from './analyticsUtils';

const ProveedoresAnalyticsView = () => (
  <AnalyticsPage
    title="Panel Proveedores / Cta Cte"
    description="Deuda comercial, pagos realizados y próximos vencimientos."
    endpoint="/analytics/proveedores/resumen"
    buildView={(data, { KpiCard, DataTable }) => (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="Proveedores con movimiento" value={formatNumber(data.summary?.proveedores_con_movimiento)} />
          <KpiCard label="Facturado" value={formatCurrency(data.summary?.facturado)} />
          <KpiCard label="Pagado" value={formatCurrency(data.summary?.pagado)} tone="success" />
          <KpiCard label="Saldo" value={formatCurrency(data.summary?.saldo_total)} tone="danger" />
        </div>
        <DataTable
          title="Mayores saldos proveedores"
          rows={data.top_saldos}
          columns={[
            { key: 'proveedor_nombre', label: 'Proveedor' },
            { key: 'saldo', label: 'Saldo', render: (row) => formatCurrency(row.saldo) },
            { key: 'ultimo_movimiento', label: 'Último movimiento', render: (row) => row.ultimo_movimiento?.slice(0, 10) || '-' },
          ]}
        />
        <DataTable
          title="Próximos vencimientos (30 días)"
          rows={data.proximos_vencimientos}
          columns={[
            { key: 'proveedor_nombre', label: 'Proveedor' },
            { key: 'comprobante_id', label: 'Comprobante' },
            { key: 'fecha_vencimiento', label: 'Vencimiento', render: (row) => row.fecha_vencimiento?.slice(0, 10) || '-' },
            { key: 'importe', label: 'Monto', render: (row) => formatCurrency(row.importe) },
          ]}
          emptyLabel="No hay vencimientos en los próximos 30 días."
        />
      </>
    )}
  />
);

export default ProveedoresAnalyticsView;
