import { ArrowRightLeft, Package } from 'lucide-react';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';

export default function InterDepositoWidget() {
  const { data, loading, error } = useInfomanagerFetch('stock/interdepositos-detalle', (f) => ({
    desde:  f.desde,
    hasta:  f.hasta,
    limit:  200,
  }));

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 p-4 animate-pulse">
        <div className="h-5 w-1/2 rounded bg-slate-200" />
        {[...Array(5)].map((_, i) => <div key={i} className="h-8 rounded bg-slate-100" />)}
      </div>
    );
  }

  if (error || !data?.total) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 p-4">
        <ArrowRightLeft size={28} />
        <p className="text-sm">{error || 'Sin movimientos entre depósitos en el período'}</p>
      </div>
    );
  }

  const movimientos   = data.movimientos  ?? [];
  const topArticulos  = data.top_articulos ?? [];

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRightLeft size={16} className="text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-800">Movimientos Interdeposito</h3>
        <span className="ml-auto text-xs text-slate-400">{data.total} mov.</span>
      </div>

      {topArticulos.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Top artículos transferidos
          </p>
          <div className="space-y-1">
            {topArticulos.slice(0, 5).map((a) => (
              <div key={a.cod_articulo} className="flex items-center gap-2 bg-indigo-50/60 rounded-lg px-2 py-1.5">
                <Package size={11} className="text-indigo-400 shrink-0" />
                <span className="text-xs text-slate-700 truncate flex-1">{a.descripcion || `Art. ${a.cod_articulo}`}</span>
                <span className="text-xs font-bold text-indigo-700 tabular-nums shrink-0">
                  {Number(a.cantidad_total).toFixed(0)} u.
                </span>
                <span className="text-[9px] text-slate-400">({a.movimientos})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white border-b border-slate-200">
            <tr>
              <th className="text-left py-1.5 text-slate-500 font-medium">Fecha</th>
              <th className="text-left py-1.5 text-slate-500 font-medium">Artículo</th>
              <th className="text-right py-1.5 text-slate-500 font-medium">Cant.</th>
              <th className="text-center py-1.5 text-slate-500 font-medium">Origen → Destino</th>
              <th className="text-left py-1.5 text-slate-500 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {movimientos.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="py-1.5 text-slate-500 whitespace-nowrap">
                  {m.fecha ? new Date(m.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '—'}
                </td>
                <td className="py-1.5 text-slate-700 max-w-[130px]">
                  <span className="truncate block">{m.descripcion || `Art. ${m.cod_articulo}`}</span>
                </td>
                <td className="py-1.5 text-right font-medium text-slate-800 tabular-nums">
                  {Number(m.cantidad).toFixed(2)}
                </td>
                <td className="py-1.5 text-center text-slate-500 whitespace-nowrap">
                  <span className="text-slate-400">{m.nombre_origen || m.deposito_origen || '?'}</span>
                  <span className="mx-1 text-indigo-400">→</span>
                  <span className="text-slate-600">{m.nombre_destino || m.deposito_destino || '?'}</span>
                </td>
                <td className="py-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    String(m.estado).toLowerCase() === 'confirmado' || m.estado === 'C'
                      ? 'bg-emerald-100 text-emerald-700'
                      : m.estado
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {m.estado || 'S/E'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
