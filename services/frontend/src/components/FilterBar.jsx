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
    <div className="bg-white border-b border-slate-200 -mx-8 -mt-8 mb-6 px-6 sticky top-0 z-10">
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-1.5">
          {PERIODOS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePeriodoClick(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periodo === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
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
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <span className="text-slate-400 text-sm">—</span>
          <input
            type="date"
            value={customHasta}
            onChange={(e) => setCustomHasta(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={handleApplyCustom}
            className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
