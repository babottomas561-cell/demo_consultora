import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useVentasData } from '../VentasDataContext';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const fmtCurrency = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(v ?? 0));

const lerp = (a, b, t) => a + (b - a) * t;

// Returns a hex color interpolating between two colors based on intensity [0,1]
const intensityColor = (t) => {
  if (t <= 0) return '#f1f5f9';
  // slate-100 → indigo-300 → indigo-600
  const r = Math.round(lerp(214, 99, Math.min(t, 1)));
  const g = Math.round(lerp(224, 102, Math.min(t, 1)));
  const b = Math.round(lerp(235, 241, Math.min(t, 1)));
  return `rgb(${r},${g},${b})`;
};

export default function SeasonalityHeatmap() {
  const { fetchHeatmap, heatmap, loadingHeatmap } = useVentasData();
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    fetchHeatmap?.();
  }, [fetchHeatmap]);

  const { weeks, maxVal, monthLabels } = useMemo(() => {
    const series = heatmap?.series ?? [];
    if (!series.length) return { weeks: [], maxVal: 0, monthLabels: [] };

    // Build a map of date → value
    const byDate = {};
    series.forEach((r) => {
      const dateStr = String(r.periodo ?? '').substring(0, 10);
      if (dateStr) byDate[dateStr] = Number(r.facturado ?? 0);
    });

    const dates = Object.keys(byDate).sort();
    if (!dates.length) return { weeks: [], maxVal: 0, monthLabels: [] };

    const start = new Date(`${dates[0]}T00:00:00`);
    // Align to Sunday of that week
    const startSunday = new Date(start);
    startSunday.setDate(start.getDate() - start.getDay());

    const end = new Date(`${dates[dates.length - 1]}T00:00:00`);
    const endSaturday = new Date(end);
    endSaturday.setDate(end.getDate() + (6 - end.getDay()));

    const allWeeks = [];
    let weekDays = [];
    const cursor = new Date(startSunday);
    let monthLabelPositions = [];
    let weekIndex = 0;

    while (cursor <= endSaturday) {
      const dateStr = cursor.toISOString().substring(0, 10);
      const val = byDate[dateStr] ?? 0;
      const dayOfMonth = cursor.getDate();
      const month = cursor.getMonth();

      if (cursor.getDay() === 1 && dayOfMonth <= 7) {
        monthLabelPositions.push({ weekIndex, label: MONTHS_SHORT[month] });
      }

      weekDays.push({ date: dateStr, value: val, dayOfWeek: cursor.getDay() });

      if (cursor.getDay() === 6) {
        allWeeks.push(weekDays);
        weekDays = [];
        weekIndex++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (weekDays.length) allWeeks.push(weekDays);

    const maxVal = Math.max(...Object.values(byDate).filter((v) => v > 0), 1);

    return { weeks: allWeeks, maxVal, monthLabels: monthLabelPositions };
  }, [heatmap]);

  if (loadingHeatmap) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-indigo-400" size={24} />
      </div>
    );
  }

  if (!weeks.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-slate-400">Sin datos diarios disponibles.</p>
      </div>
    );
  }

  const CELL = 13;
  const GAP = 2;
  const LABEL_W = 28;

  return (
    <div className="h-full w-full p-4 overflow-auto flex flex-col gap-3">
      <div className="text-xs text-slate-500 font-medium">Facturado diario (intensidad de color)</div>

      <div className="relative">
        {/* Month labels */}
        <div className="flex ml-[28px] mb-1 relative h-4 overflow-hidden">
          {monthLabels.map((ml, i) => (
            <div
              key={i}
              className="absolute text-[10px] text-slate-500 font-medium"
              style={{ left: ml.weekIndex * (CELL + GAP) }}
            >
              {ml.label}
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-[2px] mr-0.5 shrink-0">
            {DAYS.map((d, i) => (
              <div
                key={d}
                className="flex items-center justify-end text-[9px] text-slate-400"
                style={{ height: CELL, width: LABEL_W - 4, opacity: i % 2 === 1 ? 1 : 0 }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[2px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {Array.from({ length: 7 }, (_, di) => {
                  const cell = week.find((c) => c.dayOfWeek === di);
                  const val = cell?.value ?? 0;
                  const t = val > 0 ? Math.sqrt(val / maxVal) : 0;
                  const color = intensityColor(t);
                  return (
                    <div
                      key={di}
                      style={{ width: CELL, height: CELL, backgroundColor: color, borderRadius: 2, cursor: cell ? 'pointer' : 'default' }}
                      onMouseEnter={(e) => {
                        if (!cell) return;
                        setTooltip({ date: cell.date, value: cell.value, x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-[10px] text-slate-400">
        <span>Menos</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => (
          <div key={t} style={{ width: 11, height: 11, backgroundColor: intensityColor(t), borderRadius: 2 }} />
        ))}
        <span>Más</span>
      </div>

      {/* Tooltip portal-free */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs pointer-events-none"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <p className="font-semibold text-slate-700">{tooltip.date}</p>
          <p className="text-slate-600">{tooltip.value > 0 ? fmtCurrency(tooltip.value) : 'Sin ventas'}</p>
        </div>
      )}
    </div>
  );
}
