import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Inbox } from 'lucide-react';
import { useVentasData } from '../VentasDataContext';
import { formatCurrency } from '../../analyticsUtils';

const IVA_COLORS = {
  iva_21:   '#6366f1',
  iva_10_5: '#22c55e',
  iva_27:   '#f59e0b',
};

const IVA_LABELS = {
  iva_21:   'IVA 21%',
  iva_10_5: 'IVA 10,5%',
  iva_27:   'IVA 27%',
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const fmtPeriod = (v) => {
  if (!v) return '';
  const raw = String(v);
  const date = raw.length === 7 ? new Date(`${raw}-01T00:00:00`) : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return `${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs min-w-[180px]">
      <p className="font-bold text-slate-700 mb-1.5">{fmtPeriod(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4 mb-0.5">
          <span style={{ color: p.fill }}>{IVA_LABELS[p.dataKey] ?? p.dataKey}</span>
          <span className="font-semibold tabular-nums">{formatCurrency(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-slate-200 mt-1.5 pt-1.5 flex justify-between">
        <span className="text-slate-400">Total IVA</span>
        <span className="font-bold tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
};

export default function LibroIVAWidget() {
  const { ivaDiscriminado, ivaDiscriminadoLoading } = useVentasData();

  if (ivaDiscriminadoLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400 text-sm">Cargando IVA discriminado...</p>
      </div>
    );
  }

  const periodos = ivaDiscriminado?.periodos ?? [];

  const totalIva21   = periodos.reduce((s, p) => s + (p.iva_21   ?? 0), 0);
  const totalIva105  = periodos.reduce((s, p) => s + (p.iva_10_5 ?? 0), 0);
  const totalIva27   = periodos.reduce((s, p) => s + (p.iva_27   ?? 0), 0);
  const totalIvaAll  = periodos.reduce((s, p) => s + (p.iva_total ?? 0), 0);
  const totalBase    = periodos.reduce((s, p) => s + (p.base_neta ?? 0), 0);

  const has105 = totalIva105 > 0;
  const has27  = totalIva27  > 0;

  if (!periodos.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-400">
        <Inbox size={24} />
        <p className="text-sm">Sin datos de IVA discriminado.</p>
      </div>
    );
  }

  const kpiItems = [
    { label: 'Base Neta', value: totalBase, color: '#0f172a' },
    { label: 'IVA 21%',   value: totalIva21,  color: IVA_COLORS.iva_21 },
    ...(has105 ? [{ label: 'IVA 10,5%', value: totalIva105, color: IVA_COLORS.iva_10_5 }] : []),
    ...(has27  ? [{ label: 'IVA 27%',   value: totalIva27,  color: IVA_COLORS.iva_27   }] : []),
    { label: 'Débito Total', value: totalIvaAll, bold: true },
  ];

  return (
    <div className="h-full flex flex-col gap-3 px-4 py-3">
      <div className="flex justify-between items-baseline shrink-0">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          IVA Ventas Discriminado
        </span>
        <span className="text-[10px] text-slate-400">Libro IVA — CPN</span>
      </div>

      <div className="flex gap-2 flex-wrap shrink-0">
        {kpiItems.map((k) => (
          <div key={k.label} className={`flex-1 min-w-[90px] rounded-lg border text-center px-2.5 py-2 ${
            k.bold ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200'
          }`}>
            <p className={`text-sm tabular-nums ${k.bold ? 'font-extrabold text-indigo-700' : 'font-semibold'}`}
               style={k.color ? { color: k.color } : undefined}>
              {formatCurrency(k.value)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={periodos} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={fmtPeriod} />
            <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-[11px] text-slate-500">{IVA_LABELS[value] ?? value}</span>}
            />
            <Bar dataKey="iva_21"   stackId="iva" fill={IVA_COLORS.iva_21}   radius={has105 || has27 ? 0 : [4,4,0,0]} />
            {has105 && <Bar dataKey="iva_10_5" stackId="iva" fill={IVA_COLORS.iva_10_5} radius={0} />}
            {has27  && <Bar dataKey="iva_27"   stackId="iva" fill={IVA_COLORS.iva_27}   radius={[4,4,0,0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto shrink-0">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="text-slate-400 text-right">
              <th className="text-left px-1.5 py-1 font-medium">Período</th>
              <th className="px-1.5 py-1 font-medium">Base neta</th>
              <th className="px-1.5 py-1 font-medium">IVA 21%</th>
              {has105 && <th className="px-1.5 py-1 font-medium">IVA 10,5%</th>}
              {has27  && <th className="px-1.5 py-1 font-medium">IVA 27%</th>}
              <th className="px-1.5 py-1 font-medium text-slate-500">Total IVA</th>
            </tr>
          </thead>
          <tbody>
            {periodos.map((p) => (
              <tr key={p.periodo} className="border-t border-slate-100">
                <td className="px-1.5 py-1 font-semibold text-slate-700">{fmtPeriod(p.periodo)}</td>
                <td className="px-1.5 py-1 text-right text-slate-500 tabular-nums">{formatCurrency(p.base_neta)}</td>
                <td className="px-1.5 py-1 text-right tabular-nums" style={{ color: IVA_COLORS.iva_21 }}>{formatCurrency(p.iva_21)}</td>
                {has105 && <td className="px-1.5 py-1 text-right tabular-nums" style={{ color: IVA_COLORS.iva_10_5 }}>{formatCurrency(p.iva_10_5)}</td>}
                {has27  && <td className="px-1.5 py-1 text-right tabular-nums" style={{ color: IVA_COLORS.iva_27 }}>{formatCurrency(p.iva_27)}</td>}
                <td className="px-1.5 py-1 text-right font-bold text-slate-700 tabular-nums">{formatCurrency(p.iva_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
