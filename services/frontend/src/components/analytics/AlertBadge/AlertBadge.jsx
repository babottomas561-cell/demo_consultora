import { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';
import { cn } from '../../ui/utils';
import Button from '../../ui/Button';

const config = {
  critical: { bg: 'bg-red-50 border-red-200',   text: 'text-red-700',   Icon: AlertCircle },
  warning:  { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', Icon: AlertTriangle },
  info:     { bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',  Icon: Info },
  success:  { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', Icon: CheckCircle2 },
};

const AlertBadge = ({
  severity = 'info',
  message,
  action,
  onAction,
  dismissible = false,
  className,
}) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const { bg, text, Icon } = config[severity] ?? config.info;

  return (
    <div className={cn('flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs', bg, className)}>
      <Icon size={13} className={text} />
      <span className={cn('flex-1 font-medium', text)}>{message}</span>
      {action && onAction && (
        <button onClick={onAction} className={cn('font-semibold underline', text)}>{action}</button>
      )}
      {dismissible && (
        <button onClick={() => setDismissed(true)} className={cn('opacity-60 hover:opacity-100', text)}>
          <X size={12} />
        </button>
      )}
    </div>
  );
};

export default AlertBadge;
