import { Loader2, Users } from 'lucide-react';
import { useDashboardData } from '../useDashboardData';

const fmt = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const RANK_STYLES = [
  'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  'bg-orange-50 text-orange-600 ring-1 ring-orange-200',
];

export default function TopClientesWidget() {
  const { topClientes, loading } = useDashboardData();

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;

  if (!topClientes.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
        <Users size={24} />
        <p className="text-sm">Sin ventas en el período.</p>
      </div>
    );
  }

  const maxTotal = topClientes[0]?.total || 1;

  return (
    <div className="h-full overflow-auto p-4 pt-0">
      <ul className="space-y-1.5">
        {topClientes.map((c, i) => (
          <li key={c.cliente_id} className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 ${RANK_STYLES[i] || 'bg-slate-50 text-slate-500'}`}>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 truncate">{c.cliente_nombre}</p>
                <span className="text-sm font-bold text-indigo-600 tabular-nums shrink-0">{fmt(c.total)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full opacity-60 transition-all" style={{ width: `${(c.total / maxTotal) * 100}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">{c.transacciones} ops</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
