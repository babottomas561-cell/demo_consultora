import { Loader2, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../useInfomanagerFetch';

const COLOR_CLASS = {
  1: 'bg-green-50',
  2: 'bg-yellow-50',
  3: 'bg-orange-50',
  4: 'bg-red-50',
};

export default function FacturasVentaWidget() {
  const { data, loading, error, refetch } = useInfomanagerFetch('ventas/facturas', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
    cod_empresa: f.cod_empresa?.[0] ?? undefined,
  }));

  const facturas = data?.facturas ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <span className="text-xs text-slate-500">{data?.total ?? 0} facturas</span>
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
                <th className="border-b border-slate-100 px-3 py-2">Cliente</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Total</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {facturas.map((f) => (
                <tr key={f.fa_id} className={`hover:bg-slate-50 ${COLOR_CLASS[f.color] ?? ''}`}>
                  <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">{f.fa_fecha?.slice(0, 10)}</td>
                  <td className="px-3 py-1.5 text-slate-500">{f.tipo_comprobante} {f.fa_cc}</td>
                  <td className="px-3 py-1.5 text-slate-500">{f.fa_pto_vta}-{f.fa_nro}</td>
                  <td className="px-3 py-1.5 text-slate-600">{f.cod_cliente}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-700 font-medium">{formatCurrency(f.fa_total_moneda_local)}</td>
                  <td className={`whitespace-nowrap px-3 py-1.5 text-right font-medium ${Number(f.saldo_fa) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(f.saldo_fa)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
