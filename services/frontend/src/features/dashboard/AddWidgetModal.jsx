import { X, Plus } from 'lucide-react';
import WIDGET_CATALOG from './widgets';
import useDashboardStore from '../../store/dashboardStore';

const categories = { kpi: 'Indicadores', chart: 'Gráficos', table: 'Tablas' };

export default function AddWidgetModal({ onClose }) {
  const { widgets, addWidget } = useDashboardStore();
  const activeTypes = new Set(widgets.map(w => w.type));

  const handleAdd = (widget) => {
    addWidget(widget.type, widget.defaultSize);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Agregar Widget</h2>
            <p className="text-sm text-slate-500">Elegí qué mostrar en tu dashboard</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-auto flex-1 p-6 space-y-6">
          {Object.entries(categories).map(([cat, label]) => {
            const items = WIDGET_CATALOG.filter(w => w.category === cat);
            return (
              <div key={cat}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{label}</h3>
                <div className="space-y-2">
                  {items.map(w => {
                    const Icon = w.icon;
                    const alreadyAdded = activeTypes.has(w.type);
                    return (
                      <div key={w.type} className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${alreadyAdded ? 'border-slate-100 bg-slate-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'}`}>
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${alreadyAdded ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                          <Icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${alreadyAdded ? 'text-slate-400' : 'text-slate-900'}`}>{w.name}</p>
                          <p className="text-xs text-slate-500 truncate">{w.description}</p>
                        </div>
                        <button
                          onClick={() => handleAdd(w)}
                          disabled={alreadyAdded}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500"
                        >
                          {alreadyAdded ? 'Agregado' : <><Plus size={14} /> Agregar</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
