import { cn } from './utils';

const tones = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  brand: 'bg-indigo-100 text-indigo-700',
};

const Badge = ({ tone = 'default', className, children, ...props }) => (
  <span
    className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', tones[tone], className)}
    {...props}
  >
    {children}
  </span>
);

export default Badge;
