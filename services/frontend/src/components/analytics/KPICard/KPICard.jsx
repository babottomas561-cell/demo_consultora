import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../ui/utils';
import Card from '../../ui/Card';
import { SkeletonKPI } from '../SkeletonLoader/SkeletonLoader';
import AlertBadge from '../AlertBadge/AlertBadge';

const tones = {
  neutral:  { border: 'border-t-indigo-600', pill: 'bg-indigo-50 text-indigo-700',  spark: '#4f46e5' },
  success:  { border: 'border-t-emerald-600', pill: 'bg-emerald-50 text-emerald-700', spark: '#16a34a' },
  warning:  { border: 'border-t-amber-500',   pill: 'bg-amber-50 text-amber-700',    spark: '#eab308' },
  danger:   { border: 'border-t-red-600',     pill: 'bg-red-50 text-red-700',        spark: '#dc2626' },
};

const formatters = {
  currency: (v) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v ?? 0),
  number:   (v) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(v ?? 0),
  percent:  (v) => `${Number(v ?? 0).toFixed(1)}%`,
  custom:   (v) => v,
};

const normalizeSparkline = (values) => {
  const nums = (values ?? []).map(Number).filter(Number.isFinite);
  if (nums.length < 2) return null;
  const min = Math.min(...nums), max = Math.max(...nums);
  const range = max - min || 1;
  const step = 80 / (nums.length - 1);
  return nums.map((v, i) => `${(i * step).toFixed(2)},${(24 - ((v - min) / range) * 20).toFixed(2)}`).join(' ');
};

const VariationBadge = ({ variation }) => {
  if (variation == null) return null;
  const positive = variation > 0;
  const zero = variation === 0;
  const Icon = zero ? Minus : positive ? TrendingUp : TrendingDown;
  const cls = zero
    ? 'bg-slate-100 text-slate-600'
    : positive
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-red-100 text-red-700';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', cls)}>
      <Icon size={11} />
      {Math.abs(variation).toFixed(1)}%
    </span>
  );
};

const KPICard = ({
  label,
  value,
  subtitle,
  icon: Icon,
  severity = 'neutral',
  compareValue,
  compareLabel,
  variation,
  format = 'custom',
  formatter,
  sparklineData,
  alert,
  loading = false,
  onClick,
  className,
}) => {
  if (loading) return <SkeletonKPI />;

  const palette = tones[severity] ?? tones.neutral;
  const fmt = formatter ?? formatters[format] ?? formatters.custom;
  const points = normalizeSparkline(sparklineData);
  const displayValue = fmt(value);

  return (
    <Card
      className={cn('min-h-[118px] border-t-[3px] p-5', palette.border, onClick && 'cursor-pointer hover:shadow-md transition-shadow', className)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">{label}</p>
          <div className={cn('mt-3 inline-flex rounded-lg px-3 py-1', palette.pill)}>
            <span className="text-xl font-bold tabular-nums">{displayValue}</span>
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          {compareValue != null && (
            <p className="mt-1 text-xs text-slate-400">
              {fmt(compareValue)} <span className="text-slate-300">{compareLabel}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {variation != null && <VariationBadge variation={variation} />}
          {Icon && !variation && (
            <div className="rounded-lg bg-slate-50 p-2 text-slate-500"><Icon size={20} /></div>
          )}
        </div>
      </div>

      {alert && (
        <div className="mt-3">
          <AlertBadge severity={alert.severity} message={alert.message} action={alert.action} onAction={alert.onAction} />
        </div>
      )}

      {points && (
        <div className="mt-4 flex items-end justify-end">
          <svg className="h-7 w-20" viewBox="0 0 80 28" preserveAspectRatio="none" aria-hidden="true">
            <polyline fill="none" stroke={palette.spark} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
          </svg>
        </div>
      )}
    </Card>
  );
};

export default KPICard;
