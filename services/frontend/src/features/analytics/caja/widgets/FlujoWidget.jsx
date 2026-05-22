import { Inbox } from 'lucide-react';
import {
  Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart,
  Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useCajaData } from '../CajaDataContext';
import { formatCurrency } from '../../analyticsUtils';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const fmtPeriod = (v) => {
  if (!v) return '';
  const raw = String(v);
  const date = raw.length === 7 ? new Date(`${raw}-01T00:00:00`) : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return `${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
};

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export default function FlujoWidget() {
  const { flujo, loadingFlujo } = useCajaData();

  if (loadingFlujo) {
    return <ChartSkeleton />;
  }
  if (!flujo) return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-400">
      <Inbox size={24} />
      <p className="text-sm">Sin datos de flujo.</p>
    </div>
  );

  const chartData = (flujo.series ?? []).map((s) => ({
    periodo:         fmtPeriod(s.periodo),
    ingresos:        s.ingresos,
    egresos:         -s.egresos,          // negative to render below zero
    flujo_neto:      s.flujo_neto,
    saldo_acumulado: s.saldo_acumulado,
  }));

  const areaData = (flujo.series ?? []).map((s) => ({
    periodo:         fmtPeriod(s.periodo),
    saldo_acumulado: s.saldo_acumulado,
  }));

  return (
    <div className="h-full w-full flex flex-col gap-4 overflow-hidden p-3">
      {/* Ingresos / Egresos / Flujo neto */}
      <div className="flex-1 min-h-0">
        <p className="text-xs font-semibold text-slate-500 mb-1">Ingresos vs. Egresos mensuales</p>
        <ResponsiveContainer width="100%" height="90%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 10 }} width={56} />
            <Tooltip
              formatter={(v, name) => [
                formatCurrency(Math.abs(v)),
                name === 'egresos' ? 'Egresos' : name === 'ingresos' ? 'Ingresos' : 'Flujo neto',
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
            <Bar dataKey="ingresos"   name="Ingresos"   fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="egresos"    name="Egresos"    fill="#ef4444" radius={[0, 0, 4, 4]} />
            <Line
              type="monotone"
              dataKey="flujo_neto"
              name="Flujo neto"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Saldo acumulado */}
      <div className="flex-1 min-h-0">
        <p className="text-xs font-semibold text-slate-500 mb-1">Saldo acumulado</p>
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={areaData} margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="saldoGradCj" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 10 }} width={56} />
            <Tooltip formatter={(v) => [formatCurrency(v), 'Saldo acumulado']} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="saldo_acumulado"
              name="Saldo acumulado"
              stroke="#4f46e5"
              strokeWidth={2}
              fill="url(#saldoGradCj)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
