import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, RefreshCw } from 'lucide-react';

import useAuthStore from '../../store/authStore';
import usePanelLayoutStore from '../../store/panelLayoutStore';
import FilterBar from '../../components/FilterBar';
import EditablePanel from '../../components/EditablePanel';
import AddPanelWidgetModal from '../../components/AddPanelWidgetModal';
import PeriodComparator from '../../components/analytics/PeriodComparator';
import SavedViews from '../../components/analytics/SavedViews';
import ExportButton from '../../components/analytics/ExportButton';

import CrossFilterProvider from '../../components/analytics/CrossFilterProvider';
import DrillThroughBreadcrumbs from '../../components/analytics/DrillThroughBreadcrumbs';

import VentasDataProvider, { useVentasData } from './ventas/VentasDataContext';
import VENTAS_WIDGET_CATALOG, {
  getVentasWidgetDef,
  VENTAS_DEFAULT_WIDGETS,
  VENTAS_DEFAULT_LAYOUTS,
} from './ventas/widgets';
import { buildExportData } from './analyticsUtils';

const PANEL_ID = 'ventas';

const VentasPanelInner = () => {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const { error, refetch, kpis, temporal, productos, vendedores, clientes, comprobantes, transacciones } = useVentasData();
  const panelRef = useRef(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { registerDefaults } = usePanelLayoutStore();

  useEffect(() => {
    registerDefaults(PANEL_ID, {
      widgets: VENTAS_DEFAULT_WIDGETS,
      layouts: VENTAS_DEFAULT_LAYOUTS,
    });
  }, []);

  if (user?.is_admin && !activeCompany) {
    return (
      <div className="py-20 text-center">
        <Activity className="mx-auto text-slate-400" size={40} />
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Panel Ventas</h1>
            <p className="text-sm text-slate-500">Ingresos, márgenes, clientes y vendedores.</p>
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
              data={buildExportData({
                KPIs: kpis,
                Temporal: temporal,
                Productos: productos?.ranking,
                Rubros: productos?.por_rubro,
                Vendedores: vendedores?.vendedores,
                Clientes: clientes?.clientes,
                Comprobantes: comprobantes?.por_tipo,
                Transacciones: transacciones?.rows,
              })}
              filename="ventas"
              panelRef={panelRef}
            />
          </div>
        </div>

        <PeriodComparator />
        <DrillThroughBreadcrumbs />

        <EditablePanel
          panelId={PANEL_ID}
          catalog={VENTAS_WIDGET_CATALOG}
          getWidgetDef={getVentasWidgetDef}
          onAddClick={() => setShowAddModal(true)}
        />

        {showAddModal && (
          <AddPanelWidgetModal
            panelId={PANEL_ID}
            catalog={VENTAS_WIDGET_CATALOG}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </div>
    </div>
  );
};

const VentasAnalyticsView = () => (
  <CrossFilterProvider>
    <VentasDataProvider>
      <VentasPanelInner />
    </VentasDataProvider>
  </CrossFilterProvider>
);

export default VentasAnalyticsView;
