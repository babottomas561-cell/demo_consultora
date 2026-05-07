import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Plus, Loader2, Database } from 'lucide-react';
import apiClient from '../api/client';

const CompanyListView = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await apiClient.get('/companies/');
        setCompanies(response.data);
      } catch (err) {
        setError('Error al cargar las empresas.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-slate-500 mt-1">Gestión de inquilinos y bases de datos</p>
        </div>
        <Link 
          to="/admin/companies/new"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
        >
          <Plus size={18} className="mr-2" />
          Nueva Empresa
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {companies.length === 0 ? (
              <li className="p-8 text-center text-slate-500">
                No hay empresas registradas aún.
              </li>
            ) : (
              companies.map(company => (
                <li key={company.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{company.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                        <Database size={14} />
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                          {company.tenant_schema}
                        </span>
                        <span>•</span>
                        <span className="uppercase text-xs font-semibold tracking-wider">{company.erp_type}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Activa
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CompanyListView;
