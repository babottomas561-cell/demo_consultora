import { Loader2, RefreshCw } from 'lucide-react';
import { useRef } from 'react';
import ExportButton from '../../../../components/analytics/ExportButton/ExportButton';
import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../useInfomanagerFetch';

const FORMA_PAGO_LABEL = {
  'EF': 'Efectivo',
  'TC': 'Tarjeta',
  'CH': 'Cheque',
  'TR': 'Transferencia',
  'CC': 'Cta. Cte.',
};

function formaPago(r) {
  if (r.cheque_numero) return `Cheque ${r.cheque_numero}`;
  if (r.cond_pago) return FORMA_PAGO_LABEL[r.cond_pago] || r.cond_pago;
  return '-';
}

export default function RecibosDelPeriodoWidget() {
  const panelRef = useRef(null);
  const { data, loading, error, refetch } = useInfomanagerFetch('caja/recibos', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
    cod_empresa: f.cod_empresa?.[0] ?? undefined,
  }));

  const recibos = data?.recibos ?? [];
  const totalCobrado = recibos.reduce((s, r) => s + Number(r.imp_pag_moneda_local || 0), 0);

  return (
    <div ref={panelRef} className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{data?.total ?? 0} recibos</span>
          {totalCobrado > 0 && (
            <span className="text-xs font-semibold text-green-700">
              Total cobrado: {formatCurrency(totalCobrado)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ExportButton data={recibos} filename="recibos-periodo" panelRef={panelRef} size="icon" />
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
        {!loading && !error && recibos.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin recibos en el período</div>
        )}
        {!loading && !error && recibos.length > 0 && (
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="border-b border-slate-100 px-3 py-2">Fecha Cobro</th>
                <th className="border-b border-slate-100 px-3 py-2">Nro. Recibo</th>
                <th className="border-b border-slate-100 px-3 py-2">Cliente</th>
                <th className="border-b border-slate-100 px-3 py-2">Forma de Pago</th>
                <th className="border-b border-slate-100 px-3 py-2">Fecha Factura</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Total FA</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Cobrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recibos.map((r, i) => (
                <tr key={`${r.fa_id}-${r.rc_id ?? i}`} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-1.5 font-medium text-green-700">{r.rc_fecha?.slice(0, 10)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">{r.rc_nro || '-'}</td>
                  <td className="max-w-[180px] truncate px-3 py-1.5 text-slate-700 font-medium">
                    {r.cliente_nombre || r.cod_cliente}
                  </td>
                  <td className="px-3 py-1.5 text-slate-500">{formaPago(r)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-slate-400">{r.fa_fecha?.slice(0, 10)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-600">{formatCurrency(r.fa_total_moneda_local)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold text-green-700">{formatCurrency(r.imp_pag_moneda_local)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
