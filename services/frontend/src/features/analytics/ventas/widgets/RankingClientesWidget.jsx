import { useEffect } from 'react';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import DataTable from '../../../../components/analytics/DataTable';
import { formatCurrency, formatNumber } from '../../analyticsUtils';
import { useVentasData } from '../VentasDataContext';

const SEGMENTO_COLORS = { A: '#4f46e5', B: '#f59e0b', C: '#94a3b8' };
const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const columns = [
  { key: 'cliente_nombre', label: 'Cliente' },
  { key: 'segmento', label: 'Seg.', render: (r) => (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: SEGMENTO_COLORS[r.segmento] ?? '#94a3b8' }}>{r.segmento ?? '-'}</span>
  ) },
  { key: 'facturado_neto', label: 'Facturado', align: 'right', render: (r) => formatCurrency(r.facturado_neto) },
  { key: 'tickets', label: 'Tickets', align: 'right', render: (r) => formatNumber(r.tickets) },
  { key: 'ticket_promedio', label: 'Ticket prom.', align: 'right', render: (r) => formatCurrency(r.ticket_promedio) },
  { key: 'margen_pct', label: 'Margen%', align: 'right', render: (r) => (
    <span className={Number(r.margen_pct) > 30 ? 'text-emerald-600 font-semibold' : ''}>{fmtPct(r.margen_pct)}</span>
  ) },
  { key: 'dias_sin_comprar', label: 'Días inact.', align: 'right', render: (r) => (
    <span className={Number(r.dias_sin_comprar) > 60 ? 'text-red-500 font-semibold' : 'text-slate-600'}>
      {r.dias_sin_comprar ?? '-'}
    </span>
  ) },
  { key: 'es_nuevo', label: 'Nuevo', render: (r) => r.es_nuevo
    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Nuevo</span>
    : null
  },
];

export default function RankingClientesWidget() {
  const { clientes: data, loadingClientes, fetchClientes } = useVentasData();

  // Re-fetch when filters change (fetchClientes changes when qs changes)
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
