import { cn } from './utils';

const Checkbox = ({ label, className, ...props }) => (
  <label className={cn('inline-flex items-center gap-2 text-sm text-slate-700', className)}>
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-slate-300 text-indigo-600 ui-focus"
      {...props}
    />
    {label && <span>{label}</span>}
  </label>
);

export default Checkbox;
