import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';
import { formatCurrencyShort } from '../../analyticsUtils';

const fmt = (v) => formatCurrencyShort(v ?? 0);

const AGING_COLS = [
  { key: 'corriente',     label: 'Corriente', color: 'text-emerald-600 bg-emerald-50' },
  { key: 'vencido_0_30',  label: '0-30d',     color: 'text-amber-600 bg-amber-50'    },
  { key: 'vencido_31_60', label: '31-60d',    color: 'text-orange-600 bg-orange-50'  },
  { key: 'vencido_61_90', label: '61-90d',    color: 'text-red-500 bg-red-50'        },
  { key: 'vencido_90_plus',label: '+90d',     color: 'text-red-700 bg-red-100'       },
];

function AgingChip({ value, color }) {
  if (!value || value <= 0) return <span className="text-slate-300">—</span>;
  return (
    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${color} tabular-nums`}>
      {fmt(value)}
    </span>
  );
}

export default function CuentaCorrienteProveedoresWidget() {
  const [sortKey, setSortKey] = useState('saldo_total');
  const [sortAsc, setSortAsc] = useState(false);

  const { data, loading, error } = useInfomanagerFetch('proveedores/cuenta-corriente', () => ({
    solo_con_saldo: 'true',
    limit: 200,
  }));

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 p-4 animate-pulse">
        <div className="h-12 rounded bg-slate-100" />
        {[...Array(6)].map((_, i) => <div key={i} className="h-8 rounded bg-slate-50" />)}
      </div>
    );
  }

  if (error || !data?.proveedores?.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 p-4">
        <Clock size={28} />
        <p className="text-sm">{error || 'Sin facturas pendientes de proveedores'}</p>
      </div>
    );
  }

  const proveedores = [...data.proveedores].sort((a, b) => {
    const diff = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
    return sortAsc ? diff : -diff;
  });

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return null;
    return sortAsc ? <ChevronUp size={10} className="inline" /> : <ChevronDown size={10} className="inline" />;
  };

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden">
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-slate-500 uppercase font-medium">Proveedores</p>
          <p className="text-lg font-bold text-slate-800">{data.total_proveedores}</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-amber-600 uppercase font-medium">Deuda Total</p>
          <p className="text-lg font-bold text-amber-700">{fmt(data.total_deuda)}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-red-500 uppercase font-medium">Vencido</p>
          <p className="text-lg font-bold text-red-600">{fmt(data.total_vencido)}</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
            <tr>
              <th className="text-left py-2 text-slate-500 font-medium">Proveedor</th>
              {AGING_COLS.map(col => (
                <th key={col.key} className="text-right py-2 text-slate-500 font-medium cursor-pointer hover:text-slate-700 whitespace-nowrap"
                  onClick={() => toggleSort(col.key)}>
                  {col.label} <SortIcon k={col.key} />
                </th>
              ))}
              <th className="text-right py-2 text-slate-700 font-semibold cursor-pointer hover:text-slate-900 whitespace-nowrap"
                onClick={() => toggleSort('saldo_total')}>
                Total <SortIcon k="saldo_total" />
              </th>
              <th className="text-right py-2 text-slate-500 font-medium">Próx. Vto.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {proveedores.map((p) => (
              <tr key={p.cod_proveedor} className="hover:bg-slate-50">
                <td className="py-2 font-medium text-slate-700 max-w-[160px]">
                  <span className="truncate block">{p.nombre}</span>
                  <span className="text-[9px] text-slate-400">{p.facturas_pendientes} fact.</span>
                </td>
                {AGING_COLS.map(col => (
                  <td key={col.key} className="py-2 text-right">
                    <AgingChip value={p[col.key]} color={col.color} />
                  </td>
                ))}
                <td className="py-2 text-right font-bold text-amber-700 tabular-nums">{fmt(p.saldo_total)}</td>
                <td className="py-2 text-right text-slate-400 whitespace-nowrap">
                  {p.proximo_vencimiento
                    ? new Date(p.proximo_vencimiento).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
