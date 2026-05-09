import Card from './Card';
import { cn } from './utils';

const tones = {
  default: 'bg-indigo-50 text-indigo-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
};

const KPICard = ({ label, value, subtitle, icon: Icon, tone = 'default', className }) => (
  <Card className={cn('p-5', className)}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={cn('mt-3 inline-flex rounded-lg px-3 py-1', tones[tone])}>
          <span className="text-xl font-bold">{value}</span>
        </div>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {Icon && (
        <div className="rounded-lg bg-slate-50 p-2 text-slate-500">
          <Icon size={20} />
        </div>
      )}
    </div>
  </Card>
);

export default KPICard;
