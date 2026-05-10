import { Download, Eye, X } from 'lucide-react';

import Button from '../../../components/ui/Button';

export const PeriodComparator = ({ active }) => (
  <p className={`text-xs font-semibold ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
    Comparar con: {active ? 'período anterior' : 'inactivo'}
  </p>
);

export const SavedViews = () => (
  <Button variant="secondary" size="sm">
    <Eye size={14} />
    Vistas guardadas
  </Button>
);

export const ExportButton = ({ onClick, loading = false, label = 'Exportar' }) => (
  <Button variant="secondary" size="sm" onClick={onClick} loading={loading}>
    <Download size={14} />
    {label}
  </Button>
);

export const DrillThroughBreadcrumbs = ({ filters, onClear }) => {
  const entries = Object.entries(filters || {}).filter(([, value]) => value);
  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700">
      <span>Filtro activo</span>
      {entries.map(([key, value]) => (
        <button
          key={key}
          type="button"
          onClick={() => onClear(key)}
          className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-indigo-700 shadow-sm"
        >
          {value.label || value.id || value}
          <X size={12} />
        </button>
      ))}
    </div>
  );
};
