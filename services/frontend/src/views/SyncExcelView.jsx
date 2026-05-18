import { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import apiClient from '../api/client';
import useAuthStore from '../store/authStore';

const SyncExcelView = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, uploading, processing, done, failed
  const [jobResult, setJobResult] = useState(null);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);
  const { user, activeCompany } = useAuthStore();

  // If user is admin, they shouldn't sync excel without selecting a company, but for simplicity of this demo,
  // we will just show a warning if they are admin but no company_id is present, or assume they just test the UI.
  // The backend supports passing `company_id` for admins, but we'll stick to basic upload first.
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const pollJobStatus = async (jobId) => {
    try {
      const response = await apiClient.get(`/sync/jobs/${jobId}`);
      const data = response.data;
      
      if (data.status === 'done') {
        setStatus('done');
        setJobResult(data.result);
      } else if (data.status === 'failed') {
        setStatus('failed');
        setError(data.error);
      } else {
        // still processing, poll again
        setTimeout(() => pollJobStatus(jobId), 2000);
      }
    } catch (err) {
      setStatus('failed');
      setError('Error al consultar el estado del trabajo.');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setStatus('uploading');
    setError(null);
    setJobResult(null);

    const formData = new FormData();
    formData.append('file', file);
    
    if (user?.is_admin && activeCompany?.id) {
      formData.append('company_id', activeCompany.id);
    }

    try {
      const response = await apiClient.post('/sync/excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const { job_id } = response.data;
      setStatus('processing');
      pollJobStatus(job_id);
      
    } catch (err) {
      setStatus('failed');
      setError(err.response?.data?.detail || 'Error al subir el archivo.');
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setJobResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sincronizar Excel</h1>
        <p className="text-slate-500 mt-1">Carga masiva de datos transaccionales</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        
        {status === 'idle' && (
          <div 
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".xlsx,.xls" 
              className="hidden" 
            />
            <div className="flex flex-col items-center cursor-pointer">
              <UploadCloud className="text-slate-400 mb-4" size={48} />
              <p className="text-lg font-medium text-slate-700">
                {file ? file.name : "Haz clic o arrastra un archivo aquí"}
              </p>
              <p className="text-sm text-slate-500 mt-2">Solo archivos .xlsx o .xls</p>
            </div>
          </div>
        )}

        {(status === 'uploading' || status === 'processing') && (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {status === 'uploading' ? 'Subiendo archivo...' : 'Procesando en background...'}
              </h3>
              <p className="text-slate-500 mt-2">
                {status === 'processing' ? 'Esto puede demorar unos minutos dependiendo del tamaño.' : 'Por favor no cierres la ventana.'}
              </p>
            </div>
          </div>
        )}

        {status === 'done' && jobResult && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">¡Sincronización Exitosa!</h3>
              <div className="mt-6 flex flex-col sm:flex-row gap-6 justify-center">
                <div className="bg-slate-50 px-6 py-4 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium">Filas Importadas</p>
                  <p className="text-3xl font-bold text-indigo-600">{jobResult.rows_inserted}</p>
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-lg border border-slate-200">
                  <p className="text-sm text-slate-500 font-medium">Filas Ignoradas (Duplicadas)</p>
                  <p className="text-3xl font-bold text-slate-600">{jobResult.rows_skipped}</p>
                </div>
              </div>
            </div>
            <button 
              onClick={reset}
              className="mt-8 px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Subir otro archivo
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-2">
              <AlertCircle size={40} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Error en la Sincronización</h3>
              <p className="text-red-600 mt-2 max-w-lg mx-auto">{error}</p>
            </div>
            <button 
              onClick={reset}
              className="mt-8 px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
            >
              Intentar nuevamente
            </button>
          </div>
        )}

        {status === 'idle' && file && (
          <div className="mt-6 flex justify-between items-center">
            <a
              href="/template_demo_consultora.xlsx"
              download
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Download size={14} /> Descargar Template
            </a>
            <button
              onClick={handleUpload}
              className="flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <FileSpreadsheet className="mr-2" size={18} />
              Procesar Archivo
            </button>
          </div>
        )}
        {status === 'idle' && !file && (
          <div className="mt-6 flex justify-start">
            <button
              onClick={() => {
                alert("Descargando template_demo_consultora.xlsx...");
              }}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Descargar Template de Excel
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default SyncExcelView;
