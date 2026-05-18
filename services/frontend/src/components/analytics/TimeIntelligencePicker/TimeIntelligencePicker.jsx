import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, GitCompare, Clock } from 'lucide-react';
import { cn } from '../../ui/utils';
import { useFilterStore } from '../../../store/filterStore';
import {
  PRESETS, COMPARE_MODES, GRANULARITIES,
  resolvePreset, suggestGranularity,
} from '../../../lib/timeIntelligence';

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const PresetGroup = ({ title, presets, currentPreset, onPick }) => (
  <div className="px-1">
    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</div>
    {presets.map(({ key, label }) => (
      <button
        key={key}
        onClick={() => onPick(key)}
        className={cn(
          'w-full px-2 py-1.5 text-left text-xs rounded transition-colors',
          currentPreset === key ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-100'
        )}
      >
        {label}
      </button>
    ))}
  </div>
);

const TimeIntelligencePicker = ({
  className,
  showGranularity = true,
  showCompare = true,
  onGranularityChange,
  granularity: granularityProp,
  showInlineLabel = true,
}) => {
  const periodo = useFilterStore((s) => s.periodo);
  const desde = useFilterStore((s) => s.desde);
  const hasta = useFilterStore((s) => s.hasta);
  const setPeriodo = useFilterStore((s) => s.setPeriodo);
  const setCustomRange = useFilterStore((s) => s.setCustomRange);
  const compareMode = useFilterStore((s) => s.compare_mode) || 'none';
  const setCompareMode = useFilterStore((s) => s.setCompareMode);

  const [open, setOpen] = useState(false);
  const [customDesde, setCustomDesde] = useState(desde);
  const [customHasta, setCustomHasta] = useState(hasta);
  const [granularity, setGranularityLocal] = useState(granularityProp ?? suggestGranularity(desde, hasta));
  const dropdownRef = useRef(null);

  useEffect(() => {
    setCustomDesde(desde);
    setCustomHasta(hasta);
    if (!granularityProp) setGranularityLocal(suggestGranularity(desde, hasta));
  }, [desde, hasta, granularityProp]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const applyPreset = (key) => {
    if (key === 'custom') {
      setPeriodo('custom');
      return;
    }
    const range = resolvePreset(key);
    if (range) {
      setCustomRange(range.desde, range.hasta);
      setPeriodo(key);
    }
    setOpen(false);
  };

  const applyCustom = () => {
    if (customDesde && customHasta) {
      setCustomRange(customDesde, customHasta);
      setOpen(false);
    }
  };

  const handleGranularityChange = (val) => {
    setGranularityLocal(val);
    onGranularityChange?.(val);
  };

  const handleCompareChange = (val) => {
    if (typeof setCompareMode === 'function') setCompareMode(val);
  };

  const currentLabel = PRESETS[periodo]?.label ?? 'Custom';
  const rapidPresets    = Object.entries(PRESETS).filter(([_, p]) => p.group === 'rapid').map(([key, p]) => ({ key, ...p }));
  const currentPresets  = Object.entries(PRESETS).filter(([_, p]) => p.group === 'current').map(([key, p]) => ({ key, ...p }));
  const previousPresets = Object.entries(PRESETS).filter(([_, p]) => p.group === 'previous').map(([key, p]) => ({ key, ...p }));

  return (
    <div className={cn('flex items-center gap-1.5', className)} ref={dropdownRef}>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300"
        >
          <Calendar size={13} className="text-slate-400" />
          {showInlineLabel && <span className="text-slate-500">Período:</span>}
          <span>{currentLabel}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">{formatDateDisplay(desde)}–{formatDateDisplay(hasta)}</span>
          <ChevronDown size={11} className="text-slate-400" />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-[420px] rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
            <div className="grid grid-cols-3 gap-2">
              <PresetGroup title="Rápidos"   presets={rapidPresets}    currentPreset={periodo} onPick={applyPreset} />
              <PresetGroup title="En curso"  presets={currentPresets}  currentPreset={periodo} onPick={applyPreset} />
              <PresetGroup title="Anteriores" presets={previousPresets} currentPreset={periodo} onPick={applyPreset} />
            </div>
            <div className="mt-2 border-t border-slate-100 px-2 pt-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Personalizado</div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customDesde || ''}
                  onChange={(e) => setCustomDesde(e.target.value)}
                  className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="date"
                  value={customHasta || ''}
                  onChange={(e) => setCustomHasta(e.target.value)}
                  className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
                />
                <button
                  onClick={applyCustom}
                  disabled={!customDesde || !customHasta}
                  className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCompare && (
        <div className="relative">
          <select
            value={compareMode}
            onChange={(e) => handleCompareChange(e.target.value)}
            className="appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-7 pr-7 text-[12px] font-medium text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Object.entries(COMPARE_MODES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <GitCompare size={12} className="pointer-events-none absolute left-2 top-2 text-slate-400" />
          <ChevronDown size={11} className="pointer-events-none absolute right-2 top-2.5 text-slate-400" />
        </div>
      )}

      {showGranularity && (
        <div className="relative">
          <select
            value={granularity}
            onChange={(e) => handleGranularityChange(e.target.value)}
            className="appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-7 pr-7 text-[12px] font-medium text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Object.entries(GRANULARITIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <Clock size={12} className="pointer-events-none absolute left-2 top-2 text-slate-400" />
          <ChevronDown size={11} className="pointer-events-none absolute right-2 top-2.5 text-slate-400" />
        </div>
      )}
    </div>
  );
};

export default TimeIntelligencePicker;
