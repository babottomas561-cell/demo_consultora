import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, AdminRoute } from './components/Auth';
import MainLayout from './components/MainLayout';
import LoginView from './views/LoginView';
import DashboardView from './views/DashboardView';
import CompanyListView from './views/CompanyListView';
import CompanyCreateView from './views/CompanyCreateView';
import SyncExcelView from './views/SyncExcelView';

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
          
          {/* Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin/companies" element={<CompanyListView />} />
            <Route path="/admin/companies/new" element={<CompanyCreateView />} />
          </Route>
        </Route>
      </Route>

      {/* Redirect all unknown routes to dashboard (which handles unauth automatically) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
