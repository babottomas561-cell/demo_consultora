import { useRef, useState, useMemo } from 'react';
import { cn } from '../../ui/utils';
import Card from '../../ui/Card';
import { SkeletonChart } from '../SkeletonLoader/SkeletonLoader';
import EmptyState from '../EmptyState/EmptyState';
import WidgetToolbar from './WidgetToolbar';
import WidgetSettingsDrawer from './WidgetSettingsDrawer';
import { useWidgetSetting, useWidgetSettings } from '../../../store/widgetSettingsStore';

/**
 * Universal widget container with editable toolbar, settings drawer,
 * fullscreen mode, export, refresh and persistent per-widget config.
 */
const SmartWidget = ({
  widgetId,
  title: titleDefault,
  subtitle,
  info,
  children,

  loading = false,
  empty = false,
  emptyMessage = 'Sin datos para los filtros aplicados',
  error = null,
  onRetry,
  onRefresh,

  exportData,
  exportFilename,
  exportColumns,

  chartTypeOptions,
  granularityOptions,
  onChartTypeChange,
  onGranularityChange,

  freshAt,
  rightExtras,
  customSettingsFields,

  className,
  contentClassName,
  hideToolbar = false,
}) => {
  const setting = useWidgetSetting(widgetId);
  const update = useWidgetSettings((s) => s.update);

  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const panelRef = useRef(null);

  const title = setting.title || titleDefault;
  const chartType = setting.chartType || chartTypeOptions?.[0]?.value;
  const granularity = setting.granularity || null;

  const handleChartTypeChange = (val) => {
    update(widgetId, { chartType: val });
    onChartTypeChange?.(val);
  };

  const handleGranularityChange = (val) => {
    update(widgetId, { granularity: val });
    onGranularityChange?.(val);
  };

  const content = useMemo(() => {
    if (loading)              return <SkeletonChart />;
    if (error)                return <EmptyState title="Error" description={String(error)} action={onRetry ? { label: 'Reintentar', onClick: onRetry } : null} />;
    if (empty)                return <EmptyState title="Sin datos" description={emptyMessage} />;
    return children;
  }, [loading, error, empty, emptyMessage, children, onRetry]);

  return (
    <>
      <Card
        ref={panelRef}
        className={cn(
          'flex flex-col h-full overflow-hidden',
          expanded && 'fixed inset-4 z-40 shadow-2xl',
          className
        )}
        data-widget-id={widgetId}
      >
        {!hideToolbar && (
          <WidgetToolbar
            title={title}
            subtitle={subtitle}
            info={info}
            isFullscreen={expanded}
            onToggleFullscreen={() => setExpanded((e) => !e)}
            onRefresh={onRefresh}
            onOpenSettings={() => setSettingsOpen(true)}
            chartType={chartType}
            chartTypeOptions={chartTypeOptions}
            onChartTypeChange={handleChartTypeChange}
            granularity={granularity}
            granularityOptions={granularityOptions}
            onGranularityChange={handleGranularityChange}
            exportData={exportData}
            exportFilename={exportFilename}
            exportColumns={exportColumns}
            panelRef={panelRef}
            rightExtras={rightExtras}
            freshAt={freshAt}
            loading={loading}
          />
        )}

        <div className={cn('flex-1 overflow-auto', contentClassName)}>
          {content}
        </div>
      </Card>

      <WidgetSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        widgetId={widgetId}
        chartTypeOptions={chartTypeOptions || []}
        granularityOptions={granularityOptions || []}
        customFields={customSettingsFields}
      />
    </>
  );
};

export default SmartWidget;
