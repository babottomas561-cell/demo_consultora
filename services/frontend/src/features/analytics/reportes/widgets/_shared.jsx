import { Loader2, RefreshCw, Radio, Database } from 'lucide-react';
import useAuthStore from '../../../../store/authStore';

export const moraColor = (dias) => {
  if (dias === null || dias === undefined) return 'bg-slate-100 text-slate-500';
  if (dias <= 0) return 'bg-green-100 text-green-700';
  if (dias <= 30) return 'bg-yellow-100 text-yellow-700';
  if (dias <= 60) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
};

export const pctColor = (pct) => {
  if (pct >= 90) return 'bg-green-100 text-green-700';
  if (pct >= 70) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

export const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${className}`}>
    {children}
  </span>
);

export function SourceBadge() {
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const user = useAuthStore((s) => s.user);
  const hasConnector = Boolean(activeCompany?.infomanager_enabled || user?.infomanager_enabled);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        hasConnector ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
      }`}
      title={hasConnector ? 'Datos en vivo desde Infomanager' : 'Datos locales sincronizados'}
    >
      {hasConnector ? <Radio size={10} className="animate-pulse" /> : <Database size={10} />}
      {hasConnector ? 'En vivo · Infomanager' : 'Datos locales'}
    </span>
  );
}

export function WidgetShell({ loading, error, onRetry, kpis, children, empty }) {
  return (
    <div className="flex h-full flex-col">
      {kpis && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 bg-slate-50 px-4 py-2">
          {kpis.map(({ label, value, sub, className }, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
              <span className={`text-sm font-bold text-slate-900 ${className || ''}`}>{value}</span>
              {sub && <span className="text-[10px] text-slate-400">{sub}</span>}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <SourceBadge />
            <button
              onClick={onRetry}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="animate-spin text-indigo-400" size={24} />
          </div>
        )}
        {!loading && error && (
          <div className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {!loading && !error && empty && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">{empty}</div>
        )}
        {!loading && !error && !empty && children}
      </div>
    </div>
  );
}
