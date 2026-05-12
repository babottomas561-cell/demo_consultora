import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, KeyRound, Loader2, RotateCw } from 'lucide-react';
import apiClient from '../api/client';

const CompanyCreateView = () => {
  const [name, setName] = useState('');
  const [erpType, setErpType] = useState('excel');
  const [meses, setMeses] = useState('12');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://impedidos.infomanager.com.ar');
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [createdCompany, setCreatedCompany] = useState(null);
  const [connectorStatus, setConnectorStatus] = useState(null);
  
  const navigate = useNavigate();

  const fetchConnectorStatus = async (companyId) => {
    try {
      const response = await apiClient.get(`/connectors/${companyId}`);
      setConnectorStatus(response.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.detail || 'No se pudo consultar el estado del conector.');
      }
    }
  };

  useEffect(() => {
    if (!success || !createdCompany?.id || erpType !== 'infomanager') return undefined;

    fetchConnectorStatus(createdCompany.id);
    const interval = setInterval(() => {
      fetchConnectorStatus(createdCompany.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [success, createdCompany?.id, erpType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setCreatedCompany(null);
    setConnectorStatus(null);
    
    try {
      const payload = {
        name,
        erp_type: erpType,
        erp_config: erpType === 'infomanager_demo' ? { meses: parseInt(meses) } : {}
      };

      if (erpType === 'infomanager') {
        payload.infomanager_connector = {
          client_id: clientId,
          client_secret: clientSecret,
          base_url: baseUrl
        };
      }

      const response = await apiClient.post('/companies/', payload);
      setCreatedCompany(response.data);
      setSuccess(true);
      if (erpType !== 'infomanager') {
        setTimeout(() => {
          navigate('/admin/companies');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear la empresa. Verifica los logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySync = async () => {
    if (!createdCompany?.id) return;
    setRetrying(true);
    setError(null);
    try {
      const response = await apiClient.post(`/connectors/${createdCompany.id}/sync?force=true`);
      setConnectorStatus(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo reintentar la sincronización.');
    } finally {
      setRetrying(false);
    }
  };

  const renderSyncStatus = () => {
    const status = connectorStatus?.sync_status || 'pending';
    if (status === 'ok') {
      return (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">OK</p>
            <p className="text-sm">Última sync: {connectorStatus?.last_sync_at ? new Date(connectorStatus.last_sync_at).toLocaleString() : 'recién finalizada'}</p>
          </div>
        </div>
      );
    }
    if (status === 'running' || status === 'pending') {
      return (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          {status === 'running' ? <Loader2 size={20} className="mt-0.5 shrink-0 animate-spin" /> : <Clock3 size={20} className="mt-0.5 shrink-0" />}
          <div>
            <p className="text-sm font-semibold">{status === 'running' ? 'Running' : 'Pending'}</p>
            <p className="text-sm">{status === 'running' ? 'Sincronizando...' : 'La sincronización quedó en cola.'}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Error</p>
            <p className="text-sm">{connectorStatus?.sync_error || 'No se pudo completar la sincronización.'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRetrySync}
          disabled={retrying}
          className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {retrying ? <Loader2 className="mr-2 animate-spin" size={16} /> : <RotateCw className="mr-2" size={16} />}
          Reintentar
        </button>
      </div>
    );
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
            {erpType === 'infomanager' && (
              <div className="w-full max-w-md space-y-4 pt-2 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Estado de sincronización</p>
                  <button
                    type="button"
                    onClick={handleRetrySync}
                    disabled={retrying}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    {retrying ? <Loader2 className="mr-2 animate-spin" size={16} /> : <RotateCw className="mr-2" size={16} />}
                    Forzar re-sincronización
                  </button>
                </div>
                {renderSyncStatus()}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/companies')}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Volver a empresas
                  </button>
                </div>
              </div>
            )}
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
                <option value="infomanager_demo">🎯 Infomanager Demo (datos simulados)</option>
                <option value="excel">Excel (Manual)</option>
                <option value="infomanager">Infomanager</option>
                <option value="tango">Tango Gestión</option>
                <option value="sql">SQL Server Directo</option>
              </select>
            </div>

            {erpType === 'infomanager_demo' && (
              <div className="bg-indigo-50 rounded-lg p-4 mt-3">
                <p className="text-indigo-700 font-medium">Modo Demo activado</p>
                <p className="text-indigo-600 text-sm mt-1">
                  Se generarán datos simulados de un comercio de 
                  indumentaria. Los datos se actualizan cada 2 minutos 
                  automáticamente.
                </p>
                <select 
                  name="meses" 
                  id="meses_demo"
                  className="mt-3 block w-full pl-3 pr-10 py-2 text-base border border-indigo-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-white"
                  value={meses}
                  onChange={e => setMeses(e.target.value)}
                >
                  <option value="6">Últimos 6 meses de historial</option>
                  <option value="12">Últimos 12 meses de historial</option>
                  <option value="24">Últimos 24 meses de historial</option>
                </select>
              </div>
            )}

            {erpType === 'infomanager' && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                    <KeyRound size={18} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">Conectar con Infomanager</h2>
                      <p className="mt-1 text-sm text-slate-600">Estas credenciales disparan la sincronización automática al crear la empresa.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Client ID</label>
                        <input
                          type="text"
                          required={erpType === 'infomanager'}
                          value={clientId}
                          onChange={e => setClientId(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700">Client Secret</label>
                        <input
                          type="password"
                          required={erpType === 'infomanager'}
                          value={clientSecret}
                          onChange={e => setClientSecret(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">URL base</label>
                      <input
                        type="url"
                        required={erpType === 'infomanager'}
                        value={baseUrl}
                        onChange={e => setBaseUrl(e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                {loading ? 'Creando Infraestructura...' : erpType === 'infomanager' ? 'Conectar y sincronizar' : 'Crear Empresa'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CompanyCreateView;
