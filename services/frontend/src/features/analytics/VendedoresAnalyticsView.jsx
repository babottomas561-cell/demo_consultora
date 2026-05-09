import AnalyticsPage from './AnalyticsPage';
import { formatCurrency, formatNumber } from './analyticsUtils';

const VendedoresAnalyticsView = () => (
  <AnalyticsPage
    title="Panel Vendedores"
    description="Ranking de vendedores por facturación, clientes y ticket promedio."
    endpoint="/analytics/vendedores/resumen"
    buildView={(data, { KpiCard, DataTable, ProgressBar }) => {
      const vendedores = data.vendedores || [];
      const maxFacturacion = Math.max(...vendedores.map(v => v.facturacion_total), 1);

      return (
        <>
          {/* Ranking visual */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-4">Ranking por Facturación</h3>
            <div className="space-y-4">
              {vendedores.map((v, i) => (
                <div key={v.vendedor_id} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300'}`}>
                    {i + 1}
                  </div>
                  <div className="w-40 truncate">
                    <p className="font-semibold text-slate-800">{v.vendedor_nombre}</p>
                    <p className="text-xs text-slate-400">{v.vendedor_id}</p>
                  </div>
                  <div className="flex-1">
                    <div className="bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                        style={{
                          width: `${(v.facturacion_total / maxFacturacion) * 100}%`,
                          backgroundColor: i === 0 ? '#4f46e5' : i === 1 ? '#6366f1' : i === 2 ? '#818cf8' : '#a5b4fc',
                        }}
                      >
                        <span className="text-xs font-bold text-white">{formatCurrency(v.facturacion_total)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-500 w-16 text-right">{v.porcentaje_del_total?.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cards individuales */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {vendedores.map((v) => (
              <div key={v.vendedor_id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <p className="text-sm font-bold text-slate-800">{v.vendedor_nombre}</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Clientes</span>
                    <span className="font-semibold">{v.clientes_atendidos}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transacciones</span>
                    <span className="font-semibold">{formatNumber(v.transacciones)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Facturación</span>
                    <span className="font-semibold text-indigo-600">{formatCurrency(v.facturacion_total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ticket prom.</span>
                    <span className="font-semibold">{formatCurrency(v.ticket_promedio)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla comparativa */}
          <DataTable
            title="Comparativa vendedores"
            rows={vendedores}
            columns={[
              { key: 'vendedor_nombre', label: 'Vendedor' },
              { key: 'clientes_atendidos', label: 'Clientes', render: (row) => formatNumber(row.clientes_atendidos) },
              { key: 'transacciones', label: 'Transacciones', render: (row) => formatNumber(row.transacciones) },
              { key: 'facturacion_total', label: 'Facturación', render: (row) => formatCurrency(row.facturacion_total) },
              { key: 'ticket_promedio', label: 'Ticket prom.', render: (row) => formatCurrency(row.ticket_promedio) },
              { key: 'porcentaje_del_total', label: '% Total', render: (row) => <ProgressBar value={row.porcentaje_del_total} max={100} /> },
            ]}
          />
        </>
      );
    }}
  />
);

export default VendedoresAnalyticsView;
