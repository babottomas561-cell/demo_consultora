const CHART_BARS = [65, 90, 50, 78, 42, 85, 60, 72];
const TABLE_WIDTHS = [['w-1/3', 'w-1/4', 'w-1/5'], ['w-2/5', 'w-1/5', 'w-1/6'], ['w-1/4', 'w-1/3', 'w-1/4'], ['w-2/5', 'w-1/6', 'w-1/5'], ['w-1/3', 'w-1/4', 'w-1/3']];

export function ChartSkeleton() {
  return (
    <div className="h-full w-full p-4 flex flex-col justify-end gap-2 animate-pulse">
      <div className="h-2.5 w-1/3 bg-slate-200 rounded mb-2" />
      <div className="flex items-end gap-2 flex-1">
        {CHART_BARS.map((pct, i) => (
          <div key={i} className="flex-1 bg-slate-200 rounded-t" style={{ height: `${pct}%` }} />
        ))}
      </div>
      <div className="h-2 w-full bg-slate-100 rounded" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="h-full w-full p-4 space-y-3 animate-pulse">
      <div className="flex gap-3 border-b border-slate-100 pb-2">
        {['w-1/3', 'w-1/4', 'w-1/5'].map((w, i) => (
          <div key={i} className={`h-2.5 ${w} bg-slate-200 rounded`} />
        ))}
      </div>
      {TABLE_WIDTHS.map((row, ri) => (
        <div key={ri} className="flex gap-3">
          {row.map((w, ci) => (
            <div key={ci} className={`h-2.5 ${w} bg-slate-200 rounded`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default ChartSkeleton;
