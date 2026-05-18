import { useState } from 'react';
import { X, RotateCcw, Copy, Check } from 'lucide-react';
import { cn } from '../../ui/utils';
import { useWidgetSettings } from '../../../store/widgetSettingsStore';

const Field = ({ label, children, hint }) => (
  <div className="space-y-1">
    <label className="text-xs font-medium text-slate-700">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
  </div>
);

const WidgetSettingsDrawer = ({
  open, onClose, widgetId,
  chartTypeOptions = [],
  granularityOptions = [],
  showCompare = true,
  customFields,
}) => {
  const settings = useWidgetSettings((s) => s.settings[widgetId] || {});
  const update = useWidgetSettings((s) => s.update);
  const reset = useWidgetSettings((s) => s.reset);
  const exportConfig = useWidgetSettings((s) => s.export);
  const [copied, setCopied] = useState(false);

  const copyConfig = async () => {
    try {
      await navigator.clipboard.writeText(exportConfig(widgetId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-80 overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Configuración del widget</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <Field label="Título personalizado" hint="Renombrá el widget para este panel">
            <input
              type="text"
              value={settings.title || ''}
              onChange={(e) => update(widgetId, { title: e.target.value || null })}
              placeholder="Usar título por defecto"
              className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
            />
          </Field>

          {chartTypeOptions.length > 0 && (
            <Field label="Tipo de gráfico">
              <div className="grid grid-cols-2 gap-1.5">
                {chartTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update(widgetId, { chartType: opt.value })}
                    className={cn(
                      'rounded border px-2 py-1.5 text-xs font-medium transition-colors',
                      (settings.chartType || chartTypeOptions[0].value) === opt.value
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {granularityOptions.length > 0 && (
            <Field label="Granularidad">
              <select
                value={settings.granularity || ''}
                onChange={(e) => update(widgetId, { granularity: e.target.value || null })}
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
              >
                <option value="">Auto-sugerida</option>
                {granularityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </Field>
          )}

          {showCompare && (
            <Field label="Comparar con">
              <select
                value={settings.compareMode || 'inherit'}
                onChange={(e) => update(widgetId, { compareMode: e.target.value })}
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
              >
                <option value="inherit">Heredar del panel</option>
                <option value="none">Sin comparar</option>
                <option value="previous">Período anterior</option>
                <option value="yoy">Año anterior</option>
                <option value="target">vs Objetivo</option>
              </select>
            </Field>
          )}

          <Field label="Sparkline">
            <button
              onClick={() => update(widgetId, { showSparkline: !settings.showSparkline })}
              className={cn(
                'flex w-full items-center justify-between rounded border px-2 py-1.5 text-xs',
                settings.showSparkline !== false ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'
              )}
            >
              <span>{settings.showSparkline !== false ? 'Mostrar' : 'Ocultar'}</span>
              <span className={cn('h-2 w-7 rounded-full', settings.showSparkline !== false ? 'bg-indigo-500' : 'bg-slate-300')}>
                <span className={cn(
                  'block h-2 w-2 rounded-full bg-white transition-transform',
                  settings.showSparkline !== false ? 'translate-x-5' : 'translate-x-0'
                )} />
              </span>
            </button>
          </Field>

          {customFields}

          <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-4">
            <button
              onClick={copyConfig}
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              {copied ? 'Copiado' : 'Copiar configuración JSON'}
            </button>
            <button
              onClick={() => reset(widgetId)}
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              <RotateCcw size={13} />
              Restaurar valores por defecto
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default WidgetSettingsDrawer;
