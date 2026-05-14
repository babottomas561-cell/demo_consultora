import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, Building2, LogOut, FileSpreadsheet, RefreshCw, TrendingUp, PackageSearch, Landmark, Users, Truck, Wallet, Package, UserCheck, Database } from 'lucide-react';
import useAuthStore from '../store/authStore';

const MainLayout = () => {
  const { user, logout, activeCompany } = useAuthStore();
  const navigate = useNavigate();

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
    { to: '/analytics/infomanager-reportes', label: 'Reportes IMP', icon: Database },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="z-10 flex w-64 flex-col bg-slate-900 text-slate-300 shadow-xl">
        <div className="p-6">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white">
            <FileSpreadsheet className="text-indigo-500" size={22} />
            BI Engine
          </h1>
          
          {user?.is_admin && activeCompany && (
            <div className="mt-6 rounded-lg border border-slate-700 bg-slate-800 p-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Viendo Empresa</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white truncate max-w-[120px]" title={activeCompany.name}>
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

        <nav className="mt-4 flex-1 space-y-1 px-3">
          <NavLink 
            to="/dashboard" 
            end
            className={({ isActive }) => 
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'}`
            }
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink 
            to="/dashboard/sync" 
            className={({ isActive }) => 
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'}`
            }
          >
            <UploadCloud size={18} />
            <span>Sincronizar Excel</span>
          </NavLink>

          <div className="pt-6 pb-2">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Analítica</p>
          </div>

          {analyticsLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'}`
              }
            >
              <Icon size={18} />
              <span className="text-sm">{label}</span>
            </NavLink>
          ))}

          {user?.is_admin && (
            <>
              <div className="pt-6 pb-2">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Administración</p>
              </div>
              <NavLink 
                to="/admin/companies" 
                className={({ isActive }) => 
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'}`
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
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-200">{user?.email}</span>
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
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header - Minimalist */}
        <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-8">
          <div className="text-sm text-slate-500 font-medium">
            Demo Consultora / <span className="text-slate-900">Plataforma</span>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-slate-50 p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
