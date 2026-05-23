import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Inbox } from 'lucide-react';
import { useVentasData } from '../VentasDataContext';
import { formatCurrency } from '../../analyticsUtils';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs min-w-[170px]">
      <p className="font-bold text-slate-700 mb-1">{d.vendedor_nombre || label}</p>
      <p className="text-slate-600">Presupuestos: <strong>{d.total}</strong></p>
      <p className="text-slate-600">Confirmados: <strong>{d.confirmados}</strong></p>
      <p className="text-slate-600">Tasa: <strong className="text-emerald-600">{d.tasa_pct?.toFixed(1)}%</strong></p>
      <p className="text-slate-600">Monto confirmado: <strong>{formatCurrency(d.monto_confirmado)}</strong></p>
    </div>
  );
};

export default function ConversionWidget() {
  const { conversion, conversionLoading } = useVentasData();

  if (conversionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400 text-sm">Cargando conversión...</p>
      </div>
    );
  }

  const data = conversion ?? {};
  const porVendedor = (data.por_vendedor ?? []).slice(0, 10);
  const porCanal = data.por_canal ?? [];
  const tasaGlobal = data.tasa_conversion_pct ?? 0;
  const total = data.total ?? 0;
  const confirmados = data.confirmados ?? 0;

  if (!total) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-400">
        <Inbox size={24} />
        <p className="text-sm">Sin presupuestos en el período.</p>
      </div>
    );
  }

  const kpiItems = [
    { label: 'Tasa global', value: `${tasaGlobal.toFixed(1)}%`, color: tasaGlobal >= 50 ? '#22c55e' : tasaGlobal >= 25 ? '#eab308' : '#ef4444' },
    { label: 'Total emitidos', value: total },
    { label: 'Confirmados', value: confirmados, color: '#22c55e' },
    { label: 'Sin confirmar', value: total - confirmados, color: '#ef4444' },
  ];

  return (
    <div className="h-full flex flex-col gap-3 px-4 py-3">
      <div className="shrink-0">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          Conversión Presupuestos
        </span>
      </div>

      <div className="flex gap-2.5 shrink-0">
        {kpiItems.map((k) => (
          <div key={k.label} className="flex-1 bg-slate-50 rounded-lg px-2.5 py-2 text-center">
            <p className="text-lg font-bold tabular-nums" style={{ color: k.color ?? '#0f172a' }}>
              {k.value}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {porVendedor.length > 0 && (
        <div className="flex-1 min-h-0">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5">
            Tasa de cierre por vendedor
          </p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porVendedor} layout="vertical" margin={{ left: 4, right: 30, top: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="vendedor_nombre" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="tasa_pct" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {porVendedor.map((v) => (
                  <Cell
                    key={v.cod_vendedor}
                    fill={v.tasa_pct >= 50 ? '#22c55e' : v.tasa_pct >= 25 ? '#eab308' : '#ef4444'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {porCanal.length > 0 && (
        <div className="flex gap-2 flex-wrap shrink-0">
          {porCanal.map((c) => (
            <div key={c.canal} className="bg-slate-50 rounded-md px-2.5 py-1 text-[11px] text-slate-500">
              {c.canal}: <strong>{c.tasa_pct?.toFixed(0)}%</strong> ({c.confirmados}/{c.total})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
