import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency, formatNumber } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../useInfomanagerFetch';

export default function StockDisponibleWidget() {
  const [soloAlertas, setSoloAlertas] = useState(false);

  const { data, loading, error, refetch } = useInfomanagerFetch('stock/disponible', (f) => ({
    cod_deposito: f.cod_deposito?.[0] ?? undefined,
    cod_rubro: f.cod_rubro?.[0] ?? undefined,
    cod_empresa: f.cod_empresa?.[0] ?? undefined,
    solo_alertas: soloAlertas || undefined,
  }), [soloAlertas]);

  const articulos = data?.articulos ?? [];
  const alertas = articulos.filter((a) => a.alerta_reposicion).length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{data?.total ?? 0} artículos</span>
          {alertas > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
              <AlertTriangle size={10} /> {alertas} alertas
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[12px] text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soloAlertas}
              onChange={(e) => setSoloAlertas(e.target.checked)}
              className="accent-indigo-600"
            />
            Solo alertas
          </label>
          <button
            onClick={refetch}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading && <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>}
        {!loading && error && <div className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {!loading && !error && articulos.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin stock sincronizado</div>
        )}
        {!loading && !error && articulos.length > 0 && (
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="border-b border-slate-100 px-3 py-2">Artículo</th>
                <th className="border-b border-slate-100 px-3 py-2">Rubro</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Existencia</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Pto. Repos.</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">P. Compra</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">P. Venta</th>
                <th className="border-b border-slate-100 px-3 py-2">Dep.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {articulos.map((a) => (
                <tr key={`${a.cod_articulo}-${a.cod_deposito}`} className={`hover:bg-slate-50 ${a.alerta_reposicion ? 'bg-red-50' : ''}`}>
                  <td className="max-w-[200px] px-3 py-1.5">
                    <div className="flex items-center gap-1">
                      {a.alerta_reposicion && <AlertTriangle size={10} className="shrink-0 text-red-500" />}
                      <span className="truncate text-slate-700">{a.descripcion}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-slate-500">{a.rubro}</td>
                  <td className={`whitespace-nowrap px-3 py-1.5 text-right font-semibold ${a.alerta_reposicion ? 'text-red-600' : 'text-slate-700'}`}>
                    {formatNumber(a.existencia)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-400">{formatNumber(a.pto_de_reposicion)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-600">{formatCurrency(a.precio_compra)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-700">{formatCurrency(a.precio_venta)}</td>
                  <td className="px-3 py-1.5 text-slate-400">{a.cod_deposito}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
