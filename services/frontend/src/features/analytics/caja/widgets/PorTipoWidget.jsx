import { Inbox } from 'lucide-react';
import { useEffect } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useCajaData } from '../CajaDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const TIPO_COLORS = [
  '#4f46e5', '#10b981', '#f97316', '#ec4899', '#8b5cf6',
  '#06b6d4', '#eab308', '#ef4444', '#14b8a6', '#a855f7',
];

export default function PorTipoWidget() {
  const { porTipo, loadingPorTipo, fetchPorTipo } = useCajaData();

  useEffect(() => { fetchPorTipo(); }, [fetchPorTipo]);

  if (loadingPorTipo) return <ChartSkeleton />;
  if (!porTipo) return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-400">
      <Inbox size={24} />
      <p className="text-sm">Sin datos por tipo.</p>
    </div>
  );

  const tipos = porTipo.por_tipo ?? [];

  const pieIngData = tipos
    .filter((t) => t.ingresos > 0)
    .map((t, i) => ({ name: t.tipo, value: t.ingresos, fill: TIPO_COLORS[i % TIPO_COLORS.length] }));

  const pieEgrData = tipos
    .filter((t) => t.egresos > 0)
    .map((t, i) => ({ name: t.tipo, value: t.egresos, fill: TIPO_COLORS[i % TIPO_COLORS.length] }));

  const renderLabel = ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Pie charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-3 pt-3 shrink-0">
        {pieIngData.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Ingresos por tipo</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieIngData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={renderLabel}
                  labelLine={false}
                >
                  {pieIngData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {pieEgrData.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1">Egresos por tipo</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieEgrData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={renderLabel}
                  labelLine={false}
                >
                  {pieEgrData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Summary table */}
      <div className="flex-1 overflow-auto min-h-0 px-3 pb-3 mt-2">
        <p className="text-xs font-semibold text-slate-600 mb-1">Detalle por tipo de movimiento</p>
        <table className="min-w-full text-xs border-collapse rounded-xl overflow-hidden border border-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['Tipo', 'Ingresos', 'Egresos', 'Neto', 'Movimientos'].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tipos.map((t, i) => (
              <tr key={t.tipo ?? i} className="hover:bg-slate-50">
                <td className="px-3 py-1.5 font-medium text-slate-800">{t.tipo}</td>
                <td className="px-3 py-1.5 tabular-nums text-right text-emerald-600 font-medium">{formatCurrency(t.ingresos)}</td>
                <td className="px-3 py-1.5 tabular-nums text-right text-red-500 font-medium">{formatCurrency(t.egresos)}</td>
                <td className={`px-3 py-1.5 tabular-nums text-right font-semibold ${(t.neto ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(t.neto)}
                </td>
                <td className="px-3 py-1.5 tabular-nums text-right text-slate-600">{formatNumber(t.movimientos)}</td>
              </tr>
            ))}
            {!tipos.length && (
              <tr><td colSpan={5} className="px-3 py-3 text-slate-400">Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
