import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import { Activity, Plus, Pencil, RotateCcw, ShoppingCart, RefreshCcw, X, Lock } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useDashboardStore from '../store/dashboardStore';
import { getWidgetDef } from '../features/dashboard/widgets';
import AddWidgetModal from '../features/dashboard/AddWidgetModal';
import { useDashboardData } from '../features/dashboard/useDashboardData';
import 'react-grid-layout/css/styles.css';

const WidgetWrapper = ({ widget, editing, onRemove, children }) => {
  const def = getWidgetDef(widget.type);
  if (!def) return null;

  return (
    <div className="h-full rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden group">
      <div className={`flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0 ${editing ? 'cursor-grab active:cursor-grabbing bg-slate-50' : ''}`}>
        <div className="flex items-center gap-2 min-w-0">
          <def.icon size={14} className="text-slate-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-700 truncate">{def.name}</span>
        </div>
        {editing && (
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => onRemove(widget.id)}
            className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

const DashboardView = () => {
  const user = useAuthStore(s => s.user);
  const activeCompany = useAuthStore(s => s.activeCompany);
  const { widgets, layouts, editing, toggleEditing, updateLayouts, removeWidget, resetToDefault } = useDashboardStore();
  const { kpis, loading: dataLoading } = useDashboardData();
  const [showAddModal, setShowAddModal] = useState(false);
  const { width: containerWidth, containerRef, mounted: containerMounted } = useContainerWidth();

  const handleLayoutChange = useCallback((_, allLayouts) => {
    if (editing) updateLayouts(allLayouts);
  }, [editing, updateLayouts]);

  if (!user?.company_id && !user?.is_admin) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-slate-900">Sin empresa asociada</h2>
        <p className="text-slate-500 mt-2">Por favor contacta al administrador.</p>
      </div>
    );
  }

  if (user?.is_admin && !activeCompany) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
          <Activity size={32} className="text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Hola Administrador</h2>
          <p className="text-slate-500 mt-2">Seleccioná una empresa para ver métricas.</p>
        </div>
        <div className="pt-4">
          <Link to="/admin/companies" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            Gestionar Empresas
          </Link>
        </div>
      </div>
    );
  }

  if (!dataLoading && kpis?.total_transacciones === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
        <div className="h-24 w-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
          <ShoppingCart size={48} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Aún no hay datos</h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">Sincronizá tu primer archivo para comenzar.</p>
        </div>
        <Link to="/dashboard/sync" className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium">
          <RefreshCcw size={18} className="mr-2" /> Sincronizar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-900">
            Hola, {user?.email}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {activeCompany ? activeCompany.name : 'Tu empresa'} — Dashboard personalizable
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <>
              <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors">
                <Plus size={16} /> Agregar widget
              </button>
              <button onClick={resetToDefault} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <RotateCcw size={16} /> Resetear
              </button>
            </>
          )}
          <button
            onClick={toggleEditing}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              editing
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {editing ? <><Lock size={16} /> Guardar</> : <><Pencil size={16} /> Editar</>}
          </button>
        </div>
      </div>

      {editing && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700">
          Modo edición: arrastrá y redimensioná los widgets. Hacé clic en <strong>Guardar</strong> cuando termines.
        </div>
      )}

      <div ref={containerRef}>
        {containerMounted && containerWidth > 0 && (
          <ResponsiveGridLayout
            className="layout"
            width={containerWidth}
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768 }}
            cols={{ lg: 12, md: 12, sm: 6 }}
            rowHeight={80}
            onLayoutChange={handleLayoutChange}
            isDraggable={editing}
            isResizable={editing}
            draggableHandle=".cursor-grab"
            margin={[16, 16]}
            containerPadding={[0, 0]}
          >
            {widgets.map(widget => {
              const def = getWidgetDef(widget.type);
              if (!def) return <div key={widget.id} />;
              const Component = def.component;
              return (
                <div key={widget.id}>
                  <WidgetWrapper widget={widget} editing={editing} onRemove={removeWidget}>
                    <Component />
                  </WidgetWrapper>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>

      {showAddModal && <AddWidgetModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
};

export default DashboardView;
