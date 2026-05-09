import Button from './Button';
import { cn } from './utils';

const DateRangePicker = ({ desde, hasta, onDesdeChange, onHastaChange, onApply, className }) => (
  <div className={cn('flex flex-wrap items-center gap-3', className)}>
    <input
      type="date"
      value={desde || ''}
      onChange={(event) => onDesdeChange?.(event.target.value)}
      className="h-9 rounded-ui border border-slate-200 px-3 text-sm text-slate-700 shadow-ui ui-focus"
    />
    <span className="text-sm text-slate-400">-</span>
    <input
      type="date"
      value={hasta || ''}
      onChange={(event) => onHastaChange?.(event.target.value)}
      className="h-9 rounded-ui border border-slate-200 px-3 text-sm text-slate-700 shadow-ui ui-focus"
    />
    <Button size="sm" onClick={onApply}>Aplicar</Button>
  </div>
);

export default DateRangePicker;
