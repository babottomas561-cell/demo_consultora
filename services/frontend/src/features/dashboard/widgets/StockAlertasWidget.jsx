import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAnalyticsData } from '../useDashboardData';

export default function StockAlertasWidget() {
  const { data, loading } = useAnalyticsData('/stock/alertas');

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>;

  const raw = data?.alertas || data;
  const items = (Array.isArray(raw) ? raw : []).slice(0, 20);

  if (!items.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
        <AlertTriangle size={24} />
        <p className="text-sm">Sin alertas de stock.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 pt-0">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <th className="pb-2 pr-4">Artículo</th>
            <th className="pb-2 pr-4 text-right">Stock</th>
            <th className="pb-2 text-right">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, i) => (
            <tr key={i} className="text-slate-700">
              <td className="py-2 pr-4 truncate max-w-[200px]">{item.articulo || item.producto || item.descripcion || `Art. ${item.cod_articulo}`}</td>
              <td className="py-2 pr-4 text-right tabular-nums font-medium">{item.stock ?? item.cantidad ?? 0}</td>
              <td className="py-2 text-right">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  (item.stock ?? item.cantidad ?? 0) === 0
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {(item.stock ?? item.cantidad ?? 0) === 0 ? 'Sin stock' : 'Bajo'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
