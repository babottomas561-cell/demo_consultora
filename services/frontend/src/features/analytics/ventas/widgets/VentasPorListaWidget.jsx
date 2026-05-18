import { Fragment, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import apiClient from '../../../../api/client';
import useAuthStore from '../../../../store/authStore';
import { useFilterStore } from '../../../../store/filterStore';
import { formatCurrency } from '../../analyticsUtils';

export default function VentasPorListaWidget() {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore = useFilterStore();
  const canFetch = Boolean(user?.company_id || (user?.is_admin && activeCompany));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedListas, setExpandedListas] = useState(new Set());

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (user?.is_admin && activeCompany) p.set('company_id', activeCompany.id);
    if (filterStore.desde) p.set('desde', filterStore.desde);
    if (filterStore.hasta) p.set('hasta', filterStore.hasta);
    (filterStore.cod_empresa || []).forEach((v) => p.append('cod_empresa', v));
    (filterStore.cod_vendedor || []).forEach((v) => p.append('cod_vendedor', v));
    (filterStore.cod_rubro || []).forEach((v) => p.append('cod_rubro', v));
    (filterStore.cod_deposito || []).forEach((v) => p.append('cod_deposito', v));
    (filterStore.tag || []).forEach((v) => p.append('tag', v));
    return p.toString();
  }, [user, activeCompany, filterStore.desde, filterStore.hasta,
      filterStore.cod_empresa?.join(','), filterStore.cod_vendedor?.join(','),
      filterStore.cod_rubro?.join(','), filterStore.cod_deposito?.join(','),
      filterStore.tag?.join(',')]);

  const fetchData = async () => {
    if (!canFetch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/analytics/ventas/por-lista${params ? `?${params}` : ''}`);
      setData(res.data);
    } catch (err) {
      setError('Error al cargar el análisis por lista.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [params, canFetch]);

  const listas = data?.por_lista ?? [];
  const porVendedor = data?.por_vendedor_lista ?? [];

  const vendedoresPorLista = useMemo(() => {
    const map = {};
    porVendedor.forEach((r) => {
      if (!map[r.cod_lista_precios]) map[r.cod_lista_precios] = [];
      map[r.cod_lista_precios].push(r);
    });
    return map;
  }, [porVendedor]);

  function toggleLista(cod) {
    const next = new Set(expandedListas);
    if (next.has(cod)) next.delete(cod);
    else next.add(cod);
    setExpandedListas(next);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{listas.length} listas con ventas</span>
          {data?.total_facturado > 0 && (
            <span className="text-xs text-slate-500">
              Total: <span className="font-semibold text-slate-700">{formatCurrency(data.total_facturado)}</span>
            </span>
          )}
        </div>
        <button
          onClick={fetchData}
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
        {!loading && !error && listas.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Sin ventas con lista de precios asignada. Verificá que el sync haya corrido después del despliegue.
          </div>
        )}
        {!loading && !error && listas.length > 0 && (
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="border-b border-slate-100 px-3 py-2"></th>
                <th className="border-b border-slate-100 px-3 py-2">Lista</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Facturado</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Margen $</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Margen %</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">% Total</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Tickets</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Ticket prom.</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Clientes</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Vendedores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {listas.map((l) => {
                const vendedoresArr = vendedoresPorLista[l.cod_lista_precios] || [];
                const expanded = expandedListas.has(l.cod_lista_precios);
                return (
                  <Fragment key={l.cod_lista_precios}>
                    <tr
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggleLista(l.cod_lista_precios)}
                    >
                      <td className="px-2 py-1.5">
                        {vendedoresArr.length > 0 ? (
                          expanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-400" />
                        ) : null}
                      </td>
                      <td className="px-3 py-1.5 font-medium text-slate-800">{l.nombre}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-700 font-medium">{formatCurrency(l.facturado)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right text-green-700">{formatCurrency(l.margen_abs)}</td>
                      <td className={`whitespace-nowrap px-3 py-1.5 text-right font-semibold ${
                        l.margen_pct >= 30 ? 'text-green-600' : l.margen_pct >= 15 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {l.margen_pct?.toFixed(1)}%
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-500">{l.pct_total?.toFixed(1)}%</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-500">{l.tickets}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-500">{formatCurrency(l.ticket_promedio)}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-500">{l.clientes_unicos}</td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-500">{l.vendedores_unicos}</td>
                    </tr>
                    {expanded && vendedoresArr.map((v) => (
                      <tr key={`${l.cod_lista_precios}-${v.cod_vendedor}`} className="bg-slate-50/50">
                        <td className="px-2 py-1"></td>
                        <td className="px-3 py-1 pl-8 text-slate-500 text-[11px]">↳ {v.vendedor_nombre}</td>
                        <td className="whitespace-nowrap px-3 py-1 text-right text-slate-600 text-[11px]">{formatCurrency(v.facturado)}</td>
                        <td colSpan={4}></td>
                        <td className="whitespace-nowrap px-3 py-1 text-right text-slate-400 text-[11px]">{v.tickets}</td>
                        <td colSpan={2}></td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
