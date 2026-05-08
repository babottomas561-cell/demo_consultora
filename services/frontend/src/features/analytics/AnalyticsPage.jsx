import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

import apiClient from '../../api/client';
import useAuthStore from '../../store/authStore';
import { formatCurrency, withCompanyParam } from './analyticsUtils';

const KpiCard = ({ label, value, tone = 'default' }) => {
  const toneClass = tone === 'danger' ? 'text-red-700 bg-red-50' : tone === 'success' ? 'text-emerald-700 bg-emerald-50' : 'text-indigo-700 bg-indigo-50';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className={`mt-3 inline-flex px-3 py-1 rounded-lg ${toneClass}`}>
        <span className="text-xl font-bold">{value}</span>
      </div>
    </div>
  );
};

const DataTable = ({ title, rows, columns, emptyLabel = 'Sin datos para mostrar.' }) => (
  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-200">
      <h3 className="font-semibold text-slate-900">{title}</h3>
    </div>
    {rows?.length ? (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-5 py-3 text-left font-semibold text-slate-600">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-5 py-3 text-slate-700">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="px-5 py-8 text-sm text-slate-500">{emptyLabel}</div>
    )}
  </div>
);

const SeriesChart = ({ data, bars }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data || []}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="periodo" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
          <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
          {bars.map((bar) => (
            <Bar key={bar.key} dataKey={bar.key} fill={bar.color} name={bar.label} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const AnalyticsPage = ({ title, description, endpoint, buildView }) => {
  const user = useAuthStore((state) => state.user);
  const activeCompany = useAuthStore((state) => state.activeCompany);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`${endpoint}${withCompanyParam(user, activeCompany)}`);
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel analítico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((user?.company_id) || (user?.is_admin && activeCompany)) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, activeCompany, endpoint]);

  if (user?.is_admin && !activeCompany) {
    return (
      <div className="py-20 text-center">
        <Activity className="mx-auto text-slate-400" size={40} />
        <h2 className="mt-4 text-xl font-bold text-slate-900">Seleccioná una empresa</h2>
        <p className="mt-2 text-slate-500">Los paneles analíticos leen datos del schema tenant activo.</p>
        <Link to="/admin/companies" className="mt-6 inline-flex px-4 py-2 bg-indigo-600 text-white rounded-lg">
          Elegir empresa
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-slate-500">
        <Loader2 className="animate-spin mr-2" size={22} />
        Cargando panel
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
        <button onClick={loadData} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-200 rounded-lg text-red-700">
          <RefreshCw size={16} />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 mt-1">{description}</p>
      </div>
      {buildView(data || {}, { KpiCard, DataTable, SeriesChart })}
    </div>
  );
};

export default AnalyticsPage;
