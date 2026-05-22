import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Inbox } from 'lucide-react';
import { useVentasData } from '../VentasDataContext';
import { formatCurrency } from '../../analyticsUtils';

const COLORS = {
  EF: '#22c55e',
  CH: '#3b82f6',
  TC: '#a855f7',
  otro: '#94a3b8',
};

const LABEL_MAP = { EF: 'Efectivo', CH: 'Cheque', TC: 'Tarjeta' };

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs min-w-[160px]">
      <p className="font-bold text-slate-700 mb-1">{d.label}</p>
      <p className="text-slate-600">Total: <strong className="text-slate-800">{formatCurrency(d.total)}</strong></p>
      <p className="text-slate-600">Operaciones: <strong>{d.operaciones}</strong></p>
      <p className="text-slate-600">Participación: <strong>{d.pct?.toFixed(1)}%</strong></p>
    </div>
  );
};

export default function MediosPagoWidget() {
  const { mediosPago, mediosPagoLoading } = useVentasData();

  if (mediosPagoLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400 text-sm">Cargando medios de pago...</p>
      </div>
    );
  }

  const medios = (mediosPago?.medios ?? []).map((m) => ({
    ...m,
    label: LABEL_MAP[m.forma_pago?.toUpperCase()] ?? m.forma_pago,
    fill: COLORS[m.forma_pago?.toUpperCase()] ?? COLORS.otro,
  }));

  const totalCobrado = mediosPago?.total_cobrado ?? 0;

  if (!medios.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-400">
        <Inbox size={24} />
        <p className="text-sm">Sin cobros en el período.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 px-4 py-3">
      <div className="flex justify-between items-baseline shrink-0">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          Medios de Cobro
        </span>
        <span className="text-[10px] text-slate-400">
          Total: {formatCurrency(totalCobrado)}
        </span>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={medios}
              dataKey="total"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="50%"
              outerRadius="80%"
              paddingAngle={3}
            >
              {medios.map((m) => (
                <Cell key={m.forma_pago} fill={m.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-xs text-slate-500">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0">
        {medios.map((m) => (
          <div key={m.forma_pago} className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: m.fill }} />
            <span className="flex-1">{m.label}</span>
            <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(m.total)}</span>
            <span className="text-slate-400 min-w-[42px] text-right tabular-nums">{m.pct?.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
