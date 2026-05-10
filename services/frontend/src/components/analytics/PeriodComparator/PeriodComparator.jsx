import { useState } from 'react';
import { ChevronDown, Calendar } from 'lucide-react';
import { cn } from '../../ui/utils';
import { useFilterStore } from '../../../store/filterStore';

const fmt = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const COMPARE_OPTIONS = [
  { key: 'anterior', label: 'Período anterior (mismo largo)' },
  { key: 'anio', label: 'Año anterior (mismo período)' },
  { key: 'custom', label: 'Personalizado...' },
];

const PeriodComparator = ({ className }) => {
  const { desde, hasta, comparar_anterior, setFilter } = useFilterStore();
  const [compareMode, setCompareMode] = useState('anterior');
  const [showDropdown, setShowDropdown] = useState(false);

  const toggle = () => setFilter('comparar_anterior', !comparar_anterior);

  const selectedLabel = COMPARE_OPTIONS.find((o) => o.key === compareMode)?.label;

  return (
    <div className={cn('flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs', className)}>
      <div className="flex items-center gap-1.5 text-slate-600">
        <Calendar size={13} className="text-slate-400" />
        <span className="font-medium">
          {fmt(desde)} — {fmt(hasta)}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <span
            onClick={toggle}
            className={cn(
              'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
              comparar_anterior ? 'bg-indigo-600' : 'bg-slate-200'
            )}
          >
            <span
              className={cn(
                'inline-block h-3 w-3 rounded-full bg-white shadow transition-transform',
                comparar_anterior ? 'translate-x-3.5' : 'translate-x-0.5'
              )}
            />
          </span>
          <span className={cn('font-medium', comparar_anterior ? 'text-indigo-600' : 'text-slate-400')}>
            Comparar con: {comparar_anterior ? 'período anterior' : 'inactivo'}
          </span>
        </label>

        {comparar_anterior && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown((o) => !o)}
              className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {selectedLabel}
              <ChevronDown size={11} />
            </button>
            {showDropdown && (
              <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                {COMPARE_OPTIONS.map(({ key, label }) => (
                  <button
                    key={key}
                    className={cn(
                      'flex w-full items-center px-3 py-2 text-xs hover:bg-slate-50',
                      compareMode === key ? 'font-semibold text-indigo-600' : 'text-slate-700'
                    )}
                    onClick={() => { setCompareMode(key); setShowDropdown(false); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PeriodComparator;
