const fmtAR = (v, format) => {
  if (format === 'currency') {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v ?? 0);
  }
  if (format === 'percent') return `${Number(v ?? 0).toFixed(1)}%`;
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(v ?? 0);
};

const ChartTooltip = ({
  active,
  payload,
  label,
  format = 'number',
  labelFormatter,
  valueFormatter,
}) => {
  if (!active || !payload?.length) return null;

  const displayLabel = labelFormatter ? labelFormatter(label) : label;
  const fmt = valueFormatter ?? ((v) => fmtAR(v, format));

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-sm">
      {displayLabel && (
        <p className="mb-1.5 font-semibold text-slate-700 border-b border-slate-100 pb-1">{displayLabel}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: entry.color ?? entry.fill ?? '#4f46e5' }}
            />
            <span className="text-slate-500 flex-1">{entry.name ?? entry.dataKey}</span>
            <span className="font-semibold text-slate-800 tabular-nums">{fmt(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartTooltip;
