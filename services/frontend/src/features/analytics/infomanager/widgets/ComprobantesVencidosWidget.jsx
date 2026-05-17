import { Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '../../analyticsUtils';
import { useInfomanagerFetch } from '../useInfomanagerFetch';

const AGING_TABS = [
  { key: '', label: 'Todos' },
  { key: '0-30', label: '0-30 días' },
  { key: '31-60', label: '31-60 días' },
  { key: '61-90', label: '61-90 días' },
  { key: '+90', label: '+90 días' },
];

export default function ComprobantesVencidosWidget() {
  const [aging, setAging] = useState('');

  const { data, loading, error, refetch } = useInfomanagerFetch('clientes/pendientes', (f) => ({
    cod_empresa: f.cod_empresa?.[0] ?? undefined,
    aging: aging || undefined,
  }));

  const comprobantes = data?.pendientes ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-slate-100">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{data?.total ?? 0} comprobantes</span>
            {data?.total_saldo != null && (
              <span className="text-xs font-semibold text-red-600">
                Saldo pendiente: {formatCurrency(data.total_saldo)}
              </span>
            )}
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex gap-0.5 overflow-x-auto px-3 pb-2">
          {AGING_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setAging(t.key)}
              className={`shrink-0 rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
                aging === t.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {loading && <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>}
        {!loading && error && <div className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {!loading && !error && comprobantes.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Sin comprobantes pendientes</div>
        )}
        {!loading && !error && comprobantes.length > 0 && (
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="border-b border-slate-100 px-3 py-2">Cliente</th>
                <th className="border-b border-slate-100 px-3 py-2">Comprobante</th>
                <th className="border-b border-slate-100 px-3 py-2">Fecha FA</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Días</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Importe</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Pagado</th>
                <th className="border-b border-slate-100 px-3 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {comprobantes.map((c) => {
                const dias = Number(c.dias_deuda ?? 0);
                const diasClass = dias > 90 ? 'text-red-600 font-bold' : dias > 60 ? 'text-orange-600 font-semibold' : dias > 30 ? 'text-yellow-600' : 'text-slate-600';
                return (
                  <tr key={c.comprobante_id} className="hover:bg-slate-50">
                    <td className="max-w-[160px] px-3 py-1.5">
                      <div className="truncate font-medium text-slate-700">{c.nombre}</div>
                    </td>
                    <td className="px-3 py-1.5 text-slate-500">{c.tipo_comprobante} {c.numero}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">{c.fecha_factura?.slice(0, 10)}</td>
                    <td className={`whitespace-nowrap px-3 py-1.5 text-right ${diasClass}`}>{dias}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-600">{formatCurrency(c.importe_factura)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right text-slate-400">{formatCurrency(c.importe_pagado)}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right font-semibold text-red-600">{formatCurrency(c.saldo)}</td>
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
