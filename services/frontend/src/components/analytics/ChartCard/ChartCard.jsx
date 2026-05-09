import { useRef, useState } from 'react';
import { Maximize2, Download, RefreshCw, Info } from 'lucide-react';
import { cn } from '../../ui/utils';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { SkeletonChart } from '../SkeletonLoader/SkeletonLoader';
import EmptyState from '../EmptyState/EmptyState';
import ExportButton from '../ExportButton/ExportButton';

const ChartCard = ({
  title,
  subtitle,
  info,
  children,
  loading = false,
  empty = false,
  error = null,
  onRetry,
  onRefresh,
  exportData,
  exportFilename,
  exportColumns,
  className,
  contentClassName,
}) => {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef(null);

  if (loading) return <SkeletonChart className={className} />;

  return (
    <Card
      ref={panelRef}
      className={cn(
        'flex flex-col',
        expanded && 'fixed inset-4 z-50 shadow-2xl overflow-auto',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[13px] font-semibold text-slate-900 truncate">{title}</h3>
            {info && (
              <span title={info} className="text-slate-400 cursor-help">
                <Info size={13} />
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Actualizar"
            >
              <RefreshCw size={14} />
            </button>
          )}
          {exportData && (
            <ExportButton
              data={exportData}
              filename={exportFilename ?? title}
              columns={exportColumns}
              panelRef={panelRef}
              size="icon"
            />
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title={expanded ? 'Contraer' : 'Expandir'}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      <div className={cn('flex-1 p-4', contentClassName)}>
        {error ? (
          <EmptyState
            variant="error"
            actionLabel={onRetry ? 'Reintentar' : undefined}
            onAction={onRetry}
          />
        ) : empty ? (
          <EmptyState variant="no-data" />
        ) : (
          children
        )}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setExpanded(false)}
          style={{ zIndex: 49 }}
        />
      )}
    </Card>
  );
};

export default ChartCard;
