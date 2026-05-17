import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, RefreshCw } from 'lucide-react';

import useAuthStore from '../../store/authStore';
import usePanelLayoutStore from '../../store/panelLayoutStore';
import FilterBar from '../../components/FilterBar';
import EditablePanel from '../../components/EditablePanel';
import AddPanelWidgetModal from '../../components/AddPanelWidgetModal';
import SavedViews from '../../components/analytics/SavedViews';
import ExportButton from '../../components/analytics/ExportButton';

import ClientesDataProvider, { useClientesData } from './clientes/ClientesDataContext';
import CLIENTES_WIDGET_CATALOG, {
  getClientesWidgetDef,
  CLIENTES_DEFAULT_WIDGETS,
  CLIENTES_DEFAULT_LAYOUTS,
} from './clientes/widgets';
import { buildExportData } from './analyticsUtils';

const PANEL_ID = 'clientes';

const ClientesPanelInner = () => {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const { error, refetch, qs, kpis, ranking, temporal, detalle, comprobantes } = useClientesData();
  const panelRef = useRef(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { registerDefaults } = usePanelLayoutStore();

  useEffect(() => {
    registerDefaults(PANEL_ID, {
      widgets: CLIENTES_DEFAULT_WIDGETS,
      layouts: CLIENTES_DEFAULT_LAYOUTS,
    });
  }, []);

  if (user?.is_admin && !activeCompany) {
    return (
      <div className="py-20 text-center">
        <Users className="mx-auto text-slate-400" size={40} />
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Panel Clientes</h1>
            <p className="text-sm text-slate-500">Ranking, segmentación ABC, temporal y detalle por cliente.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={refetch}
              title="Actualizar datos"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
            >
              <RefreshCw size={15} />
            </button>
                        <SavedViews />
            <ExportButton
              label="Exportar ranking"
              endpoint={`/analytics/clientes/ranking${qs}`}
              data={buildExportData({
                KPIs: kpis,
                Ranking: ranking?.clientes,
                Temporal: temporal?.series,
                DetalleProductos: detalle?.productos,
                DetalleTemporal: detalle?.evolucion,
                Comprobantes: comprobantes?.comprobantes,
              })}
              filename="clientes_ranking"
            />
          </div>
        </div>

        <EditablePanel
          panelId={PANEL_ID}
          catalog={CLIENTES_WIDGET_CATALOG}
          getWidgetDef={getClientesWidgetDef}
          onAddWidget={() => setShowAddModal(true)}
          title="Panel Clientes"
        />
      </div>

      {showAddModal && (
        <AddPanelWidgetModal
          catalog={CLIENTES_WIDGET_CATALOG}
          panelId={PANEL_ID}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

const ClientesAnalyticsView = () => (
  <ClientesDataProvider>
    <ClientesPanelInner />
  </ClientesDataProvider>
);

export default ClientesAnalyticsView;
