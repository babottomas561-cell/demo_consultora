import { useContext } from 'react';
import { X, Filter } from 'lucide-react';
import { cn } from '../../ui/utils';
import { CrossFilterContext } from '../CrossFilterProvider/CrossFilterProvider';

const FILTER_LABELS = {
  cod_cliente: 'Cliente',
  cod_articulo: 'Producto',
  cod_vendedor: 'Vendedor',
  cod_rubro: 'Rubro',
  cod_subrubro: 'Subrubro',
  cod_deposito: 'Depósito',
  cod_lista_precios: 'Lista',
  cod_empresa: 'Empresa',
  tag: 'Tag',
  punto_de_venta: 'PdV',
  tipo_comprobante: 'Tipo',
  condicion_venta: 'Condición',
};

const CrossFilterChips = ({ className, labels = {}, labelResolvers = {} }) => {
  const ctx = useContext(CrossFilterContext);
  if (!ctx) return null;

  const { drillFilters, clearFilter, clearAll } = ctx;
  const entries = Object.entries(drillFilters || {}).filter(([_, v]) => v && v.length > 0);
  if (entries.length === 0) return null;

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap px-3 py-2 bg-indigo-50/60 border border-indigo-100 rounded-lg', className)}>
      <Filter size={12} className="text-indigo-600 shrink-0" />
      <span className="text-[11px] font-medium text-indigo-700 mr-1">Cross-filter activo:</span>

      {entries.map(([key, values]) => {
        const baseLabel = labels[key] || FILTER_LABELS[key] || key;
        const resolver = labelResolvers[key];
        const valLabels = resolver ? values.map(resolver) : values;
        const display = valLabels.length > 2
          ? `${valLabels.slice(0, 2).join(', ')} +${valLabels.length - 2}`
          : valLabels.join(', ');
        return (
          <button
            key={key}
            onClick={() => clearFilter(key)}
            className="inline-flex items-center gap-1 rounded-full bg-white border border-indigo-200 px-2 py-0.5 text-[11px] text-indigo-700 hover:bg-indigo-100 transition-colors"
            title="Quitar filtro"
          >
            <span className="font-medium">{baseLabel}:</span>
            <span>{display}</span>
            <X size={10} />
          </button>
        );
      })}

      <button
        onClick={clearAll}
        className="ml-auto text-[11px] font-medium text-indigo-700 hover:text-indigo-900 hover:underline"
      >
        Limpiar todos
      </button>
    </div>
  );
};

export default CrossFilterChips;
