import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Waves } from 'lucide-react';

import useAuthStore from '../../store/authStore';
import usePanelLayoutStore from '../../store/panelLayoutStore';
import FilterBar from '../../components/FilterBar';
import EditablePanel from '../../components/EditablePanel';
import AddPanelWidgetModal from '../../components/AddPanelWidgetModal';
import SavedViews from '../../components/analytics/SavedViews';
import ExportButton from '../../components/analytics/ExportButton';

import CajaDataProvider, { useCajaData } from './caja/CajaDataContext';
import CAJA_WIDGET_CATALOG, {
  getCajaWidgetDef,
  CAJA_DEFAULT_WIDGETS,
  CAJA_DEFAULT_LAYOUTS,
} from './caja/widgets';

const PANEL_ID = 'caja';

const CajaPanelInner = () => {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const { error, refetch, qs } = useCajaData();
  const panelRef = useRef(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { registerDefaults } = usePanelLayoutStore();

  useEffect(() => {
    registerDefaults(PANEL_ID, {
      widgets: CAJA_DEFAULT_WIDGETS,
      layouts: CAJA_DEFAULT_LAYOUTS,
    });
  }, []);

  if (user?.is_admin && !activeCompany) {
    return (
      <div className="py-20 text-center">
        <Waves className="mx-auto text-slate-400" size={40} />
        <h2 className="mt-4 text-xl font-bold text-slate-900">Seleccioná una empresa</h2>
        <p className="mt-2 text-slate-500">Los paneles analíticos leen datos del schema tenant activo.</p>
        <Link to="/admin/companies" className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
          Elegir empresa
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex items-center justify-between">
        <p className="text-red-700 font-medium">{error}</p>
        <button onClick={refetch} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-0" ref={panelRef}>
      <FilterBar />

      <div className="space-y-3 pt-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Panel Flujo de Caja</h1>
            <p className="text-sm text-slate-500">Ingresos, egresos, saldo acumulado y análisis por tipo de movimiento.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SavedViews />
            <ExportButton
              label="Exportar movimientos"
              endpoint={`/analytics/caja/movimientos${qs}&limit=10000`}
              filename="caja_movimientos"
            />
          </div>
        </div>

        <EditablePanel
          panelId={PANEL_ID}
          catalog={CAJA_WIDGET_CATALOG}
          getWidgetDef={getCajaWidgetDef}
          onAddWidget={() => setShowAddModal(true)}
          title="Panel Caja"
        />
      </div>

      {showAddModal && (
        <AddPanelWidgetModal
          catalog={CAJA_WIDGET_CATALOG}
          panelId={PANEL_ID}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

const CajaAnalyticsView = () => (
  <CajaDataProvider>
    <CajaPanelInner />
  </CajaDataProvider>
);

export default CajaAnalyticsView;
