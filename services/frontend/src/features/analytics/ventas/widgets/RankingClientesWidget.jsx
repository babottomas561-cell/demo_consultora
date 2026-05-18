import { useEffect, useState } from 'react';
import { X, TrendingUp, ShoppingCart, Calendar, Percent, DollarSign } from 'lucide-react';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import DataTable from '../../../../components/analytics/DataTable';
import { formatCurrency, formatNumber } from '../../analyticsUtils';
import { useVentasData } from '../VentasDataContext';

const SEGMENTO_STYLES = {
  A: 'bg-indigo-600 text-white',
  B: 'bg-amber-400 text-white',
  C: 'bg-slate-300 text-slate-700',
};

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

// ── Cliente360 DrillModal ────────────────────────────────────────────────────
function Cliente360({ cliente, onClose }) {
  if (!cliente) return null;
  const seg = cliente.segmento ?? 'C';
  const stats = [
    { icon: DollarSign,  label: 'Facturado',       value: formatCurrency(cliente.facturado_neto),    color: 'text-indigo-600' },
    { icon: ShoppingCart, label: 'Tickets FA',      value: formatNumber(cliente.tickets),             color: 'text-cyan-600'   },
    { icon: DollarSign,  label: 'Ticket promedio',  value: formatCurrency(cliente.ticket_promedio),   color: 'text-violet-600' },
    { icon: Percent,     label: 'Margen bruto',     value: fmtPct(cliente.margen_pct),                color: 'text-emerald-600'},
    { icon: Calendar,    label: 'Días sin comprar', value: `${cliente.dias_sin_comprar ?? '—'} días`, color: cliente.dias_sin_comprar > 90 ? 'text-red-500' : 'text-amber-600' },
    { icon: TrendingUp,  label: 'Unidades',         value: formatNumber(cliente.unidades),            color: 'text-teal-600'   },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 ${SEGMENTO_STYLES[seg]}`}>{seg}</span>
              {cliente.es_nuevo && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Nuevo</span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 truncate">{cliente.cliente_nombre}</h2>
            <p className="text-xs text-slate-500">Código {cliente.cod_cliente}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 shrink-0">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className={s.color} />
                  <p className="text-[10px] font-medium text-slate-500 truncate">{s.label}</p>
                </div>
                <p className={`text-sm font-bold tabular-nums ${s.color}`}>{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* Insight footer */}
        <div className="px-4 pb-4">
          {cliente.dias_sin_comprar > 90 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              ⚠ Este cliente lleva <strong>{cliente.dias_sin_comprar} días</strong> sin comprar. Considerá una acción de recuperación.
            </div>
          )}
          {cliente.dias_sin_comprar <= 30 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
              ✓ Cliente activo — última compra hace <strong>{cliente.dias_sin_comprar} días</strong>.
            </div>
          )}
          {cliente.margen_pct != null && cliente.margen_pct < 10 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 mt-1.5">
              💸 Margen bajo ({fmtPct(cliente.margen_pct)}). Revisar condiciones comerciales.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main widget ─────────────────────────────────────────────────────────────
const columns = [
  {
    key: 'cliente_nombre',
    label: 'Cliente',
    render: (r) => (
      <span className="font-medium text-slate-800 truncate max-w-[180px] block">{r.cliente_nombre}</span>
    ),
  },
  {
    key: 'segmento',
    label: 'Seg.',
    render: (r) => (
      <span className={`inline-flex items-center justify-center rounded-full w-5 h-5 text-[10px] font-bold ${SEGMENTO_STYLES[r.segmento] ?? SEGMENTO_STYLES.C}`}>
        {r.segmento}
      </span>
    ),
  },
  { key: 'facturado_neto', label: 'Facturado',  align: 'right', render: (r) => formatCurrency(r.facturado_neto) },
  { key: 'tickets',        label: 'Tickets',    align: 'right' },
  { key: 'ticket_promedio',label: 'Ticket Ø',   align: 'right', render: (r) => formatCurrency(r.ticket_promedio) },
  { key: 'margen_pct',     label: 'Margen%',    align: 'right', render: (r) => (
    <span className={r.margen_pct < 10 ? 'text-red-600 font-semibold' : r.margen_pct >= 30 ? 'text-emerald-600 font-semibold' : ''}>
      {fmtPct(r.margen_pct)}
    </span>
  )},
  { key: 'dias_sin_comprar', label: 'Días inact.', align: 'right', render: (r) => (
    <span className={r.dias_sin_comprar > 90 ? 'text-red-500 font-semibold' : r.dias_sin_comprar > 60 ? 'text-amber-500' : 'text-slate-600'}>
      {r.dias_sin_comprar}
    </span>
  )},
  { key: 'es_nuevo', label: 'Nuevo', render: (r) =>
    r.es_nuevo ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Nuevo</span> : null,
  },
];

export default function RankingClientesWidget() {
  const { clientes: data, loadingClientes, fetchClientes } = useVentasData();
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  if (loadingClientes) return <TableSkeleton />;

  const list = data?.clientes ?? [];

  return (
    <>
      <div className="h-full overflow-auto p-4 pt-0">
        <DataTable
          title="Ranking de clientes"
          columns={columns}
          rows={list}
          loading={false}
          exportFilename="clientes"
          onRowClick={(row) => setSelected(row)}
          rowClassName="cursor-pointer hover:bg-indigo-50/50 transition-colors"
        />
        {list.length > 0 && (
          <p className="text-[10px] text-slate-400 text-center mt-2">
            Clic en una fila para ver el resumen del cliente
          </p>
        )}
      </div>
      {selected && <Cliente360 cliente={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
