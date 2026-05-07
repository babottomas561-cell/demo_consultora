import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import apiClient from '../api/client';

const CompanyCreateView = () => {
  const [name, setName] = useState('');
  const [erpType, setErpType] = useState('excel');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      await apiClient.post('/companies/', {
        name,
        erp_type: erpType
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/admin/companies');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear la empresa. Verifica los logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/companies" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nueva Empresa</h1>
          <p className="text-slate-500 mt-1">Crear un nuevo tenant en la plataforma</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        {success ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">✓ Schema Creado</h3>
              <p className="text-slate-500 mt-2">La empresa y su base de datos aislada han sido configuradas exitosamente.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nombre de la Empresa</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Distribuidora Juárez"
                className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Tipo de ERP origen</label>
              <select
                value={erpType}
                onChange={e => setErpType(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg"
              >
                <option value="excel">Excel (Manual)</option>
                <option value="infomanager">Infomanager</option>
                <option value="tango">Tango Gestión</option>
                <option value="sql">SQL Server Directo</option>
              </select>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-100 text-sm">
                {error}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm disabled:opacity-50"
              >
                {loading && <Loader2 className="animate-spin mr-2" size={16} />}
                {loading ? 'Creando Infraestructura...' : 'Crear Empresa'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CompanyCreateView;
