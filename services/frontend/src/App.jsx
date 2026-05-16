import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './components/Auth';
import MainLayout from './components/MainLayout';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import CompanyListView from './views/CompanyListView';
import CompanyCreateView from './views/CompanyCreateView';
import CompanyUsersView from './views/CompanyUsersView';
import SyncExcelView from './views/SyncExcelView';
import VentasAnalyticsView from './features/analytics/VentasAnalyticsView';
import ComprasAnalyticsView from './features/analytics/ComprasAnalyticsView';
import ResultadoAnalyticsView from './features/analytics/ResultadoAnalyticsView';
import ClientesAnalyticsView from './features/analytics/ClientesAnalyticsView';
import ProveedoresAnalyticsView from './features/analytics/ProveedoresAnalyticsView';
import CajaAnalyticsView from './features/analytics/CajaAnalyticsView';
import StockAnalyticsView from './features/analytics/StockAnalyticsView';
import VendedoresAnalyticsView from './features/analytics/VendedoresAnalyticsView';

// Trigger rebuild to inject VITE_API_URL properly in production

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/dashboard/sync" element={<SyncExcelView />} />
          <Route path="/analytics/ventas" element={<VentasAnalyticsView />} />
          <Route path="/analytics/compras" element={<ComprasAnalyticsView />} />
          <Route path="/analytics/resultado" element={<ResultadoAnalyticsView />} />
          <Route path="/analytics/stock" element={<StockAnalyticsView />} />
          <Route path="/analytics/vendedores" element={<VendedoresAnalyticsView />} />
          <Route path="/analytics/clientes" element={<ClientesAnalyticsView />} />
          <Route path="/analytics/proveedores" element={<ProveedoresAnalyticsView />} />
          <Route path="/analytics/caja" element={<CajaAnalyticsView />} />

          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/companies" element={<CompanyListView />} />
            <Route path="/admin/companies/new" element={<CompanyCreateView />} />
            <Route path="/admin/companies/:companyId/users" element={<CompanyUsersView />} />
          </Route>
        </Route>
      </Route>

      {/* Redirect all unknown routes to dashboard (which handles unauth automatically) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
