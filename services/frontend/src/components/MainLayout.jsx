import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, Building2, LogOut, FileSpreadsheet } from 'lucide-react';
import useAuthStore from '../store/authStore';

const MainLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-indigo-500" size={24} />
            BI Engine
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavLink 
            to="/dashboard" 
            end
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-slate-100'}`
            }
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink 
            to="/dashboard/sync" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-slate-100'}`
            }
          >
            <UploadCloud size={20} />
            <span>Sincronizar Excel</span>
          </NavLink>

          {user?.is_admin && (
            <>
              <div className="pt-6 pb-2">
                <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Administración</p>
              </div>
              <NavLink 
                to="/admin/companies" 
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-slate-100'}`
                }
              >
                <Building2 size={20} />
                <span>Empresas</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-200">{user?.email}</span>
              <span className="text-xs text-slate-500">{user?.is_admin ? 'Administrador' : 'Usuario'}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
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
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
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
