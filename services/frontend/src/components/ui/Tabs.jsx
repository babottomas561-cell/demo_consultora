import { cn } from './utils';

export const Tabs = ({ className, ...props }) => (
  <div className={cn('inline-flex rounded-[9px] bg-slate-100 p-[3px] shadow-[inset_0_0_0_1px_var(--slate-200)]', className)} {...props} />
);

export const TabButton = ({ active, className, ...props }) => (
  <button
    className={cn(
      'rounded-md px-3 py-1.5 text-xs font-medium transition-colors ui-focus',
      active ? 'bg-white text-slate-900 shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_0_0_1px_rgba(15,23,42,0.04)]' : 'text-slate-600 hover:text-slate-900',
      className
    )}
    {...props}
  />
);
