import { cn } from './utils';

const Select = ({ className, children, ...props }) => (
  <select
    className={cn(
      'h-10 rounded-ui border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-ui ui-focus',
      className
    )}
    {...props}
  >
    {children}
  </select>
);

export default Select;
