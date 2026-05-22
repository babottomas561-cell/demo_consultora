import { Inbox } from 'lucide-react';
import { useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const GRADIENT_COLORS = ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-slate-700">{label}</p>
      <div className="flex justify-between gap-4 text-slate-600">
        <span># tickets</span>
        <span className="font-semibold tabular-nums text-slate-800">{d?.cantidad?.toLocaleString('es-AR')}</span>
      </div>
      <div className="flex justify-between gap-4 text-slate-600">
        <span>Ticket prom.</span>
        <span className="font-semibold tabular-nums text-slate-800">{fmtM(d?.ticket_promedio)}</span>
      </div>
      <div className="flex justify-between gap-4 text-slate-600">
        <span>Facturado</span>
        <span className="font-semibold tabular-nums text-slate-800">{fmtM(d?.facturado)}</span>
      </div>
    </div>
  );
};

export default function TicketDistribucionWidget() {
  const { ticketDist, loadingTicketDist, fetchTicketDist } = useVentasData();

  useEffect(() => { fetchTicketDist(); }, [fetchTicketDist]);

  if (loadingTicketDist) return <ChartSkeleton />;

  const data = ticketDist?.distribucion ?? [];
  const totalTickets = ticketDist?.total_tickets ?? 0;
  const p50 = ticketDist?.p50_bucket;

  if (!data.length) return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-400">
      <Inbox size={24} />
      <p className="text-sm">Sin datos de distribución.</p>
    </div>
  );

  const maxCount = Math.max(...data.map(d => d.cantidad));

  return (
    <div className="h-full flex flex-col px-3 py-2 gap-2">
      {/* Header KPIs */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-2 flex-1">
          <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">Total tickets FA</p>
          <p className="text-lg font-bold text-indigo-700 tabular-nums">{totalTickets.toLocaleString('es-AR')}</p>
        </div>
        {p50 && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 flex-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Rango mediana (P50)</p>
            <p className="text-sm font-bold text-slate-700">{p50}</p>
          </div>
        )}
      </div>

      {/* Histogram */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 4, right: 4, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="bucket" axisLine={false} tickLine={false}
              tick={{ fill: '#64748b', fontSize: 9 }} interval={0}
              angle={-25} textAnchor="end" height={36} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cantidad" name="Tickets" radius={[3, 3, 0, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={GRADIENT_COLORS[i % GRADIENT_COLORS.length]}
                  opacity={p50 && d.bucket === p50 ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-slate-400 text-center shrink-0">
        Distribución por rango de importe de factura (FA)
      </p>
    </div>
  );
}
