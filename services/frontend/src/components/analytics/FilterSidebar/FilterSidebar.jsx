import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, SlidersHorizontal, RotateCcw, Bookmark } from 'lucide-react';
import { cn } from '../../ui/utils';
import { useFilterStore } from '../../../store/filterStore';
import Button from '../../ui/Button';

const PERIODOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'anio', label: 'Año' },
  { key: 'custom', label: 'Personalizado' },
];

const TIPOS_COMPROBANTE = ['FA', 'NC', 'ND', 'PR', 'RE'];
const CONDICIONES_VENTA = ['Efectivo', 'Cta Cte', 'Tarjeta', 'Otros'];

const Section = ({ title, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {open && <div className="px-4 pb-3 space-y-2">{children}</div>}
    </div>
  );
};

const MultiSelect = ({ options = [], value = [], onToggle, searchable = false }) => {
  const [search, setSearch] = useState('');
  const filtered = searchable && search
    ? options.filter((o) => String(o.label ?? o).toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="space-y-1">
      {searchable && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
      )}
      <div className="max-h-40 overflow-y-auto space-y-0.5">
        {filtered.map((opt) => {
          const key = opt.value ?? opt;
          const label = opt.label ?? opt;
          const checked = value.includes(key);
          return (
            <label key={key} className="flex items-center gap-2 rounded px-1 py-1 text-xs text-slate-700 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(key)}
                className="accent-indigo-600 rounded"
              />
              {label}
            </label>
          );
        })}
      </div>
    </div>
  );
};

const ActiveChipCount = ({ filters }) => {
  const count = Object.values(filters).filter((v) => Array.isArray(v) ? v.length > 0 : Boolean(v)).length;
  if (!count) return null;
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
      {count}
    </span>
  );
};

