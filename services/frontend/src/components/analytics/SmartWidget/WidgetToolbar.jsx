import { useEffect, useRef, useState } from 'react';
import {
  Maximize2, Minimize2, RefreshCw, Settings, MoreVertical, Info,
  LineChart, BarChart3, AreaChart, Activity, Calendar,
} from 'lucide-react';
import { cn } from '../../ui/utils';
import ExportButton from '../ExportButton/ExportButton';

const CHART_ICONS = {
  line:    LineChart,
  bar:     BarChart3,
  area:    AreaChart,
  stacked: AreaChart,
  scatter: Activity,
};

const WidgetToolbar = ({
  title, info, subtitle,
  isFullscreen, onToggleFullscreen,
  onRefresh, onOpenSettings,
  chartType, onChartTypeChange, chartTypeOptions,
  granularity, onGranularityChange, granularityOptions,
  exportData, exportFilename, exportColumns, panelRef,
  rightExtras,
  freshAt,
  loading,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e) => { if (!moreRef.current?.contains(e.target)) setMoreOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  return (
    <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[13px] font-semibold text-slate-900 truncate">{title}</h3>
          {info && (
            <span title={info} className="text-slate-400 cursor-help">
              <Info size={12} />
            </span>
          )}
          {loading && (
            <span className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" title="Cargando" />
          )}
        </div>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {chartTypeOptions?.length > 1 && (
          <div className="hidden sm:flex items-center rounded-md border border-slate-200 bg-white p-0.5 mr-1">
            {chartTypeOptions.map((opt) => {
              const Icon = CHART_ICONS[opt.value] || BarChart3;
              const active = chartType === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onChartTypeChange?.(opt.value)}
                  title={opt.label}
                  className={cn(
                    'rounded p-1 transition-colors',
                    active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                  )}
                >
                  <Icon size={13} />
                </button>
              );
            })}
          </div>
        )}

        {granularityOptions?.length > 0 && (
          <select
            value={granularity || ''}
            onChange={(e) => onGranularityChange?.(e.target.value)}
            className="hidden md:block rounded border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-medium text-slate-600 mr-1"
            title="Granularidad"
          >
            {granularityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {rightExtras}

        {onRefresh && (
          <button
            onClick={onRefresh}
            className={cn(
              'rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors',
              loading && 'animate-spin'
            )}
            title="Actualizar"
          >
            <RefreshCw size={13} />
          </button>
        )}

        {(exportData || exportFilename) && (
          <ExportButton
            data={exportData}
            filename={exportFilename}
            columns={exportColumns}
            panelRef={panelRef}
            size="icon"
          />
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Configuración"
          >
            <Settings size={13} />
          </button>
        )}

        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title={isFullscreen ? 'Salir' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        )}

        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setMoreOpen((o) => !o)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Más"
          >
            <MoreVertical size={13} />
          </button>
          {moreOpen && freshAt && (
            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded border border-slate-200 bg-white py-1.5 px-2 shadow-lg">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <Calendar size={10} />
                Actualizado: {new Date(freshAt).toLocaleTimeString('es-AR')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WidgetToolbar;
