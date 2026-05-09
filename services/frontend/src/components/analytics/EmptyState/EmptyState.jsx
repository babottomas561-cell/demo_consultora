import { Inbox, SearchX, AlertCircle, Lock } from 'lucide-react';
import { cn } from '../../ui/utils';
import Button from '../../ui/Button';

const variants = {
  'no-data':    { Icon: Inbox,      title: 'Sin datos para mostrar',    subtitle: 'No hay movimientos para el período seleccionado.' },
  'no-results': { Icon: SearchX,    title: 'Sin resultados',            subtitle: 'Los filtros aplicados no devuelven datos. Probá ampliar el rango.' },
  'error':      { Icon: AlertCircle,title: 'Error al cargar',           subtitle: 'No se pudo obtener la información. Intentá de nuevo.' },
  'permission': { Icon: Lock,       title: 'Sin acceso',                subtitle: 'No tenés permisos para ver esta información.' },
};

const EmptyState = ({
  variant = 'no-data',
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
}) => {
  const { Icon, title: defaultTitle, subtitle: defaultSubtitle } = variants[variant] ?? variants['no-data'];

  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <div className="rounded-full bg-slate-100 p-3 text-slate-400">
        <Icon size={28} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title ?? defaultTitle}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{subtitle ?? defaultSubtitle}</p>
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
