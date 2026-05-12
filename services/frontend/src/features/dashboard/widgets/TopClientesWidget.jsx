import { Loader2 } from 'lucide-react';
import { useDashboardData } from '../useDashboardData';

const fmt = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

export default function TopClientesWidget() {
  const { topClientes, loading } = useDashboardData();

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;

  if (!topClientes.length) return <p className="p-4 text-sm text-slate-400">Sin ventas este mes.</p>;

  return (
    <div className="h-full overflow-auto p-4 pt-0">
      <ul className="divide-y divide-slate-100">
        {topClientes.map((c, i) => (
          <li key={c.cliente_id} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-bold text-slate-400 w-4 shrink-0">{i + 1}.</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{c.cliente_nombre}</p>
                <p className="text-xs text-slate-500">{c.transacciones} compras</p>
              </div>
            </div>
            <span className="text-sm font-bold text-indigo-600 shrink-0 ml-2">{fmt(c.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
