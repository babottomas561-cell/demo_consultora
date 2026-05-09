import Card from './Card';
import { cn } from './utils';

const tones = {
  default: {
    border: 'border-t-indigo-600',
    pill: 'bg-indigo-50 text-indigo-700',
    spark: '#4f46e5',
  },
  success: {
    border: 'border-t-emerald-600',
    pill: 'bg-emerald-50 text-emerald-700',
    spark: '#16a34a',
  },
  warning: {
    border: 'border-t-amber-500',
    pill: 'bg-amber-50 text-amber-700',
    spark: '#eab308',
  },
  danger: {
    border: 'border-t-red-600',
    pill: 'bg-red-50 text-red-700',
    spark: '#dc2626',
  },
};

const Sparkline = ({ color }) => (
  <svg className="h-7 w-20" viewBox="0 0 80 28" preserveAspectRatio="none" aria-hidden="true">
    <polyline
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      points="0,22 10,18 20,20 30,14 40,16 50,10 60,12 70,6 80,4"
    />
  </svg>
);

const KPICard = ({ label, value, subtitle, icon: Icon, tone = 'default', trend, className }) => {
  const palette = tones[tone] || tones.default;
  return (
  <Card className={cn('min-h-[118px] border-t-[3px] p-5', palette.border, className)}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">{label}</p>
        <div className={cn('mt-3 inline-flex rounded-lg px-3 py-1', palette.pill)}>
          <span className="text-xl font-bold tabular-nums">{value}</span>
        </div>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {trend && (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{trend}</span>
      )}
      {!trend && Icon && (
        <div className="rounded-lg bg-slate-50 p-2 text-slate-500">
          <Icon size={20} />
        </div>
      )}
    </div>
    <div className="mt-4 flex items-end justify-between gap-3">
      <span className="text-[11px] text-slate-500">vs. período anterior</span>
      <Sparkline color={palette.spark} />
    </div>
  </Card>
  );
};

export default KPICard;
