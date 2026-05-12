import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, Loader2, Database, ChevronRight, Trash2, AlertTriangle, Users } from 'lucide-react';
import apiClient from '../api/client';
import useAuthStore from '../store/authStore';

const DeleteModal = ({ company, onConfirm, onCancel, loading }) => {
  const [typed, setTyped] = useState('');
  const confirmed = typed === company.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Eliminar empresa</h2>
            <p className="text-sm text-slate-500">Esta acción es irreversible</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 mb-4">
          Se eliminará <span className="font-semibold text-slate-900">{company.name}</span> y su base de datos completa
          (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">{company.tenant_schema}</code>).
          Todos los datos analíticos, ventas, clientes y configuraciones se perderán definitivamente.
        </p>

        <label className="block text-sm font-medium text-slate-700 mb-1">
          Escribí el nombre de la empresa para confirmar:
        </label>
        <input
          type="text"
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder={company.name}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
          autoFocus
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmed || loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

const CompanyListView = () => {
  const navigate = useNavigate();
  const { setActiveCompany, activeCompany, clearActiveCompany } = useAuthStore(state => ({
    setActiveCompany: state.setActiveCompany,
    activeCompany: state.activeCompany,
    clearActiveCompany: state.clearActiveCompany,
  }));

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/companies/${toDelete.id}`);
      setCompanies(prev => prev.filter(c => c.id !== toDelete.id));
      if (activeCompany?.id === toDelete.id) {
        clearActiveCompany?.();
      }
      setToDelete(null);
    } catch (err) {
      setError(`Error al eliminar "${toDelete.name}". Intente nuevamente.`);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toDelete && (
        <DeleteModal
          company={toDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setToDelete(null)}
          loading={deleting}
        />
      )}

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
                <li
                  key={company.id}
                  onClick={() => {
                    setActiveCompany(company);
                    navigate('/dashboard');
                  }}
                  className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{company.name}</h3>
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
                  <div className="flex items-center gap-3">
                    {activeCompany?.id === company.id && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Viendo
                      </span>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        navigate(`/admin/companies/${company.id}/users`);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      title="Gestionar usuarios"
                    >
                      <Users size={13} /> Usuarios
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setToDelete(company);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar empresa"
                    >
                      <Trash2 size={16} />
                    </button>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      Entrar
                    </span>
                    <ChevronRight size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
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
