import { useCallback, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import { Plus, Pencil, RotateCcw, Lock, X } from 'lucide-react';
import usePanelLayoutStore from '../store/panelLayoutStore';
import { BREAKPOINTS, BREAKPOINT_COLS } from '../constants/breakpoints';
import 'react-grid-layout/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const WidgetWrapper = ({ widget, editing, onRemove, widgetDef, children }) => {
  if (!widgetDef) return null;

  const isKpi = widgetDef.category === 'kpi';

  // KPI widgets render their own styled card — no wrapper header needed
  if (isKpi) {
    return (
      <div className="h-full relative group">
        {editing && (
          <div className="absolute inset-0 z-10 rounded-xl cursor-grab active:cursor-grabbing">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onRemove(widget.id)}
              className="absolute top-1 right-1 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50/80 transition-colors opacity-0 group-hover:opacity-100 z-20"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden group">
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0 ${
          editing ? 'cursor-grab active:cursor-grabbing bg-slate-50' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <widgetDef.icon size={14} className="text-slate-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-700 truncate">
            {widgetDef.name}
          </span>
        </div>
        {editing && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(widget.id)}
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 justify-end">
        {editing && (
          <>
            <button
              onClick={onAddClick ?? onAddWidget}
              disabled={!(onAddClick ?? onAddWidget)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Plus size={16} /> Agregar widget
            </button>
            <button
              onClick={() => store.resetToDefault(panelId)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={16} /> Resetear
            </button>
          </>
        )}
        <button
          onClick={() => store.toggleEditing(panelId)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            editing
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {editing ? (
            <>
              <Lock size={16} /> Guardar
            </>
          ) : (
            <>
              <Pencil size={16} /> Editar
            </>
          )}
        </button>
      </div>

      {editing && (
        <div className="hidden rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700 sm:block">
          Modo edición: arrastrá y redimensioná los widgets. Hacé clic en{' '}
          <strong>Guardar</strong> cuando termines.
        </div>
      )}

      <ResponsiveGridLayout
        className="layout"
        layouts={panel.layouts}
        breakpoints={BREAKPOINTS}
        cols={BREAKPOINT_COLS}
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
