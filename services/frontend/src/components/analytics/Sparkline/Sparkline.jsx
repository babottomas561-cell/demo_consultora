import { useMemo } from 'react';

const Sparkline = ({
  data = [],
  width = 80,
  height = 24,
  stroke = '#4f46e5',
  fill = 'none',
  strokeWidth = 1.5,
  showArea = false,
  showDots = false,
  showLastDot = true,
  className,
}) => {
  const { path, areaPath, lastPoint, minPoint, maxPoint } = useMemo(() => {
    const nums = data.map(Number).filter(Number.isFinite);
    if (nums.length < 2) return { path: '', areaPath: '', lastPoint: null, minPoint: null, maxPoint: null };

    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;
    const stepX = width / (nums.length - 1);

    const points = nums.map((v, i) => ({
      x: i * stepX,
      y: height - ((v - min) / range) * (height - 4) - 2,
      value: v,
    }));

    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    const area = `${d} L${width},${height} L0,${height} Z`;

    return {
      path: d,
      areaPath: area,
      lastPoint: points[points.length - 1],
      minPoint: points.reduce((a, b) => (a.value < b.value ? a : b)),
      maxPoint: points.reduce((a, b) => (a.value > b.value ? a : b)),
    };
  }, [data, width, height]);

  if (!path) return <div style={{ width, height }} className={className} />;

  return (
    <svg width={width} height={height} className={className} aria-hidden>
      {showArea && (
        <path d={areaPath} fill={stroke} fillOpacity={0.1} stroke="none" />
      )}
      <path d={path} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {showDots && data.map((_, i) => {
        const x = (i * width) / (data.length - 1);
        return <circle key={i} cx={x} cy={height / 2} r={1.5} fill={stroke} />;
      })}
      {showLastDot && lastPoint && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill={stroke} stroke="#fff" strokeWidth={1} />
      )}
    </svg>
  );
};

export default Sparkline;
