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
  extraFields = [],
}) => {
  if (!active || !payload?.length) return null;

  const displayLabel = labelFormatter ? labelFormatter(label) : label;
  const fmt = valueFormatter ?? ((v) => fmtAR(v, format));
  const datum = payload[0]?.payload;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-sm max-w-[260px]">
      {displayLabel && (
        <p className="mb-1.5 font-semibold text-slate-700 border-b border-slate-100 pb-1 truncate">{displayLabel}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: entry.color ?? entry.fill ?? '#4f46e5' }}
            />
            <span className="text-slate-500 flex-1 truncate">{entry.name ?? entry.dataKey}</span>
            <span className="font-semibold text-slate-800 tabular-nums shrink-0">{fmt(entry.value)}</span>
          </div>
        ))}
      </div>
      {extraFields.length > 0 && datum && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-0.5">
          {extraFields.map((f) => {
            const val = datum[f.key];
            if (val == null || val === '') return null;
            let formatted;
            if (f.format === 'currency') formatted = fmtAR(val, 'currency');
            else if (f.format === 'percent') formatted = `${Number(val).toFixed(1)}%`;
            else if (f.suffix) formatted = `${Number(val).toFixed(f.decimals ?? 1)}${f.suffix}`;
            else formatted = String(val);
            return (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <span className="text-slate-400 text-xs">{f.label}</span>
                <span className="text-slate-600 text-xs tabular-nums font-medium">{formatted}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChartTooltip;