const FilterSidebar = ({
  open,
  onClose,
  vendedores = [],
  puntosDeVenta = [],
  rubros = [],
  subrubros = [],
  depositos = [],
  clientes = [],
  articulos = [],
}) => {
  const store = useFilterStore();
  const [saveViewName, setSaveViewName] = useState('');

  const advancedFilters = {
    comparar_anterior: store.comparar_anterior,
    cod_empresa: store.cod_empresa,
    tag: store.tag,
    punto_de_venta: store.punto_de_venta,
    cod_vendedor: store.cod_vendedor,
    cod_rubro: store.cod_rubro,
    cod_subrubro: store.cod_subrubro,
    tipo_comprobante: store.tipo_comprobante,
    condicion_venta: store.condicion_venta,
    cod_cliente: store.cod_cliente,
    cod_articulo: store.cod_articulo,
    cod_deposito: store.cod_deposito,
    incluir_anuladas: store.incluir_anuladas,
  };

  const handleSaveView = () => {
    if (saveViewName.trim()) {
      store.saveView(saveViewName.trim());
      setSaveViewName('');
    }
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />}
      <aside
        className={cn(
          'fixed right-0 top-0 z-40 h-full w-72 bg-white shadow-xl border-l border-slate-200 transition-transform duration-300 flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-indigo-600" />
            <span className="font-semibold text-slate-900 text-sm">Filtros</span>
            <ActiveChipCount filters={advancedFilters} />
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 rounded p-1 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Período */}
          <Section title="Período" defaultOpen>
            <div className="flex flex-wrap gap-1">
              {PERIODOS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => store.setPeriodo(key)}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium border transition-colors',
                    store.periodo === key
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {store.periodo === 'custom' && (
              <div className="flex flex-col gap-1.5 mt-2">
                <input type="date" value={store.desde} onChange={(e) => store.setCustomRange(e.target.value, store.hasta)}
                  className="rounded border border-slate-200 px-2 py-1.5 text-xs" />
                <input type="date" value={store.hasta} onChange={(e) => store.setCustomRange(store.desde, e.target.value)}
                  className="rounded border border-slate-200 px-2 py-1.5 text-xs" />
              </div>
            )}
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={store.comparar_anterior}
                onChange={() => store.setFilter('comparar_anterior', !store.comparar_anterior)}
                className="accent-indigo-600"
              />
              Comparar vs período anterior
            </label>
          </Section>

          {/* Punto de venta */}
          {puntosDeVenta.length > 0 && (
            <Section title="Punto de venta">
              <MultiSelect
                options={puntosDeVenta}
                value={store.punto_de_venta}
                onToggle={(v) => store.toggleArrayValue('punto_de_venta', v)}
                searchable
              />
            </Section>
          )}

          {/* Vendedor */}
          {vendedores.length > 0 && (
            <Section title="Vendedor">
              <MultiSelect
                options={vendedores}
                value={store.cod_vendedor}
                onToggle={(v) => store.toggleArrayValue('cod_vendedor', v)}
                searchable
              />
            </Section>
          )}

          {/* Rubro / Subrubro */}
          {rubros.length > 0 && (
            <Section title="Rubro">
              <MultiSelect
                options={rubros}
                value={store.cod_rubro}
                onToggle={(v) => store.toggleArrayValue('cod_rubro', v)}
                searchable
              />
            </Section>
          )}
          {subrubros.length > 0 && (
            <Section title="Subrubro">
              <MultiSelect
                options={subrubros}
                value={store.cod_subrubro}
                onToggle={(v) => store.toggleArrayValue('cod_subrubro', v)}
                searchable
              />
            </Section>
          )}

          {/* Tipo comprobante */}
          <Section title="Tipo comprobante">
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_COMPROBANTE.map((t) => (
                <label key={t} className={cn(
                  'flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs cursor-pointer transition-colors',
                  store.tipo_comprobante.includes(t)
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                )}>
                  <input
                    type="checkbox"
                    checked={store.tipo_comprobante.includes(t)}
                    onChange={() => store.toggleArrayValue('tipo_comprobante', t)}
                    className="sr-only"
                  />
                  {t}
                </label>
              ))}
            </div>
          </Section>

          {/* Condición venta */}
          <Section title="Condición venta">
            <MultiSelect
              options={CONDICIONES_VENTA}
              value={store.condicion_venta}
              onToggle={(v) => store.toggleArrayValue('condicion_venta', v)}
            />
          </Section>

          {/* Depósito */}
          {depositos.length > 0 && (
            <Section title="Depósito">
              <MultiSelect
                options={depositos}
                value={store.cod_deposito}
                onToggle={(v) => store.toggleArrayValue('cod_deposito', v)}
              />
            </Section>
          )}

          {/* Cliente */}
          {clientes.length > 0 && (
            <Section title="Cliente">
              <MultiSelect
                options={clientes}
                value={store.cod_cliente}
                onToggle={(v) => store.toggleArrayValue('cod_cliente', v)}
                searchable
              />
            </Section>
          )}

          {/* Opciones extra */}
          <Section title="Opciones">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={store.incluir_anuladas}
                onChange={() => store.setFilter('incluir_anuladas', !store.incluir_anuladas)}
                className="accent-indigo-600"
              />
              Incluir anuladas
            </label>
          </Section>

          {/* Vistas guardadas */}
          <Section title="Guardar vista">
            <div className="flex gap-2">
              <input
                value={saveViewName}
                onChange={(e) => setSaveViewName(e.target.value)}
                placeholder="Nombre de la vista..."
                className="flex-1 rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
              />
              <button
                onClick={handleSaveView}
                disabled={!saveViewName.trim()}
                className="rounded bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                <Bookmark size={13} />
              </button>
            </div>
            {store.savedViews.length > 0 && (
              <div className="mt-2 space-y-1">
                {store.savedViews.slice(0, 5).map((view) => (
                  <div key={view.id} className="flex items-center gap-1">
                    <button
                      onClick={() => store.loadView(view.id)}
                      className={cn(
                        'flex-1 truncate rounded px-2 py-1 text-left text-xs transition-colors',
                        store.activeViewId === view.id
                          ? 'bg-indigo-100 text-indigo-700 font-medium'
                          : 'text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      {view.name}
                    </button>
                    <button
                      onClick={() => store.deleteView(view.id)}
                      className="text-slate-300 hover:text-red-500 p-0.5"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="border-t border-slate-200 px-4 py-3">
          <button
            onClick={() => store.resetAdvancedFilters()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={13} />
            Limpiar todos los filtros
          </button>
        </div>
      </aside>
    </>
  );
};

export default FilterSidebar;
