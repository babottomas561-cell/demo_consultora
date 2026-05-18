import { Loader2, RefreshCw } from 'lucide-react';
import { useRef } from 'react';
import ExportButton from '../../../../components/analytics/ExportButton/ExportButton';
import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../useInfomanagerFetch';

const SALDO_CLASS = {
  1: 'text-green-600',
  2: 'text-yellow-600',
  3: 'text-orange-600',
  4: 'text-red-600',
};

export default function FacturasVentaWidget() {
  const panelRef = useRef(null);
  const { data, loading, error, refetch } = useInfomanagerFetch('ventas/facturas', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
    cod_empresa: f.cod_empresa?.[0] ?? undefined,
    cod_vendedor: f.cod_vendedor?.[0] ?? undefined,
  }));

  const facturas = data?.facturas ?? [];
  const totalSaldo = facturas.reduce((s, f) => s + Number(f.saldo_fa || 0), 0);
  const totalFacturado = facturas.reduce((s, f) => s + Number(f.fa_total_moneda_local || 0), 0);

  return (
    <div ref={panelRef} className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{data?.total ?? 0} facturas</span>
          {totalFacturado > 0 && (
            <span className="text-xs text-slate-500">
              Total: <span className="font-semibold text-slate-700">{formatCurrency(totalFacturado)}</span>
            </span>
          )}
          {totalSaldo > 0 && (
            <span className="text-xs text-slate-500">
              Saldo pendiente: <span className="font-semibold text-red-600">{formatCurrency(totalSaldo)}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ExportButton data={facturas} filename="facturas-venta" panelRef={panelRef} size="icon" />
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
        {!loading && !error && facturas.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin datos sincronizados</div>
        )}
        {!loading && !error && facturas.length > 0 && (
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="border-b border-slate-100 px-3 py-2">Fecha</th>
                <th className="border-b border-slate-100 px-3 py-2">Comprobante</th>
                <th className="border-b border-slate-100 px-3 py-2">Cliente</th>
                <th className="border-b border-slate-100 px-3 py-2">Vencimiento</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Total</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Cobrado</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {facturas.map((f) => {
                const vencida = f.primer_fec_vto && new Date(f.primer_fec_vto) < new Date() && Number(f.saldo_fa) > 0;
                return (
                  <tr key={f.fa_id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">{f.fa_fecha?.slice(0, 10)}</td>
                    <td className="px-3 py-1.5 text-slate-500">
                      {f.tipo_comprobante} {f.fa_cc} {f.fa_pto_vta}-{f.fa_nro}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-1.5 text-slate-700 font-medium">
                      {f.cliente_nombre || f.cod_cliente}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-1.5 ${vencida ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                      {f.primer_fec_vto?.slice(0, 10) ?? '-'}
                      {vencida && ' ⚠'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-700 font-medium">
                      {formatCurrency(f.fa_total_moneda_local)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-green-700">
                      {formatCurrency(f.rc_imp_pagado)}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-1.5 text-right font-semibold ${SALDO_CLASS[f.color] ?? 'text-slate-700'}`}>
                      {formatCurrency(f.saldo_fa)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
