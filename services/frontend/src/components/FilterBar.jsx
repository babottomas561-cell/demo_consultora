import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { useFilterStore } from '../store/filterStore';

const PERIODOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'anio', label: 'Año' },
  { key: 'custom', label: 'Personalizado' },
];

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const FilterBar = () => {
  const { periodo, desde, hasta, setPeriodo, setCustomRange } = useFilterStore();
  const [customDesde, setCustomDesde] = useState(desde);
  const [customHasta, setCustomHasta] = useState(hasta);

  const handlePeriodoClick = (key) => {
    if (key === 'custom') {
      setCustomDesde(desde);
      setCustomHasta(hasta);
      setPeriodo('custom');
    } else {
      setPeriodo(key);
    }
  };

  const handleApplyCustom = () => {
    if (customDesde && customHasta) {
      setCustomRange(customDesde, customHasta);
    }
  };

  return (
    <div className="sticky top-0 z-10 -mx-8 -mt-8 mb-6 border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="flex items-center justify-between py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIODOS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePeriodoClick(key)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                periodo === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Calendar size={14} className="text-slate-400" />
          <span>{formatDateDisplay(desde)} — {formatDateDisplay(hasta)}</span>
        </div>
      </div>

      {periodo === 'custom' && (
        <div className="flex items-center gap-3 pb-3">
          <input
            type="date"
            value={customDesde}
            onChange={(e) => setCustomDesde(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-slate-400 text-sm">—</span>
          <input
            type="date"
            value={customHasta}
            onChange={(e) => setCustomHasta(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleApplyCustom}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
