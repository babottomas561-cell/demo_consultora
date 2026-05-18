import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, LogOut, FileSpreadsheet, RefreshCw, TrendingUp, PackageSearch, Landmark, Users, Truck, Wallet, Package, UserCheck, Menu, X } from 'lucide-react';
import useAuthStore from '../store/authStore';

const MainLayout = () => {
  const { user, logout, activeCompany } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cerrar sidebar al navegar
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const analyticsLinks = [
    { to: '/analytics/ventas', label: 'Ventas', icon: TrendingUp },
    { to: '/analytics/compras', label: 'Compras', icon: PackageSearch },
    { to: '/analytics/resultado', label: 'Resultado', icon: Landmark },
    { to: '/analytics/stock', label: 'Stock', icon: Package },
    { to: '/analytics/vendedores', label: 'Vendedores', icon: UserCheck },
    { to: '/analytics/clientes', label: 'Clientes / Cta Cte', icon: Users },
    { to: '/analytics/proveedores', label: 'Proveedores', icon: Truck },
    { to: '/analytics/caja', label: 'Caja', icon: Wallet },
  ];

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
    }`;

  const SidebarContent = () => (
    <>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
            <FileSpreadsheet className="text-indigo-500" size={22} />
            BI Engine
          </h1>
          {/* Botón cerrar en mobile */}
          <button
            className="lg:hidden text-slate-400 hover:text-white p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {user?.is_admin && activeCompany && (
          <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800 p-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Viendo Empresa</p>
            <div className="flex items-center justify-between">
              <span className="max-w-[120px] truncate text-sm font-semibold text-white" title={activeCompany.name}>
                {activeCompany.name}
              </span>
              <Link to="/admin/companies" className="flex items-center gap-1 text-xs text-indigo-400 transition-colors hover:text-indigo-300">
                <RefreshCw size={12} />
                Cambiar
              </Link>
            </div>
          </div>
        )}
      </div>

      <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3">
        <NavLink to="/dashboard" end className={navLinkClass}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>


        <div className="pt-5 pb-1.5">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Analítica</p>
        </div>

        {analyticsLinks.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={navLinkClass}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}

        {user?.is_admin && (
          <>
            <div className="pt-5 pb-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Administración</p>
            </div>
            <NavLink to="/admin/companies" className={navLinkClass}>
              <Building2 size={18} />
              <span>Empresas</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-slate-200">{user?.email}</span>
            <span className="text-xs text-slate-500">{user?.is_admin ? 'Administrador' : 'Usuario'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="ml-2 shrink-0 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar desktop (siempre visible) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-slate-900 text-slate-300 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile (drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 text-slate-300 shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Contenido principal */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          {/* Hamburguesa en mobile */}
          <button
            className="lg:hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <FileSpreadsheet size={16} className="text-indigo-500 lg:hidden" />
            <span className="hidden sm:inline">Demo Consultora /</span>
            <span className="text-slate-900">Plataforma</span>
          </div>
        </header>

        {/* Contenido de la página */}
        <div className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
