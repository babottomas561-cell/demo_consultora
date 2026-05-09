import { X } from 'lucide-react';
import { useCrossFilter } from '../../../hooks/useCrossFilter';

const LABELS = {
  cod_vendedor:    'Vendedor',
  cod_rubro:       'Rubro',
  cod_subrubro:    'Subrubro',
  punto_de_venta:  'Punto de venta',
  tipo_comprobante:'Comprobante',
  condicion_venta: 'Condición venta',
  cod_cliente:     'Cliente',
  cod_articulo:    'Artículo',
  cod_deposito:    'Depósito',
};

const DrillThroughBreadcrumbs = () => {
  const { drillFilters, clearFilter, clearAll } = useCrossFilter();
  const entries = Object.entries(drillFilters).filter(([, v]) => v?.length > 0);

  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs mb-3">
      <span className="font-semibold text-indigo-700 mr-1">Filtrado por:</span>
      {entries.map(([key, values]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-white px-2.5 py-0.5 font-medium text-indigo-700"
        >
          {LABELS[key] ?? key}: {values.join(', ')}
          <button onClick={() => clearFilter(key)} className="ml-0.5 text-indigo-400 hover:text-indigo-700">
            <X size={11} />
          </button>
        </span>
      ))}
      <button
        onClick={clearAll}
        className="ml-auto text-indigo-500 hover:text-indigo-700 font-medium underline"
      >
        Limpiar drill-through
      </button>
    </div>
  );
};

export default DrillThroughBreadcrumbs;
