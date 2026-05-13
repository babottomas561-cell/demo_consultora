import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useCajaData } from '../CajaDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

export default function MovimientosWidget() {
  const { movimientos, loadingMovs, movsPage, fetchMovimientos } = useCajaData();

  useEffect(() => { fetchMovimientos(1); }, [fetchMovimientos]);

  const total      = movimientos?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {loadingMovs && (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      )}

      {!loadingMovs && movimientos && (
        <>
          {/* Table */}
          <div className="flex-1 overflow-auto min-h-0 px-3 pt-3">
            <p className="text-xs font-semibold text-slate-600 mb-1">
              Movimientos de caja ({formatNumber(total)} total)
            </p>
            <table className="min-w-full text-xs border-collapse rounded-xl overflow-hidden border border-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {['Fecha', 'Tipo', 'Descripción', 'Importe', 'Saldo'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(movimientos.movimientos ?? []).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{r.fecha?.slice(0, 10) ?? '-'}</td>
                    <td className="px-3 py-1.5 text-slate-700 whitespace-nowrap">{r.tipo}</td>
                    <td className="px-3 py-1.5 text-slate-600 max-w-[180px] truncate">{r.descripcion}</td>
                    <td className={`px-3 py-1.5 tabular-nums text-right font-semibold whitespace-nowrap ${(r.importe ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(r.importe)}
                    </td>
                    <td className={`px-3 py-1.5 tabular-nums text-right whitespace-nowrap ${r.saldo_acumulado != null ? ((r.saldo_acumulado >= 0) ? 'text-slate-700' : 'text-red-600') : 'text-slate-400'}`}>
                      {r.saldo_acumulado != null ? formatCurrency(r.saldo_acumulado) : '-'}
                    </td>
                  </tr>
                ))}
                {!(movimientos.movimientos?.length) && (
                  <tr><td colSpan={5} className="px-3 py-3 text-slate-400">Sin movimientos</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 px-3 py-2 shrink-0 border-t border-slate-100">
              <button
                disabled={movsPage <= 1}
                onClick={() => fetchMovimientos(movsPage - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-xs text-slate-500">
                Página {movsPage} de {totalPages}
              </span>
              <button
                disabled={movsPage >= totalPages}
                onClick={() => fetchMovimientos(movsPage + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
