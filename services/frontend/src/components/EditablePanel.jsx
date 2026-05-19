import { useCallback, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import { Plus, Pencil, RotateCcw, Lock, X, Move, GripVertical } from 'lucide-react';
import usePanelLayoutStore from '../store/panelLayoutStore';
import 'react-grid-layout/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WidgetWrapper = ({ widget, editing, onRemove, widgetDef, children }) => {
  if (!widgetDef) return null;

  const isKpi = widgetDef.category === 'kpi';
  // Widgets que renderean su propio chrome (card + toolbar). Evitamos el doble header.
  const selfChrome = isKpi || widgetDef.selfChrome === true;

  if (selfChrome) {
    return (
      <div className={`h-full relative group ${editing ? 'ring-2 ring-indigo-300 ring-offset-1 rounded-xl' : ''}`}>
        {editing && (
          <>
            {/* Drag overlay para widgets self-chrome */}
            <div className="absolute inset-0 z-10 rounded-xl cursor-grab active:cursor-grabbing bg-indigo-500/0 hover:bg-indigo-500/5 transition-colors">
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-white/90 backdrop-blur px-1.5 py-0.5 shadow-sm">
                <GripVertical size={11} className="text-slate-400" />
                <span className="text-[10px] font-medium text-slate-500">arrastrar</span>
              </div>
            </div>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onRemove(widget.id)}
              title="Quitar widget"
              className="absolute top-1.5 right-1.5 z-20 p-1.5 rounded-md bg-white/90 backdrop-blur shadow-sm text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <X size={13} />
            </button>
          </>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className={`h-full rounded-xl border bg-white shadow-sm flex flex-col overflow-hidden group ${editing ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-slate-200'}`}>
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0 ${
          editing ? 'cursor-grab active:cursor-grabbing bg-indigo-50' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {editing && <GripVertical size={13} className="text-indigo-400 shrink-0" />}
          <widgetDef.icon size={14} className={`shrink-0 ${editing ? 'text-indigo-500' : 'text-slate-400'}`} />
          <span className={`text-sm font-semibold truncate ${editing ? 'text-indigo-700' : 'text-slate-700'}`}>
            {widgetDef.name}
          </span>
        </div>
        {editing && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(widget.id)}
            title="Quitar widget"
            className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
};

export default function EditablePanel({
  panelId,
  catalog,
  getWidgetDef,
  onAddClick,
  onAddWidget,
  children: headerChildren,
}) {
  const store = usePanelLayoutStore();
  const panel = store.getPanel(panelId);
  const editing = store.isEditing(panelId);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleLayoutChange = useCallback(
    (_, allLayouts) => {
      if (editing) store.updateLayouts(panelId, allLayouts);
    },
    [editing, panelId, store]
  );

  const handleRemove = useCallback(
    (widgetId) => store.removeWidget(panelId, widgetId),
    [panelId, store]
  );

  const handleReset = () => {
    if (confirmReset) {
      store.resetToDefault(panelId);
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
    }
  };

  const isEmpty = !panel.widgets || panel.widgets.length === 0;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 justify-end flex-wrap">
        <button
          onClick={onAddClick ?? onAddWidget}
          disabled={!(onAddClick ?? onAddWidget)}
          title="Agregar o quitar widgets"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors disabled:opacity-40"
        >
          <Plus size={15} /> Widgets
        </button>

        {editing && (
          <button
            onClick={handleReset}
            title="Restaurar el diseño predeterminado"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              confirmReset
                ? 'border-red-300 bg-red-600 text-white hover:bg-red-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <RotateCcw size={15} />
            {confirmReset ? '¿Confirmar? Se borra tu layout' : 'Restaurar'}
          </button>
        )}

        <button
          onClick={() => store.toggleEditing(panelId)}
          title={editing ? 'Guardar y bloquear los widgets' : 'Permitir mover y redimensionar widgets'}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            editing
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {editing ? (
            <>
              <Lock size={15} /> Guardar diseño
            </>
          ) : (
            <>
              <Pencil size={15} /> Editar diseño
            </>
          )}
        </button>
      </div>

      {/* Banner modo edición */}
      {editing && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800 flex items-start gap-2.5">
          <Move size={16} className="shrink-0 mt-0.5 text-indigo-500" />
          <div className="flex-1">
            <p className="font-medium leading-tight">Modo edición activo</p>
            <p className="text-xs text-indigo-700/80 mt-0.5">
              Arrastrá los widgets desde su barra superior. Redimensioná desde la esquina inferior derecha.
              Cliqueá la <X size={10} className="inline mb-0.5" /> para quitar.
              Cuando termines, <strong>Guardar diseño</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <Plus className="text-slate-400" size={20} />
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-1">El panel está vacío</p>
          <p className="text-xs text-slate-500 mb-4">Agregá widgets para empezar a ver tus datos.</p>
          <button
            onClick={onAddClick ?? onAddWidget}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700"
          >
            <Plus size={15} /> Agregar primer widget
          </button>
        </div>
      )}

      <ResponsiveGridLayout
        className="layout"
        layouts={panel.layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 2, xxs: 2 }}
        rowHeight={80}
        onLayoutChange={handleLayoutChange}
        isDraggable={editing}
        isResizable={editing}
        draggableHandle=".cursor-grab"
        margin={[12, 12]}
        containerPadding={[0, 0]}
      >
        {panel.widgets.map((widget) => {
          const def = getWidgetDef(widget.type);
          if (!def) return <div key={widget.id} />;
          const Component = def.component;
          return (
            <div key={widget.id}>
              <WidgetWrapper
                widget={widget}
                editing={editing}
                onRemove={handleRemove}
                widgetDef={def}
              >
                <Component />
              </WidgetWrapper>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
