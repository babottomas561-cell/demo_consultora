import { Loader2, RefreshCw } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../useInfomanagerFetch';

export default function MovimientosStockWidget() {
  const { data, loading, error, refetch } = useInfomanagerFetch('stock/movimientos', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
    cod_deposito: f.cod_deposito?.[0] ?? undefined,
  }));

  const movimientos = data?.movimientos ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <span className="text-xs text-slate-500">{data?.total ?? 0} movimientos</span>
        <button
          onClick={refetch}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading && <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>}
        {!loading && error && <div className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {!loading && !error && movimientos.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin movimientos en el período</div>
        )}
        {!loading && !error && movimientos.length > 0 && (
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="border-b border-slate-100 px-3 py-2">Fecha</th>
                <th className="border-b border-slate-100 px-3 py-2">Artículo</th>
                <th className="border-b border-slate-100 px-3 py-2">Tipo</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Cantidad</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Precio</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Total</th>
                <th className="border-b border-slate-100 px-3 py-2">Dep.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {movimientos.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">{m.fecha?.slice(0, 10)}</td>
                  <td className="max-w-[160px] truncate px-3 py-1.5 text-slate-700">{m.descripcion}</td>
                  <td className="px-3 py-1.5 text-slate-500">{m.tipo_movimiento}</td>
                  <td className={`whitespace-nowrap px-3 py-1.5 text-right font-medium ${Number(m.cantidad) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatNumber(m.cantidad)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-600">{formatCurrency(m.precio)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium text-slate-700">{formatCurrency(m.total)}</td>
                  <td className="px-3 py-1.5 text-slate-400">{m.cod_deposito}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
