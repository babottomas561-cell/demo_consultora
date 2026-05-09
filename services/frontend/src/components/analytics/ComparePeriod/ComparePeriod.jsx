import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../ui/utils';

const formatters = {
  currency: (v) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v ?? 0),
  number:   (v) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(v ?? 0),
  percent:  (v) => `${Number(v ?? 0).toFixed(1)}%`,
  custom:   (v) => String(v ?? ''),
};

const ComparePeriod = ({
  current,
  previous,
  format = 'number',
  label,
  className,
}) => {
  const fmt = formatters[format] ?? formatters.custom;

  const variation = previous != null && previous !== 0
    ? ((current - previous) / Math.abs(previous)) * 100
    : null;

  const isPositive = variation > 0;
  const isZero = variation === 0;

  const Icon = isZero || variation == null ? Minus : isPositive ? TrendingUp : TrendingDown;
  const varColor = isZero || variation == null
    ? 'text-slate-400'
    : isPositive ? 'text-emerald-600' : 'text-red-600';

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <span className="text-2xl font-bold tabular-nums text-slate-900">{fmt(current)}</span>
      {previous != null && (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-slate-400 tabular-nums">{fmt(previous)}</span>
          {label && <span className="text-xs text-slate-300">{label}</span>}
          {variation != null && (
            <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', varColor)}>
              <Icon size={12} />
              {Math.abs(variation).toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ComparePeriod;
