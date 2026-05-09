import { cn } from './utils';

export const Card = ({ className, ...props }) => (
  <div className={cn('ui-card', className)} {...props} />
);

export const CardHeader = ({ className, ...props }) => (
  <div className={cn('border-b border-slate-200 px-5 py-4', className)} {...props} />
);

export const CardTitle = ({ className, ...props }) => (
  <h3 className={cn('text-lg font-semibold text-slate-900', className)} {...props} />
);

export const CardContent = ({ className, ...props }) => (
  <div className={cn('p-5', className)} {...props} />
);

export default Card;
