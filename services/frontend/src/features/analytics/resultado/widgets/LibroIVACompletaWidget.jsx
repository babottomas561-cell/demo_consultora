import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';

const fmt = (v) => `$${Number(v ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function LibroIVACompletaWidget() {
  const [expanded, setExpanded] = useState(false);
  const { data, loading, error } = useInfomanagerFetch('resultado/libro-iva-completo', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
  }));

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 p-4 animate-pulse">
        <div className="h-5 w-1/2 rounded bg-slate-200" />
        <div className="h-48 rounded bg-slate-100 mt-2" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 p-4">
        <FileText size={24} className="text-red-400" />
        <p className="text-sm text-center">{error}</p>
      </div>
    );
  }

  const periodos = data?.periodos ?? [];

  if (!periodos.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400 p-4">
        <FileText size={32} />
        <p className="text-sm">Sin movimientos en el período</p>
      </div>
    );
  }

  const totales = periodos.reduce((acc, p) => ({
    ventas_base_neta:  acc.ventas_base_neta + p.ventas_base_neta,
    iva_v_21:          acc.iva_v_21 + (p.iva_ventas_21 ?? 0),
    iva_v_10_5:        acc.iva_v_10_5 + (p.iva_ventas_10_5 ?? 0),
    iva_v_27:          acc.iva_v_27 + (p.iva_ventas_27 ?? 0),
    iva_debito:        acc.iva_debito + p.iva_debito,
    compras_base_neta: acc.compras_base_neta + p.compras_base_neta,
    iva_c_21:          acc.iva_c_21 + (p.iva_compras_21 ?? 0),
    iva_c_10_5:        acc.iva_c_10_5 + (p.iva_compras_10_5 ?? 0),
    iva_c_27:          acc.iva_c_27 + (p.iva_compras_27 ?? 0),
    iva_credito:       acc.iva_credito + p.iva_credito,
    saldo_iva:         acc.saldo_iva + p.saldo_iva,
  }), {
    ventas_base_neta: 0, iva_v_21: 0, iva_v_10_5: 0, iva_v_27: 0, iva_debito: 0,
    compras_base_neta: 0, iva_c_21: 0, iva_c_10_5: 0, iva_c_27: 0, iva_credito: 0, saldo_iva: 0,
  });

  return (
    <div className="h-full flex flex-col p-3 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} className="text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-800">Libro IVA — Ventas y Compras</h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-0.5"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Resumen' : 'Detalle alícuotas'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-rose-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-rose-600 font-medium uppercase">IVA Débito</p>
          <p className="text-base font-bold text-rose-700">{fmt(totales.iva_debito)}</p>
          {expanded && (
            <div className="mt-1 space-y-0.5">
              <p className="text-[9px] text-rose-500">21%: {fmt(totales.iva_v_21)}</p>
              <p className="text-[9px] text-rose-500">10.5%: {fmt(totales.iva_v_10_5)}</p>
              <p className="text-[9px] text-rose-500">27%: {fmt(totales.iva_v_27)}</p>
            </div>
          )}
        </div>
        <div className="bg-sky-50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-sky-600 font-medium uppercase">IVA Crédito</p>
          <p className="text-base font-bold text-sky-700">{fmt(totales.iva_credito)}</p>
          {expanded && (
            <div className="mt-1 space-y-0.5">
              <p className="text-[9px] text-sky-500">21%: {fmt(totales.iva_c_21)}</p>
              <p className="text-[9px] text-sky-500">10.5%: {fmt(totales.iva_c_10_5)}</p>
              <p className="text-[9px] text-sky-500">27%: {fmt(totales.iva_c_27)}</p>
            </div>
          )}
        </div>
        <div className={`rounded-lg p-2 text-center ${totales.saldo_iva >= 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
          <p className={`text-[10px] font-medium uppercase ${totales.saldo_iva >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {totales.saldo_iva >= 0 ? 'A Pagar' : 'A Favor'}
          </p>
          <p className={`text-base font-bold ${totales.saldo_iva >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {fmt(Math.abs(totales.saldo_iva))}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white border-b border-slate-200">
            <tr>
              <th className="text-left py-1.5 text-slate-500 font-medium">Período</th>
              <th className="text-right py-1.5 text-slate-500 font-medium">Base V</th>
              {expanded && <>
                <th className="text-right py-1.5 text-rose-400 font-medium">21%</th>
                <th className="text-right py-1.5 text-rose-400 font-medium">10.5%</th>
                <th className="text-right py-1.5 text-rose-400 font-medium">27%</th>
              </>}
              <th className="text-right py-1.5 text-rose-500 font-medium">Débito</th>
              <th className="text-right py-1.5 text-slate-500 font-medium">Base C</th>
              {expanded && <>
                <th className="text-right py-1.5 text-sky-400 font-medium">21%</th>
                <th className="text-right py-1.5 text-sky-400 font-medium">10.5%</th>
                <th className="text-right py-1.5 text-sky-400 font-medium">27%</th>
              </>}
              <th className="text-right py-1.5 text-sky-500 font-medium">Crédito</th>
              <th className="text-right py-1.5 text-amber-600 font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {periodos.map((p) => (
              <tr key={p.periodo} className="hover:bg-slate-50">
                <td className="py-1.5 font-medium text-slate-700">{p.periodo}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-600">{fmt(p.ventas_base_neta)}</td>
                {expanded && <>
                  <td className="py-1.5 text-right tabular-nums text-rose-400">{fmt(p.iva_ventas_21)}</td>
                  <td className="py-1.5 text-right tabular-nums text-rose-400">{fmt(p.iva_ventas_10_5)}</td>
                  <td className="py-1.5 text-right tabular-nums text-rose-400">{fmt(p.iva_ventas_27)}</td>
                </>}
                <td className="py-1.5 text-right tabular-nums text-rose-600 font-medium">{fmt(p.iva_debito)}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-600">{fmt(p.compras_base_neta)}</td>
                {expanded && <>
                  <td className="py-1.5 text-right tabular-nums text-sky-400">{fmt(p.iva_compras_21 ?? 0)}</td>
                  <td className="py-1.5 text-right tabular-nums text-sky-400">{fmt(p.iva_compras_10_5 ?? 0)}</td>
                  <td className="py-1.5 text-right tabular-nums text-sky-400">{fmt(p.iva_compras_27 ?? 0)}</td>
                </>}
                <td className="py-1.5 text-right tabular-nums text-sky-600">{fmt(p.iva_credito)}</td>
                <td className={`py-1.5 text-right tabular-nums font-semibold ${p.saldo_iva >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {fmt(Math.abs(p.saldo_iva))}
                  {p.saldo_iva < 0 && <span className="text-[9px] ml-0.5 text-emerald-400">AF</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-300">
            <tr className="font-bold">
              <td className="py-1.5 text-slate-800">TOTAL</td>
              <td className="py-1.5 text-right tabular-nums">{fmt(totales.ventas_base_neta)}</td>
              {expanded && <>
                <td className="py-1.5 text-right tabular-nums text-rose-500">{fmt(totales.iva_v_21)}</td>
                <td className="py-1.5 text-right tabular-nums text-rose-500">{fmt(totales.iva_v_10_5)}</td>
                <td className="py-1.5 text-right tabular-nums text-rose-500">{fmt(totales.iva_v_27)}</td>
              </>}
              <td className="py-1.5 text-right tabular-nums text-rose-700">{fmt(totales.iva_debito)}</td>
              <td className="py-1.5 text-right tabular-nums">{fmt(totales.compras_base_neta)}</td>
              {expanded && <>
                <td className="py-1.5 text-right tabular-nums text-sky-500">{fmt(totales.iva_c_21)}</td>
                <td className="py-1.5 text-right tabular-nums text-sky-500">{fmt(totales.iva_c_10_5)}</td>
                <td className="py-1.5 text-right tabular-nums text-sky-500">{fmt(totales.iva_c_27)}</td>
              </>}
              <td className="py-1.5 text-right tabular-nums text-sky-700">{fmt(totales.iva_credito)}</td>
              <td className={`py-1.5 text-right tabular-nums ${totales.saldo_iva >= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {fmt(Math.abs(totales.saldo_iva))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
