import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../useInfomanagerFetch';

const CUENTA_PREFIJOS = [
  { value: '', label: 'Todas las cuentas' },
  { value: '1', label: 'Activo (1xxxxx)' },
  { value: '111', label: 'Caja (111xxx)' },
  { value: '112', label: 'Bancos (112xxx)' },
  { value: '2', label: 'Pasivo (2xxxxx)' },
];

export default function FlujoCajaContableWidget() {
  const [prefijoCuenta, setPrefijoCuenta] = useState('');

  const { data, loading, error, refetch } = useInfomanagerFetch('caja/flujo-contable', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
    cod_empresa: f.cod_empresa?.[0] ?? undefined,
    prefijo_cuenta: prefijoCuenta || undefined,
  }), [prefijoCuenta]);

  const cuentas = data?.por_cuenta ?? [];
  const porDia = data?.por_dia ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <div className="flex items-center gap-3 flex-wrap">
          {data && (
            <>
              <span className="text-xs text-slate-500">
                Debe: <span className="font-semibold text-slate-700">{formatCurrency(data.total_debe)}</span>
              </span>
              <span className="text-xs text-slate-500">
                Haber: <span className="font-semibold text-slate-700">{formatCurrency(data.total_haber)}</span>
              </span>
              <span className="text-xs text-slate-500">
                Saldo: <span className={`font-semibold ${data.saldo_neto >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(data.saldo_neto))} {data.saldo_neto >= 0 ? 'D' : 'H'}
                </span>
              </span>
              <span className="text-xs text-slate-400">{data.movimientos_count} asientos · {cuentas.length} cuentas</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={prefijoCuenta}
            onChange={(e) => setPrefijoCuenta(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 bg-white"
          >
            {CUENTA_PREFIJOS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
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
        {!loading && !error && cuentas.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin movimientos contables en el período</div>
        )}
        {!loading && !error && cuentas.length > 0 && (
          <div className="divide-y divide-slate-100">
            <div className="px-4 py-2 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Por cuenta contable
            </div>
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="border-b border-slate-100 px-3 py-2 font-mono">Cuenta</th>
                  <th className="border-b border-slate-100 px-3 py-2">Descripción</th>
                  <th className="border-b border-slate-100 px-3 py-2 text-right">Debe</th>
                  <th className="border-b border-slate-100 px-3 py-2 text-right">Haber</th>
                  <th className="border-b border-slate-100 px-3 py-2 text-right">Saldo</th>
                  <th className="border-b border-slate-100 px-3 py-2 text-right">Mvtos.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cuentas.map((c) => (
                  <tr key={c.cuenta} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-slate-500">{c.cuenta}</td>
                    <td className="max-w-[220px] truncate px-3 py-1.5 text-slate-700">{c.plan_descripcion || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-700">{formatCurrency(c.debe)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-700">{formatCurrency(c.haber)}</td>
                    <td className={`whitespace-nowrap px-3 py-1.5 text-right font-semibold ${c.saldo >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                      {formatCurrency(Math.abs(c.saldo))} {c.saldo >= 0 ? 'D' : 'H'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-400">{c.movimientos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {porDia.length > 0 && (
              <>
                <div className="px-4 py-2 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Detalle diario ({porDia.length} días)
                </div>
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="border-b border-slate-100 px-3 py-2">Fecha</th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right">Debe</th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right">Haber</th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right">Neto día</th>
                      <th className="border-b border-slate-100 px-3 py-2 text-right">Saldo acum.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {porDia.map((d) => (
                      <tr key={d.fecha} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-1.5 text-slate-600">{d.fecha}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-700">{formatCurrency(d.debe)}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-700">{formatCurrency(d.haber)}</td>
                        <td className={`whitespace-nowrap px-3 py-1.5 text-right font-medium ${d.neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {d.neto >= 0 ? '+' : ''}{formatCurrency(d.neto)}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-1.5 text-right font-semibold ${d.saldo_acum >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(d.saldo_acum))} {d.saldo_acum >= 0 ? 'D' : 'H'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
