import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, Building2, LogOut, FileSpreadsheet, RefreshCw, TrendingUp, PackageSearch, Landmark, Users, Truck, Wallet, Package, UserCheck, Menu, X } from 'lucide-react';
import useAuthStore from '../store/authStore';

const MainLayout = () => {
  const { user, logout, activeCompany } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-slate-900 text-slate-300 shadow-xl
          transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0 lg:transition-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
              <FileSpreadsheet className="text-indigo-500" size={22} />
              BI Engine
            </h1>
            <button
              onClick={closeSidebar}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {user?.is_admin && activeCompany && (
            <div className="mt-5 rounded-lg border border-slate-700 bg-slate-800 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Viendo Empresa</p>
              <div className="flex items-center justify-between">
                <span className="max-w-[120px] truncate text-sm font-semibold text-white" title={activeCompany.name}>
                  {activeCompany.name}
                </span>
                <Link
                  to="/admin/companies"
                  onClick={closeSidebar}
                  className="flex items-center gap-1 text-xs text-indigo-400 transition-colors hover:text-indigo-300"
                >
                  <RefreshCw size={12} />
                  Cambiar
                </Link>
              </div>
            </div>
          )}
        </div>

        <nav className="mt-2 flex-1 space-y-0.5 overflow-y-auto px-3 pb-2">
          <NavLink
            to="/dashboard"
            end
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'}`
            }
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/dashboard/sync"
            onClick={closeSidebar}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'}`
            }
          >
            <UploadCloud size={18} />
            <span>Sincronizar Excel</span>
          </NavLink>

          <div className="pb-1 pt-5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Analítica</p>
          </div>

          {analyticsLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}

          {user?.is_admin && (
            <>
              <div className="pb-1 pt-5">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Administración</p>
              </div>
              <NavLink
                to="/admin/companies"
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'}`
                }
              >
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
              className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <div className="text-sm font-medium text-slate-500">
            Demo Consultora / <span className="text-slate-900">Plataforma</span>
          </div>
        </header>

        {/* Page Content */}
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
