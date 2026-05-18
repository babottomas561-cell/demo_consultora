import { useEffect } from 'react';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import DataTable from '../../../../components/analytics/DataTable';
import { formatCurrency, formatNumber } from '../../analyticsUtils';
import { useVentasData } from '../VentasDataContext';

const SEGMENTO_COLORS = { A: '#4f46e5', B: '#eab308', C: '#94a3b8' };
const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const columns = [
  { key: 'cliente_nombre', label: 'Cliente' },
  { key: 'segmento', label: 'Seg.', render: (r) => (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: SEGMENTO_COLORS[r.segmento] }}>{r.segmento}</span>
  ) },
  { key: 'facturado_neto', label: 'Facturado', align: 'right', render: (r) => formatCurrency(r.facturado_neto) },
  { key: 'tickets', label: 'Tickets', align: 'right' },
  { key: 'ticket_promedio', label: 'Ticket prom.', align: 'right', render: (r) => formatCurrency(r.ticket_promedio) },
  { key: 'margen_pct', label: 'Margen%', align: 'right', render: (r) => fmtPct(r.margen_pct) },
  { key: 'dias_sin_comprar', label: 'Días inact.', align: 'right' },
  { key: 'es_nuevo', label: 'Nuevo', render: (r) => r.es_nuevo ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Nuevo</span> : null },
];

export default function RankingClientesWidget() {
  const { clientes: data, loadingClientes, fetchClientes } = useVentasData();

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  if (loadingClientes) {
    return <TableSkeleton />;
  }

  const list = data?.clientes ?? [];

  return (
    <div className="h-full overflow-auto p-4 pt-0">
      <DataTable title="Ranking de clientes" columns={columns} rows={list} loading={false} exportFilename="clientes" />
    </div>
  );
}
