import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, DollarSign, Activity, ShoppingCart, Loader2, RefreshCcw } from 'lucide-react';
import useAuthStore from '../store/authStore';
import apiClient from '../api/client';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (isoString) => {
  if (!isoString) return 'Nunca';
  const date = new Date(isoString);
  return date.toLocaleString('es-AR', { 
    day: '2-digit', month: 'short', year: 'numeric', 
    hour: '2-digit', minute:'2-digit' 
  });
};

const StatCard = ({ title, metric, icon: Icon, loading }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      {loading ? (
        <div className="h-8 w-24 bg-slate-200 animate-pulse rounded mt-2"></div>
      ) : (
        <h3 className="text-2xl font-bold text-slate-900">{metric}</h3>
      )}
    </div>
    <div className="p-3 bg-indigo-50 rounded-lg">
      <Icon className="text-indigo-600" size={24} />
    </div>
  </div>
);

const DashboardView = () => {
  const user = useAuthStore(state => state.user);
  
  const [kpis, setKpis] = useState(null);
  const [topClientes, setTopClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, topRes] = await Promise.all([
        apiClient.get('/dashboard/kpis'),
        apiClient.get('/dashboard/top-clientes')
      ]);
      setKpis(kpiRes.data);
      setTopClientes(topRes.data);
    } catch (err) {
      console.error(err);
      setError('Error al cargar los datos del dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.company_id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // If user has no company yet
  if (!user?.company_id && !user?.is_admin) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-slate-900">Sin empresa asociada</h2>
        <p className="text-slate-500 mt-2">Por favor contacta al administrador.</p>
      </div>
    );
  }

  // Admin without company warning
  if (!user?.company_id && user?.is_admin) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
          <Activity size={32} className="text-slate-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Hola Administrador</h2>
          <p className="text-slate-500 mt-2">Para ver métricas, ingresa como un usuario de inquilino o selecciona una empresa.</p>
        </div>
        <div className="pt-4">
          <Link to="/admin/companies" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            Gestionar Empresas
          </Link>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-100 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={fetchData} className="px-3 py-1 bg-white text-red-600 rounded text-sm hover:bg-red-50 border border-red-200">
          Reintentar
        </button>
      </div>
    );
  }

  // Empty State (no transactions)
  if (!loading && kpis?.total_transacciones === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
        <div className="h-24 w-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
          <ShoppingCart size={48} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Aún no hay datos</h2>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Sincronizá tu primer archivo Excel para comenzar a visualizar los KPIs y reportes financieros.
          </p>
        </div>
        <Link 
          to="/dashboard/sync"
          className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
        >
          <RefreshCcw size={18} className="mr-2" />
          Sincronizar Excel
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hola, {user?.email}</h1>
          <p className="text-slate-500 mt-1">Aquí tienes el resumen financiero de tu empresa.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Ventas del Mes" 
          metric={formatCurrency(kpis?.total_ventas_mes || 0)} 
          icon={DollarSign} 
          loading={loading} 
        />
        <StatCard 
          title="Clientes Activos" 
          metric={kpis?.total_clientes || 0} 
          icon={Users} 
          loading={loading} 
        />
        <StatCard 
          title="Transacciones" 
          metric={kpis?.total_transacciones || 0} 
          icon={ShoppingCart} 
          loading={loading} 
        />
        <StatCard 
          title="Última Sincronización" 
          metric={formatDate(kpis?.ultimo_sync)} 
          icon={Activity} 
          loading={loading} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Proyección de Ventas (6 meses)</h3>
          {loading ? (
            <div className="h-80 w-full bg-slate-50 animate-pulse rounded-lg border border-slate-100"></div>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis?.ventas_por_mes || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b' }} 
                    dx={-10}
                    tickFormatter={(value) => `$${value / 1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => formatCurrency(value)}
                    labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                  />
                  <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Clientes Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Clientes del Mes</h3>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex justify-between items-center">
                  <div className="h-4 w-32 bg-slate-200 animate-pulse rounded"></div>
                  <div className="h-4 w-16 bg-slate-200 animate-pulse rounded"></div>
                </div>
              ))}
            </div>
          ) : topClientes.length === 0 ? (
            <p className="text-slate-500 text-sm">No hay ventas registradas este mes.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {topClientes.map((cliente, idx) => (
                <li key={cliente.cliente_id} className="py-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-[150px]">
                        {cliente.cliente_nombre}
                      </p>
                      <p className="text-xs text-slate-500">{cliente.transacciones} compras</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-indigo-600">
                    {formatCurrency(cliente.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
