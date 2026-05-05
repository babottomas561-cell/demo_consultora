import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { ArticulosPage } from "./pages/ArticulosPage";
import { ClientesPage } from "./pages/ClientesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EERRPage } from "./pages/EERRPage";
import { LoginPage } from "./pages/LoginPage";
import { VendedoresPage } from "./pages/VendedoresPage";
import { VentasPage } from "./pages/VentasPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/ventas" element={<ProtectedRoute><VentasPage /></ProtectedRoute>} />
      <Route path="/clientes" element={<ProtectedRoute><ClientesPage /></ProtectedRoute>} />
      <Route path="/articulos" element={<ProtectedRoute><ArticulosPage /></ProtectedRoute>} />
      <Route path="/vendedores" element={<ProtectedRoute><VendedoresPage /></ProtectedRoute>} />
      <Route path="/eerr" element={<ProtectedRoute><EERRPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
