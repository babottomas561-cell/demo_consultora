import { Loader2, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../useInfomanagerFetch';

export default function FacturasCompraWidget() {
  const { data, loading, error, refetch } = useInfomanagerFetch('compras/facturas', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
    cod_empresa: f.cod_empresa?.[0] ?? undefined,
    cod_deposito: f.cod_deposito?.[0] ?? undefined,
  }));

  const facturas = data?.facturas ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <span className="text-xs text-slate-500">{data?.total ?? 0} facturas de compra</span>
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
        {!loading && !error && facturas.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin datos sincronizados</div>
        )}
        {!loading && !error && facturas.length > 0 && (
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="border-b border-slate-100 px-3 py-2">Fecha</th>
                <th className="border-b border-slate-100 px-3 py-2">Tipo</th>
                <th className="border-b border-slate-100 px-3 py-2">Pto/Nro</th>
                <th className="border-b border-slate-100 px-3 py-2">Proveedor</th>
                <th className="border-b border-slate-100 px-3 py-2">Moneda</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Total</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">IVA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {facturas.map((f) => (
                <tr key={f.id} className={`hover:bg-slate-50 ${f.anulada ? 'opacity-50 line-through' : ''}`}>
                  <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">{f.fecha?.slice(0, 10)}</td>
                  <td className="px-3 py-1.5 text-slate-500">{f.tipo_comprobante} {f.tipo_factura}</td>
                  <td className="px-3 py-1.5 text-slate-500">{f.punto_de_venta}-{f.numero}</td>
                  <td className="max-w-[180px] truncate px-3 py-1.5 text-slate-700">{f.proveedor}</td>
                  <td className="px-3 py-1.5 text-slate-500">{f.moneda}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-medium text-slate-700">{formatCurrency(f.importe_total)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-500">{formatCurrency(f.importe_iva)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
