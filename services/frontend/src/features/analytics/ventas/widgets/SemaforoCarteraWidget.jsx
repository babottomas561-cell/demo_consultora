import React from 'react';
import { Inbox } from 'lucide-react';
import { useVentasData } from '../VentasDataContext';
import { formatCurrency } from '../../analyticsUtils';

const COLOR_CONFIG = {
  verde:    { bg: 'bg-emerald-50',  border: 'border-emerald-400', dot: '#22c55e', label: 'Al día' },
  amarillo: { bg: 'bg-amber-50',    border: 'border-amber-400',   dot: '#eab308', label: 'Con mora' },
  rojo:     { bg: 'bg-red-50',      border: 'border-red-400',     dot: '#ef4444', label: 'En riesgo' },
  sin_dato: { bg: 'bg-slate-50',    border: 'border-slate-300',   dot: '#64748b', label: 'Sin dato' },
};

export default function SemaforoCarteraWidget() {
  const { semaforoCartera, semaforoCarteraLoading } = useVentasData();

  if (semaforoCarteraLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400 text-sm">Cargando semáforo...</p>
      </div>
    );
  }

  const data = semaforoCartera?.semaforo ?? [];
  const totalCartera = semaforoCartera?.total_cartera ?? 0;

  if (!data.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-400">
        <Inbox size={24} />
        <p className="text-sm">Sin datos de cartera.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3 px-4 py-3">
      <div className="flex justify-between items-baseline shrink-0">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          Semáforo de Cartera
        </span>
        <span className="text-[10px] text-slate-400">
          Total: {formatCurrency(totalCartera)}
        </span>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {data.map((item) => {
          const cfg = COLOR_CONFIG[item.color] ?? COLOR_CONFIG.sin_dato;
          return (
            <div
              key={item.color}
              className={`${cfg.bg} border ${cfg.border} rounded-xl px-3.5 py-2.5 flex items-center gap-2.5`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-800">
                  {cfg.label}
                  <span className="ml-2 font-normal text-xs text-slate-400">
                    {item.clientes} cliente{item.clientes !== 1 ? 's' : ''}
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deuda: <strong className="text-slate-700">{formatCurrency(item.saldo_deudor)}</strong>
                  {item.saldo_a_favor > 0 && (
                    <span className="ml-2">
                      A favor: <strong className="text-emerald-600">{formatCurrency(item.saldo_a_favor)}</strong>
                    </span>
                  )}
                </p>
              </div>
              <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color: cfg.dot }}>
                {item.pct_cartera?.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
