import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useClientesData } from '../ClientesDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const fmtDate = (value) => { const d = value?.slice(0, 10); return d ? d.split('-').reverse().join('/') : '-'; };
const docLabel = (doc) => [doc.tipo, doc.punto_de_venta, doc.numero].filter(Boolean).join(' ') || doc.comprobante_id;

export default function ComprobantesClienteWidget() {
  const { ranking, comprobantes, loadingComprobantes, fetchComprobantes } = useClientesData();
  const [selected, setSelected] = useState('');
  const [expanded, setExpanded] = useState({});

  const clientes = ranking?.clientes ?? [];
  const rows = comprobantes?.comprobantes ?? [];

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelected(id);
    setExpanded({});
    if (id) fetchComprobantes(id);
  };

  const toggleExpanded = (id) => {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
        <label className="text-sm font-medium text-slate-700 shrink-0">Cliente:</label>
        <select
          value={selected}
          onChange={handleSelect}
          className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Seleccionar cliente...</option>
          {clientes.map((c) => (
            <option key={c.cliente_id} value={c.cliente_id}>{c.nombre ?? `C${c.cliente_id}`}</option>
          ))}
        </select>
      </div>

      {loadingComprobantes && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      )}

      {!loadingComprobantes && !selected && (
        <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">
          Seleccioná un cliente para ver comprobantes y pagos.
        </div>
      )}

      {!loadingComprobantes && selected && !comprobantes && (
        <p className="px-4 text-sm text-slate-400">Sin datos para el período seleccionado.</p>
      )}

      {!loadingComprobantes && comprobantes && (
        <div className="flex-1 overflow-auto min-h-0 px-4 pb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Comprobantes</p>
              <p className="text-sm font-bold text-slate-900">{formatNumber(comprobantes.total_comprobantes)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Pagado</p>
              <p className="text-sm font-bold text-emerald-600">{formatCurrency(comprobantes.importe_pagado)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Saldo</p>
              <p className="text-sm font-bold text-amber-600">{formatCurrency(comprobantes.saldo)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="min-w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  {['Comprobante', 'Fecha', 'Vence', 'Total', 'Pagado', 'Saldo', 'Pagos'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((doc) => (
                  <Fragment key={doc.comprobante_id}>
                    <tr key={doc.comprobante_id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(doc.comprobante_id)}
                          className="mr-1 inline-flex align-middle text-slate-400 hover:text-slate-700"
                        >
                          {expanded[doc.comprobante_id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        {docLabel(doc)}
                      </td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(doc.fecha)}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(doc.fecha_vencimiento)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{formatCurrency(doc.importe_total)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{formatCurrency(doc.importe_pagado)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-amber-600">{formatCurrency(doc.saldo)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{formatNumber(doc.pagos?.length)}</td>
                    </tr>
                    {expanded[doc.comprobante_id] && (
                      <tr key={`${doc.comprobante_id}-pagos`} className="bg-slate-50/70">
                        <td colSpan={7} className="px-10 py-3">
                          <div className="space-y-1">
                            {(doc.pagos ?? []).map((pago) => (
                              <div key={pago.pago_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-slate-600">
                                <span>{fmtDate(pago.fecha)} · {pago.forma_pago ?? 'Pago'} · #{pago.pago_id}</span>
                                <span className="font-semibold text-emerald-600">{formatCurrency(pago.importe)}</span>
                              </div>
                            ))}
                            {!(doc.pagos?.length) && <p className="text-slate-400">Sin pagos asociados.</p>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {!rows.length && (
                  <tr><td colSpan={7} className="px-3 py-3 text-slate-400">Sin comprobantes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
