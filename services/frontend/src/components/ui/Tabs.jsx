import { cn } from './utils';

export const Tabs = ({ className, ...props }) => (
  <div className={cn('inline-flex rounded-ui border border-slate-200 bg-white p-1 shadow-ui', className)} {...props} />
);

export const TabButton = ({ active, className, ...props }) => (
  <button
    className={cn(
      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors ui-focus',
      active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
      className
    )}
    {...props}
  />
);
