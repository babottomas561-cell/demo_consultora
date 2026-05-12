import { useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '../../analyticsUtils';
import { useVentasData } from '../VentasDataContext';

const TIPO_COLORS = { FA: '#4f46e5', NC: '#ef4444', ND: '#f97316', PR: '#8b5cf6' };
const COND_PALETTE = ['#4f46e5', '#16a34a', '#eab308', '#94a3b8'];
const CONDICION_LABEL = { '1': 'Efectivo', '2': 'Cta Cte', '3': 'Tarjeta', '4': 'Otros' };

export default function ComprobantesTipoWidget() {
  const { comprobantes: data, loadingComprobantes, fetchComprobantes } = useVentasData();

  useEffect(() => { fetchComprobantes(); }, [fetchComprobantes]);

  if (loadingComprobantes) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;
  }

  const tipoData = (data?.por_tipo ?? [])
    .map((r) => ({ name: r.tipo, value: Math.abs(r.importe), color: TIPO_COLORS[r.tipo] ?? '#94a3b8' }))
    .filter((r) => r.value > 0);

  const condData = (data?.por_condicion_venta ?? [])
    .filter((r) => r.importe > 0)
    .map((r, i) => ({ name: CONDICION_LABEL[r.condicion] ?? r.condicion, value: r.importe, color: COND_PALETTE[i % COND_PALETTE.length] }));

  if (!tipoData.length && !condData.length) return <p className="p-4 text-sm text-slate-400">Sin datos de comprobantes.</p>;

  const Donut = ({ chartData, title }) => (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-slate-500 mb-1 px-1">{title}</p>
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value" isAnimationActive={false}>
            {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-[10px]">{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="h-full w-full p-4 pt-0 flex gap-2">
      {tipoData.length > 0 && <Donut chartData={tipoData} title="Por tipo comprobante" />}
      {condData.length > 0 && <Donut chartData={condData} title="Por condición de venta" />}
    </div>
  );
}
