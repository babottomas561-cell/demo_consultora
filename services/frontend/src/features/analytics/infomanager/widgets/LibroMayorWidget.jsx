import { Loader2, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../useInfomanagerFetch';

export default function LibroMayorWidget() {
  const { data, loading, error, refetch } = useInfomanagerFetch('resultado/libro-mayor', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
    cod_empresa: f.cod_empresa?.[0] ?? undefined,
  }));

  const movimientos = data?.movimientos ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <span className="text-xs text-slate-500">{data?.total ?? 0} asientos</span>
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
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin asientos en el período</div>
        )}
        {!loading && !error && movimientos.length > 0 && (
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="border-b border-slate-100 px-3 py-2">Fecha</th>
                <th className="border-b border-slate-100 px-3 py-2">Cuenta</th>
                <th className="border-b border-slate-100 px-3 py-2">Descripción</th>
                <th className="border-b border-slate-100 px-3 py-2">Tipo</th>
                <th className="border-b border-slate-100 px-3 py-2">Nro.</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Debe</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Haber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {movimientos.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">{m.fecha?.slice(0, 10)}</td>
                  <td className="px-3 py-1.5 text-slate-500">{m.cuenta}</td>
                  <td className="max-w-[200px] truncate px-3 py-1.5 text-slate-700">{m.plan_descripcion || m.descripcion}</td>
                  <td className="px-3 py-1.5 text-slate-400">{m.tipo_comprobante}</td>
                  <td className="px-3 py-1.5 text-slate-400">{m.numero}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium text-slate-700">{formatCurrency(m.debe)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium text-slate-700">{formatCurrency(m.haber)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
