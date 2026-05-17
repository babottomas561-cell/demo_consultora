import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useStockData } from '../StockDataContext';
import { formatCurrency, formatNumber } from '../../analyticsUtils';

const ESTADO_BADGE = {
  ok: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
  bajo: 'text-amber-700 bg-amber-50 border border-amber-200',
  sin_stock: 'text-red-700 bg-red-50 border border-red-200',
  sobrestock: 'text-indigo-700 bg-indigo-50 border border-indigo-200',
  sin_movimiento: 'text-slate-600 bg-slate-100 border border-slate-200',
};
const ESTADO_LABEL = { ok: 'OK', bajo: 'Bajo', sin_stock: 'Sin stock', sobrestock: 'Sobrestock', sin_movimiento: 'Sin movim.' };
const ROW_BG = { sin_stock: 'bg-red-50/60', bajo: 'bg-amber-50/40' };

export default function InventarioWidget() {
  const { inventario, loadingInventario } = useStockData();

  if (loadingInventario) {
    return <TableSkeleton />;
  }

  const productos = inventario?.productos ?? [];
  const porDeposito = inventario?.por_deposito ?? [];

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {porDeposito.length > 0 && (
        <div className="flex gap-3 px-4 pt-4 pb-3 overflow-x-auto shrink-0">
          {porDeposito.map((d) => (
            <div key={d.cod_deposito} className="rounded-lg border border-slate-200 bg-white px-4 py-3 shrink-0 min-w-[140px]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{d.nombre || `Dep. ${d.cod_deposito}`}</p>
              <p className="text-base font-bold text-slate-900 mt-1">{formatCurrency(d.valor_total)}</p>
              <p className="text-xs text-slate-400">{formatNumber(d.total_articulos)} artículos</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {['Artículo', 'Depósito', 'Stock', 'Mín', 'Valor', 'Vendido', 'Vta/día', 'Días inv.', 'Estado'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {productos.map((r, i) => (
              <tr key={i} className={`hover:bg-slate-50 ${ROW_BG[r.estado] || ''}`}>
                <td className="px-3 py-2 font-medium text-slate-800 max-w-[180px] truncate">{r.nombre}</td>
                <td className="px-3 py-2 text-slate-500">{r.deposito_nombre || '-'}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-700">{formatNumber(r.cantidad)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-400">{formatNumber(r.stock_minimo)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-700">{formatCurrency(r.valor_stock)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-500">{formatNumber(r.unidades_vendidas_periodo)}</td>
                <td className="px-3 py-2 tabular-nums text-right text-slate-500">{Number(r.venta_diaria_promedio || 0).toFixed(1)}</td>
                <td className="px-3 py-2 tabular-nums text-right">
                  <span className={r.dias_inventario > 180 ? 'font-bold text-indigo-600' : r.dias_inventario < 30 ? 'font-bold text-red-600' : 'text-slate-600'}>
                    {r.dias_inventario >= 999 ? '∞' : r.dias_inventario}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${ESTADO_BADGE[r.estado] ?? 'text-slate-500 bg-slate-100'}`}>
                    {ESTADO_LABEL[r.estado] ?? r.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!productos.length && <p className="p-4 text-sm text-slate-400">Sin datos de inventario.</p>}
      </div>
    </div>
  );
}
