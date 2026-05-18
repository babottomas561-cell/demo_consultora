import { useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { formatCurrency } from '../../analyticsUtils';
import { useVentasData } from '../VentasDataContext';

const TIPO_COLORS = { FA: '#4f46e5', NC: '#ef4444', ND: '#f97316', PR: '#8b5cf6' };
const COND_PALETTE = ['#4f46e5', '#16a34a', '#eab308', '#94a3b8'];
const CONDICION_LABEL = { '1': 'Contado', '2': 'Cta Cte', '3': 'Tarjeta', '4': 'Otros' };

const fmtTooltip = (v) => formatCurrency(Math.abs(v ?? 0));

const Donut = ({ chartData, title }) => (
  <div className="flex-1 min-w-0 flex flex-col">
    <p className="text-xs font-semibold text-slate-500 mb-1 px-1 text-center">{title}</p>
    <ResponsiveContainer width="100%" height={160}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={32}
          outerRadius={58}
          paddingAngle={2}
          dataKey="value"
          isAnimationActive={false}
        >
          {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip
          formatter={fmtTooltip}
          contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
        />
        <Legend
          iconType="circle"
          iconSize={7}
          formatter={(v) => <span className="text-[10px] text-slate-600">{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export default function ComprobantesTipoWidget() {
  const { comprobantes: data, loadingComprobantes, fetchComprobantes } = useVentasData();

  useEffect(() => { fetchComprobantes(); }, [fetchComprobantes]);

  if (loadingComprobantes) {
    return <ChartSkeleton />;
  }

  const tipoData = (data?.por_tipo ?? [])
    .map((r) => ({ name: r.tipo, value: Math.abs(r.importe ?? 0), color: TIPO_COLORS[r.tipo] ?? '#94a3b8' }))
    .filter((r) => r.value > 0);

  const condData = (data?.por_condicion_venta ?? [])
    .filter((r) => (r.importe ?? 0) > 0)
    .map((r, i) => ({
      name: CONDICION_LABEL[String(r.condicion)] ?? r.condicion ?? 'Otro',
      value: r.importe,
      color: COND_PALETTE[i % COND_PALETTE.length],
    }));

  if (!tipoData.length && !condData.length) {
    return <p className="p-4 text-sm text-slate-400">Sin datos de comprobantes.</p>;
  }

  return (
    <div className="h-full w-full px-2 py-1 flex flex-col sm:flex-row gap-1">
      {tipoData.length > 0 && <Donut chartData={tipoData} title="Por tipo" />}
      {condData.length > 0 && <Donut chartData={condData} title="Por condición de venta" />}
    </div>
  );
}
