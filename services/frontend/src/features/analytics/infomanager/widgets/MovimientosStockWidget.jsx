import { Loader2, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency, formatNumber } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../useInfomanagerFetch';

export default function MovimientosStockWidget() {
  const [articuloBusqueda, setArticuloBusqueda] = useState('');
  const [codArticuloFiltro, setCodArticuloFiltro] = useState(undefined);

  const { data, loading, error, refetch } = useInfomanagerFetch('stock/movimientos', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
    cod_deposito: f.cod_deposito?.[0] ?? undefined,
    cod_empresa: f.cod_empresa?.[0] ?? undefined,
    q: codArticuloFiltro || undefined,
  }));

  const movimientos = data?.movimientos ?? [];
  const entradas = movimientos.filter((m) => Number(m.cantidad) > 0).reduce((s, m) => s + Number(m.total || 0), 0);
  const salidas = movimientos.filter((m) => Number(m.cantidad) < 0).reduce((s, m) => s + Math.abs(Number(m.total || 0)), 0);

  function aplicarFiltroArticulo() {
    const val = articuloBusqueda.trim();
    setCodArticuloFiltro(val ? val : undefined);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-1 border-b border-slate-100 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{data?.total ?? 0} movimientos</span>
            {entradas > 0 && <span className="text-xs text-green-700">Entradas: {formatCurrency(entradas)}</span>}
            {salidas > 0 && <span className="text-xs text-red-600">Salidas: {formatCurrency(salidas)}</span>}
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="text"
            placeholder="Buscar por nombre de artículo..."
            value={articuloBusqueda}
            onChange={(e) => setArticuloBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && aplicarFiltroArticulo()}
            className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-indigo-400"
          />
          <button
            onClick={aplicarFiltroArticulo}
            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
          >
            <Search size={11} />
          </button>
          {codArticuloFiltro && (
            <button
              onClick={() => { setArticuloBusqueda(''); setCodArticuloFiltro(undefined); }}
              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-400 hover:bg-slate-50"
            >
              ✕
            </button>
          )}
        </div>
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
                <th className="border-b border-slate-100 px-3 py-2 text-right">P. Unit.</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Total</th>
                <th className="border-b border-slate-100 px-3 py-2">Dep.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {movimientos.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">{m.fecha?.slice(0, 10)}</td>
                  <td className="max-w-[180px] truncate px-3 py-1.5 text-slate-700">{m.descripcion}</td>
                  <td className="px-3 py-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      m.tipo_movimiento === 'entrada'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {m.tipo_movimiento === 'entrada' ? '▲ Entrada' : '▼ Salida'}
                    </span>
                  </td>
                  <td className={`whitespace-nowrap px-3 py-1.5 text-right font-medium ${Number(m.cantidad) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {formatNumber(Math.abs(m.cantidad))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-500">{formatCurrency(m.precio)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium text-slate-700">{formatCurrency(m.total)}</td>
                  <td className="px-3 py-1.5 text-slate-400">{m.cod_deposito ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
