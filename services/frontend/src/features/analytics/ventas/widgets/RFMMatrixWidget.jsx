import { Inbox } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';
import { formatCurrency } from '../../analyticsUtils';

// Assign 1-5 quintile score (5 = best)
const score = (val, allVals, higherIsBetter) => {
  const sorted = [...allVals].filter((v) => v != null).sort((a, b) => a - b);
  const rank = sorted.indexOf(val);
  if (rank < 0) return 3;
  const pct = rank / (sorted.length - 1 || 1);
  const q = Math.ceil(pct * 5) || 1;
  return higherIsBetter ? q : 6 - q;
};

const RFM_SEGMENTS = [
  { label: 'Champions',    minR: 4, minF: 4, color: '#4f46e5', bg: 'bg-indigo-100 text-indigo-800' },
  { label: 'Leales',       minR: 3, minF: 4, color: '#059669', bg: 'bg-emerald-100 text-emerald-800' },
  { label: 'Potenciales',  minR: 4, minF: 2, color: '#0891b2', bg: 'bg-cyan-100 text-cyan-800' },
  { label: 'En riesgo',    minR: 2, minF: 3, color: '#d97706', bg: 'bg-amber-100 text-amber-800' },
  { label: 'Perdidos',     minR: 1, minF: 1, color: '#ef4444', bg: 'bg-red-100 text-red-800' },
];

const getRFMLabel = (r, f) => {
  if (r >= 4 && f >= 4) return RFM_SEGMENTS[0];
  if (r >= 3 && f >= 4) return RFM_SEGMENTS[1];
  if (r >= 4 && f >= 2) return RFM_SEGMENTS[2];
  if (r >= 2 && f >= 3) return RFM_SEGMENTS[3];
  return RFM_SEGMENTS[4];
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const seg = getRFMLabel(d.rScore, d.fScore);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs min-w-[200px]">
      <p className="font-semibold text-slate-800 mb-2 truncate">{d.nombre}</p>
      <div className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold mb-2 ${seg.bg}`}>{seg.label}</div>
      <div className="space-y-0.5">
        <p className="text-slate-500">Recencia: <span className="font-semibold text-slate-800">{d.dias_sin_comprar} días</span></p>
        <p className="text-slate-500">Frecuencia: <span className="font-semibold text-slate-800">{d.tickets} tickets</span></p>
        <p className="text-slate-500">Monetario: <span className="font-semibold text-slate-800">{formatCurrency(d.monetario)}</span></p>
        <p className="text-slate-400 mt-1">Scores R:{d.rScore} F:{d.fScore} M:{d.mScore}</p>
      </div>
    </div>
  );
};

const AXIS_LABELS = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' };

export default function RFMMatrixWidget() {
  const { clientes: data, loadingClientes, fetchClientes } = useVentasData();
  const [activeSegment, setActiveSegment] = useState(null);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const rfmData = useMemo(() => {
    const list = data?.clientes ?? [];
    if (!list.length) return [];

    const recencias = list.map((c) => c.dias_sin_comprar ?? 0);
    const freqs = list.map((c) => c.tickets ?? 0);
    const monetarios = list.map((c) => c.facturado_neto ?? 0);

    return list.map((c) => {
      const rScore = score(c.dias_sin_comprar ?? 0, recencias, false);
      const fScore = score(c.tickets ?? 0, freqs, true);
      const mScore = score(c.facturado_neto ?? 0, monetarios, true);
      const seg = getRFMLabel(rScore, fScore);
      return {
        nombre: c.cliente_nombre,
        rScore,
        fScore,
        mScore,
        monetario: c.facturado_neto,
        dias_sin_comprar: c.dias_sin_comprar,
        tickets: c.tickets,
        segLabel: seg.label,
        color: seg.color,
        size: Math.max(20, Math.min(400, (c.facturado_neto / (Math.max(...monetarios) || 1)) * 400)),
      };
    });
  }, [data]);

  const segmentCounts = useMemo(() => {
    const counts = {};
    rfmData.forEach((d) => {
      counts[d.segLabel] = (counts[d.segLabel] || 0) + 1;
    });
    return counts;
  }, [rfmData]);

  const filteredData = useMemo(() => (
    activeSegment ? rfmData.filter((d) => d.segLabel === activeSegment) : rfmData
  ), [rfmData, activeSegment]);

  if (loadingClientes) return <ChartSkeleton />;
  if (!rfmData.length) return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-slate-400">
      <Inbox size={24} />
      <p className="text-sm">Sin datos de clientes.</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden">
      {/* Segment filter chips */}
      <div className="flex flex-wrap gap-1.5 shrink-0">
        {RFM_SEGMENTS.map((seg) => {
          const count = segmentCounts[seg.label] ?? 0;
          if (!count) return null;
          return (
            <button
              key={seg.label}
              onClick={() => setActiveSegment(activeSegment === seg.label ? null : seg.label)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all ${
                activeSegment === seg.label ? seg.bg + ' ring-1 ring-current' :
                activeSegment ? 'bg-slate-100 text-slate-400' : seg.bg
              }`}
            >
              {seg.label} · {count}
            </button>
          );
        })}
      </div>

      {/* Scatter chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: 8, right: 8, top: 8, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number" dataKey="rScore" domain={[0.5, 5.5]} ticks={[1,2,3,4,5]}
              axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }}
              label={{ value: 'Recencia (5=más reciente)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#94a3b8' }}
            />
            <YAxis
              type="number" dataKey="fScore" domain={[0.5, 5.5]} ticks={[1,2,3,4,5]}
              axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }}
              label={{ value: 'Frecuencia', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94a3b8' }}
            />
            <ZAxis type="number" dataKey="size" range={[20, 250]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={filteredData} isAnimationActive={false}>
              {filteredData.map((d, i) => (
                <Cell key={i} fill={d.color} fillOpacity={0.75} stroke={d.color} strokeWidth={0.5} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-slate-400 text-center shrink-0">Tamaño del punto ∝ Monetario · Filtrar por segmento haciendo clic arriba</p>
    </div>
  );
}
