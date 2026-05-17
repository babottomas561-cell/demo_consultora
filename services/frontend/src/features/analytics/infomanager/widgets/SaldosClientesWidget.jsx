import { Loader2, RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import ExportButton from '../../../../components/analytics/ExportButton/ExportButton';
import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../useInfomanagerFetch';

const COLOR_ROW = {
  1: 'bg-green-50',
  2: 'bg-yellow-50',
  3: 'bg-orange-50',
  4: 'bg-red-50',
};
const COLOR_BADGE = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-orange-100 text-orange-700',
  4: 'bg-red-100 text-red-700',
};
const COLOR_LABEL = { 1: 'Al día', 2: 'Leve', 3: 'Moderada', 4: 'Crítica' };

export default function SaldosClientesWidget() {
  const panelRef = useRef(null);
  const [soloConSaldo, setSoloConSaldo] = useState(true);

  const { data, loading, error, refetch } = useInfomanagerFetch('clientes/saldos', (f) => ({
    cod_empresa: f.cod_empresa?.[0] ?? undefined,
    solo_con_saldo: soloConSaldo || undefined,
  }), [soloConSaldo]);

  const saldos = data?.saldos ?? [];
  const totalSaldo = saldos.reduce((s, r) => s + Number(r.tot_saldo || 0), 0);

  return (
    <div ref={panelRef} className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{data?.total ?? 0} clientes</span>
          <span className="text-xs font-semibold text-slate-700">
            Saldo total: <span className={totalSaldo > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(totalSaldo)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[12px] text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soloConSaldo}
              onChange={(e) => setSoloConSaldo(e.target.checked)}
              className="accent-indigo-600"
            />
            Solo con saldo
          </label>
          <div className="flex items-center gap-1">
            <ExportButton data={saldos} filename="saldos-clientes" panelRef={panelRef} size="icon" />
            <button
              onClick={refetch}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading && <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>}
        {!loading && error && <div className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {!loading && !error && saldos.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin saldos sincronizados</div>
        )}
        {!loading && !error && saldos.length > 0 && (
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="border-b border-slate-100 px-3 py-2">Cliente</th>
                <th className="border-b border-slate-100 px-3 py-2">Estado</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Días deuda</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Entrada</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Salida</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {saldos.map((s) => (
                <tr key={s.cod_cliente} className={`${COLOR_ROW[s.color] ?? ''}`}>
                  <td className="max-w-[200px] px-3 py-1.5">
                    <div className="truncate font-medium text-slate-700">{s.nombre}</div>
                    <div className="text-[10px] text-slate-400">#{s.cod_cliente}</div>
                  </td>
                  <td className="px-3 py-1.5">
                    {s.color && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${COLOR_BADGE[s.color]}`}>
                        {COLOR_LABEL[s.color]}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-600">{s.dias_deuda ?? '-'}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-500">{formatCurrency(s.tot_entrada)}</td>
                  <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-500">{formatCurrency(s.tot_salida)}</td>
                  <td className={`whitespace-nowrap px-3 py-1.5 text-right font-semibold ${Number(s.tot_saldo) > 0 ? 'text-red-600' : 'text-green-700'}`}>
                    {formatCurrency(s.tot_saldo)}
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
