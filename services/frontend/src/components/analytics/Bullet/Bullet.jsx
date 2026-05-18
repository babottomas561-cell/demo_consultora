const Bullet = ({
  value = 0,
  target = 100,
  max,
  ranges = [],
  width = 140,
  height = 18,
  label,
  formatter = (v) => v,
  className,
}) => {
  const effectiveMax = max ?? Math.max(target * 1.3, value * 1.1, target + 1);
  const pct = Math.max(0, Math.min(100, (value / effectiveMax) * 100));
  const targetPct = Math.max(0, Math.min(100, (target / effectiveMax) * 100));

  const performanceColor = (() => {
    if (value >= target) return '#10b981';
    if (value >= target * 0.8) return '#f59e0b';
    return '#ef4444';
  })();

  const bgRanges = ranges.length > 0 ? ranges : [
    { from: 0, to: target * 0.6, color: '#fee2e2' },
    { from: target * 0.6, to: target * 0.85, color: '#fef3c7' },
    { from: target * 0.85, to: effectiveMax, color: '#d1fae5' },
  ];

  return (
    <div className={className}>
      {label && <div className="text-[10px] text-slate-500 mb-1">{label}</div>}
      <svg width={width} height={height} role="img" aria-label={`${formatter(value)} de ${formatter(target)}`}>
        {bgRanges.map((r, i) => {
          const x = (r.from / effectiveMax) * width;
          const w = ((r.to - r.from) / effectiveMax) * width;
          return <rect key={i} x={x} y={0} width={w} height={height} fill={r.color} />;
        })}
        <rect x={0} y={height * 0.3} width={(pct / 100) * width} height={height * 0.4} fill={performanceColor} rx={1} />
        <line
          x1={(targetPct / 100) * width}
          x2={(targetPct / 100) * width}
          y1={2}
          y2={height - 2}
          stroke="#0f172a"
          strokeWidth={2}
        />
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
        <span className="font-semibold text-slate-700">{formatter(value)}</span>
        <span>obj {formatter(target)}</span>
      </div>
    </div>
  );
};

export default Bullet;
