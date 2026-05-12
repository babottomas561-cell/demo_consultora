import { useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '../../analyticsUtils';
import { useVentasData } from '../VentasDataContext';

const SEGMENTO_COLORS = { A: '#4f46e5', B: '#eab308', C: '#94a3b8' };

export default function AbcClientesWidget() {
  const { clientes: data, loadingClientes, fetchClientes } = useVentasData();

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  if (loadingClientes) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;
  }

  const abc = data?.abc_summary ?? {};
  const donutData = Object.entries(abc).map(([seg, vals]) => ({
    name: `Segmento ${seg}`,
    value: vals.facturado,
    color: SEGMENTO_COLORS[seg] ?? '#94a3b8',
    clientes: vals.clientes,
  }));

  if (!donutData.length) return <p className="p-4 text-sm text-slate-400">Sin datos de clientes.</p>;

  return (
    <div className="h-full w-full p-4 pt-0 flex flex-col gap-3">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value" isAnimationActive={false}>
              {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Legend formatter={(v, e) => `${v} (${e.payload.clientes} clientes)`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-2 flex-wrap">
        {Object.entries(abc).map(([seg, vals]) => (
          <div key={seg} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm flex-1 min-w-[120px]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: SEGMENTO_COLORS[seg] }}>
              {seg}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-slate-900 truncate">{formatCurrency(vals.facturado)}</p>
              <p className="text-[10px] text-slate-400">{vals.clientes} clientes</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
