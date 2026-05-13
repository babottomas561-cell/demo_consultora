import { useEffect } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { useStockData } from '../StockDataContext';
import { formatNumber } from '../../analyticsUtils';

const SEV_STYLES = {
  critical: { bar: 'border-l-4 border-red-500 bg-red-50', badge: 'bg-red-100 text-red-700', icon: '🔴' },
  warning: { bar: 'border-l-4 border-amber-500 bg-amber-50', badge: 'bg-amber-100 text-amber-700', icon: '🟡' },
  info: { bar: 'border-l-4 border-blue-400 bg-blue-50', badge: 'bg-blue-100 text-blue-700', icon: '🔵' },
};

export default function AlertasStockWidget() {
  const { alertas, loadingAlertas, fetchAlertas } = useStockData();

  useEffect(() => { fetchAlertas(); }, [fetchAlertas]);

  if (loadingAlertas) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={24} /></div>;
  }

  const lista = alertas?.alertas ?? [];
  const resumen = alertas?.resumen ?? {};

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Resumen */}
      <div className="flex gap-3 px-4 pt-4 pb-3 shrink-0">
        {[['critical', 'Críticas'], ['warning', 'Advertencias'], ['info', 'Info']].map(([k, label]) => (
          <div key={k} className={`flex-1 rounded-lg px-3 py-2 text-center ${SEV_STYLES[k]?.badge}`}>
            <p className="text-xl font-bold">{resumen[k] ?? 0}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto min-h-0 px-4 pb-4">
        {lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-emerald-700">
            <CheckCircle size={36} className="text-emerald-400" />
            <p className="font-medium">Sin alertas activas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {lista.map((a, i) => {
              const s = SEV_STYLES[a.severidad] ?? SEV_STYLES.info;
              return (
                <div key={i} className={`rounded-lg p-3 ${s.bar}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {s.icon} {a.nombre}
                        <span className="ml-1.5 text-xs text-slate-400 font-normal">#{a.cod_articulo}</span>
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{a.detalle}</p>
                      <p className="text-xs text-indigo-600 font-medium mt-1">→ {a.accion_sugerida}</p>
                    </div>
                    <div className="text-right shrink-0 text-xs text-slate-500">
                      <p>Stock: <span className="font-medium">{formatNumber(a.stock_actual)}</span></p>
                      <p>Mín: {formatNumber(a.stock_minimo)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
