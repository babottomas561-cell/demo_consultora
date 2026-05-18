import { Loader2, RefreshCw } from 'lucide-react';
import { useRef } from 'react';
import ExportButton from '../../../../components/analytics/ExportButton/ExportButton';
import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../useInfomanagerFetch';

export default function MargenPorListaWidget() {
  const panelRef = useRef(null);
  const { data, loading, error, refetch } = useInfomanagerFetch('resultado/listas-precios', (f) => ({
    cod_lista_precios: f.cod_lista_precios?.[0] ?? undefined,
    cod_empresa: f.cod_empresa?.[0] ?? undefined,
  }));

  const items = data?.items ?? [];

  const byLista = items.reduce((acc, item) => {
    const key = item.lista_descripcion || `Lista ${item.cod_lista}`;
    if (!acc[key]) acc[key] = { items: [], margenSum: 0, count: 0 };
    acc[key].items.push(item);
    if (item.margen_porc != null) {
      acc[key].margenSum += Number(item.margen_porc);
      acc[key].count += 1;
    }
    return acc;
  }, {});

  const listas = Object.entries(byLista).map(([nombre, d]) => ({
    nombre,
    itemCount: d.items.length,
    margenPromedio: d.count > 0 ? d.margenSum / d.count : null,
    items: d.items,
  }));

  return (
    <div ref={panelRef} className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <span className="text-xs text-slate-500">{data?.total ?? 0} artículos · {listas.length} listas</span>
        <div className="flex items-center gap-1">
          <ExportButton data={items} filename="margen-por-lista" panelRef={panelRef} size="icon" />
          <button
            onClick={refetch}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading && <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>}
        {!loading && error && <div className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin listas de precios sincronizadas</div>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="divide-y divide-slate-100">
            {listas.map((lista) => (
              <details key={lista.nombre} className="group">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div>
                    <span className="font-medium text-slate-800 text-sm">{lista.nombre}</span>
                    <span className="ml-2 text-xs text-slate-400">{lista.itemCount} artículos</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {lista.margenPromedio != null && (
                      <span className={`text-sm font-semibold ${lista.margenPromedio >= 30 ? 'text-green-600' : lista.margenPromedio >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                        Margen prom. {lista.margenPromedio.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </summary>
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="border-b border-slate-100 px-4 py-2">Artículo</th>
                      <th className="border-b border-slate-100 px-4 py-2 text-right">P. Compra</th>
                      <th className="border-b border-slate-100 px-4 py-2 text-right">P. Venta s/IVA</th>
                      <th className="border-b border-slate-100 px-4 py-2 text-right">P. Venta c/IVA</th>
                      <th className="border-b border-slate-100 px-4 py-2 text-right">Margen %</th>
                      <th className="border-b border-slate-100 px-4 py-2 text-right">Dto. %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {lista.items.map((item) => (
                      <tr key={`${item.cod_lista}-${item.cod_articulo}`} className="hover:bg-slate-50">
                        <td className="max-w-[200px] truncate px-4 py-1.5 text-slate-700">{item.art_descripcion}</td>
                        <td className="whitespace-nowrap px-4 py-1.5 text-right text-slate-500">{formatCurrency(item.art_precio_compra)}</td>
                        <td className="whitespace-nowrap px-4 py-1.5 text-right font-medium text-slate-700">{formatCurrency(item.lista_precio_venta)}</td>
                        <td className="whitespace-nowrap px-4 py-1.5 text-right text-indigo-700 font-medium">{formatCurrency(item.lista_precio_con_iva)}</td>
                        <td className={`whitespace-nowrap px-4 py-1.5 text-right font-semibold ${
                          item.margen_porc == null ? 'text-slate-400' :
                          Number(item.margen_porc) >= 30 ? 'text-green-600' :
                          Number(item.margen_porc) >= 15 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {item.margen_porc != null ? `${Number(item.margen_porc).toFixed(1)}%` : '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-1.5 text-right text-slate-500">
                          {item.lista_descuento != null ? `${Number(item.lista_descuento).toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
