import { Inbox } from 'lucide-react';
import Button from './Button';
import Card from './Card';

const EmptyState = ({ title = 'Sin datos', description, actionLabel, onAction, icon: Icon = Inbox }) => (
  <Card className="flex flex-col items-center justify-center px-6 py-12 text-center">
    <div className="rounded-full bg-slate-100 p-3 text-slate-400">
      <Icon size={28} />
    </div>
    <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
    {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
    {actionLabel && onAction && (
      <Button className="mt-5" size="sm" onClick={onAction}>{actionLabel}</Button>
    )}
  </Card>
);

export default EmptyState;
