import { useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useComprasData } from '../ComprasDataContext';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';

const fmtCurrency = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(v ?? 0));

const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('es-AR');
};

const GROUPS = [
  { key: 'hoy', label: 'HOY', cls: 'border-red-200 bg-red-50 text-red-700 font-semibold' },
  { key: 'semana', label: 'ESTA SEMANA', cls: 'border-orange-200 bg-orange-50 text-orange-700' },
  { key: 'mes', label: 'ESTE MES', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  { key: 'futuro', label: 'MÁS ADELANTE', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
];

export default function CalendarioPagosWidget() {
  const { vencimientos, loadingVencimientos, fetchVencimientos } = useComprasData();

  useEffect(() => { fetchVencimientos(); }, [fetchVencimientos]);

  if (loadingVencimientos) {
    return <ChartSkeleton />;
  }

  const data = Array.isArray(vencimientos) ? vencimientos : [];
  const grouped = {
    hoy: data.filter((r) => r.urgencia === 'hoy'),
    semana: data.filter((r) => r.urgencia === 'semana'),
    mes: data.filter((r) => r.urgencia === 'mes'),
    futuro: data.filter((r) => r.urgencia === 'futuro'),
  };

  const hayHoy = grouped.hoy.length > 0;

  return (
    <div className="h-full w-full p-4 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Calendario de pagos</h3>
        {hayHoy && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
            <AlertCircle size={11} /> {grouped.hoy.length} vence hoy
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <div className="grid grid-cols-2 gap-3 h-full min-h-[200px]">
          {GROUPS.map(({ key, label, cls }) => (
            <div key={key} className="rounded-lg border border-slate-200 bg-white p-3 overflow-auto">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{label}</p>
              {grouped[key].length ? (
                <div className="space-y-2">
                  {grouped[key].slice(0, 5).map((item, idx) => (
                    <div key={idx} className={`rounded-md border p-2 text-xs ${cls}`}>
                      <p className="font-semibold truncate">{item.proveedor_nombre}</p>
                      <p className="text-base font-bold mt-0.5">{fmtCurrency(item.importe)}</p>
                      <p className="opacity-75 mt-0.5">{fmtDate(item.fecha_vencimiento)}</p>
                    </div>
                  ))}
                  {grouped[key].length > 5 && (
                    <p className="text-xs text-slate-400">+{grouped[key].length - 5} más</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Sin vencimientos</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
