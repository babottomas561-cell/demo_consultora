import { useMemo, useState } from 'react';
import { X, Plus, Search, Check, Minus } from 'lucide-react';
import usePanelLayoutStore from '../store/panelLayoutStore';

const CATEGORY_LABELS = {
  kpi: 'Indicadores',
  chart: 'Gráficos',
  table: 'Tablas',
};

const CATEGORY_ORDER = ['kpi', 'chart', 'table'];

export default function AddPanelWidgetModal({ panelId, catalog, onClose }) {
  const { getPanel, addWidget, removeWidget } = usePanelLayoutStore();
  const panel = getPanel(panelId);
  const activeTypeMap = useMemo(() => {
    const map = {};
    panel.widgets.forEach((w) => {
      if (!map[w.type]) map[w.type] = [];
      map[w.type].push(w.id);
    });
    return map;
  }, [panel.widgets]);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((w) => {
      if (categoryFilter !== 'all' && w.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        (w.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [catalog, query, categoryFilter]);

  const categories = useMemo(() => {
    const present = new Set(catalog.map((w) => w.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [catalog]);

  const grouped = useMemo(() => {
    return categories.map((cat) => ({
      cat,
      items: filtered.filter((w) => w.category === cat),
    })).filter((g) => g.items.length > 0);
  }, [filtered, categories]);

  const totalActive = panel.widgets.length;
  const totalCatalog = catalog.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Agregar Widget</h2>
              <p className="text-sm text-slate-500">
                {totalActive} de {totalCatalog} widgets activos en este panel
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search + filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar widget..."
                autoFocus
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
              />
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Todos
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                    categoryFilter === c
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {CATEGORY_LABELS[c] ?? c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="overflow-auto flex-1 p-6 space-y-5">
          {grouped.length === 0 ? (
            <div className="text-center py-10">
              <Search className="mx-auto text-slate-300 mb-2" size={28} />
              <p className="text-sm text-slate-500">No se encontraron widgets con "{query}"</p>
            </div>
          ) : (
            grouped.map(({ cat, items }) => (
              <div key={cat}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  {CATEGORY_LABELS[cat] ?? cat}
                </h3>
                <div className="space-y-2">
                  {items.map((w) => {
                    const Icon = w.icon;
                    const activeIds = activeTypeMap[w.type] ?? [];
                    const isActive = activeIds.length > 0;

                    return (
                      <div
                        key={w.type}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                          isActive
                            ? 'border-emerald-200 bg-emerald-50/40'
                            : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                        }`}
                      >
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-indigo-100 text-indigo-600'
                          }`}
                        >
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {w.name}
                            </p>
                            {isActive && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 shrink-0">
                                <Check size={10} /> activo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {w.description}
                          </p>
                        </div>
                        <div className="shrink-0 flex gap-1">
                          {isActive && (
                            <button
                              onClick={() => activeIds.forEach((id) => removeWidget(panelId, id))}
                              title={`Quitar ${activeIds.length > 1 ? `(${activeIds.length}) ` : ''}del panel`}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Minus size={12} /> Quitar
                            </button>
                          )}
                          <button
                            onClick={() => addWidget(panelId, w.type, w.defaultSize)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                          >
                            <Plus size={12} /> {isActive ? 'Otra vez' : 'Agregar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Tip: podés agregar el mismo widget varias veces si querés compararlo con distinta config.
          </p>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 text-white px-4 py-1.5 text-sm font-medium hover:bg-slate-800"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
