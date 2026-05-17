import { useEffect } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { useStockData } from '../StockDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';
import { ChartSkeleton } from '../../../../components/ui/WidgetSkeleton';

export default function ReposicionWidget() {
  const { reposicion, loadingReposicion, fetchReposicion } = useStockData();

  useEffect(() => { fetchReposicion(); }, [fetchReposicion]);

  if (loadingReposicion) {
    return <ChartSkeleton />;
  }

  const sugerencias = reposicion?.sugerencias ?? [];
  const costoTotal = sugerencias.reduce((s, r) => s + Number(r.costo_estimado || 0), 0);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {sugerencias.length > 0 && (
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          <span className="text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg px-3 py-1.5">
            {sugerencias.length} artículo{sugerencias.length !== 1 ? 's' : ''} para reponer
          </span>
          <span className="text-sm font-bold text-slate-700">
            Est. {formatCurrency(costoTotal)}
          </span>
        </div>
      )}
      <div className="flex-1 overflow-auto min-h-0">
        {sugerencias.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-emerald-700">
            <CheckCircle size={36} className="text-emerald-400" />
            <p className="font-medium">Sin reposición urgente</p>
          </div>
        ) : (
          <table className="min-w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                {['Artículo', 'Stock', 'Vta/día', 'Días cob.', 'Reponer', 'Costo est.', 'Proveedor'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sugerencias.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate">{r.nombre}</td>
                  <td className="px-3 py-2 tabular-nums text-right text-slate-600">{formatNumber(r.stock_actual)}</td>
                  <td className="px-3 py-2 tabular-nums text-right text-slate-500">{Number(r.venta_diaria || 0).toFixed(1)}</td>
                  <td className="px-3 py-2 tabular-nums text-right">
                    <span className={r.dias_cobertura < 15 ? 'font-bold text-red-600' : r.dias_cobertura < 30 ? 'text-amber-600' : 'text-slate-600'}>
                      {r.dias_cobertura >= 999 ? '∞' : r.dias_cobertura}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-right font-semibold text-indigo-700">{formatNumber(r.cantidad_sugerida)}</td>
                  <td className="px-3 py-2 tabular-nums text-right text-slate-700">{formatCurrency(r.costo_estimado)}</td>
                  <td className="px-3 py-2 text-slate-400 max-w-[120px] truncate">{r.ultimo_proveedor || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
