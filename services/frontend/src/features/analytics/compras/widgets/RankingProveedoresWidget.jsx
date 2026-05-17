import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useComprasData } from '../ComprasDataContext';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';

const fmtCurrency = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(v ?? 0));

const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('es-AR');
};

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

export default function RankingProveedoresWidget() {
  const { proveedores, loadingProveedores } = useComprasData();

  if (loadingProveedores) {
    return <TableSkeleton />;
  }

  const rows = Array.isArray(proveedores?.proveedores) ? proveedores.proveedores : (Array.isArray(proveedores) ? proveedores : []);
  if (!rows.length) return <p className="p-4 text-sm text-slate-400">Sin proveedores en el período.</p>;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-slate-700">Ranking de proveedores</h3>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <table className="min-w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-50">
            <tr>
              {['Proveedor', 'Total', 'Órdenes', '% Total', 'Var. precio', 'Último pedido'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => {
              const varPct = Number(row.precio_promedio_variacion ?? 0);
              const VarIcon = varPct > 0 ? TrendingUp : varPct < 0 ? TrendingDown : Minus;
              const varColor = varPct > 10 ? 'text-red-600' : varPct > 0 ? 'text-amber-600' : 'text-emerald-600';
              return (
                <tr key={`prov-${i}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{row.proveedor_nombre}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-700">{fmtCurrency(row.total_comprado)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-slate-500">{row.ordenes}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 max-w-[60px]">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(Number(row.pct_total ?? 0), 100)}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums">{fmtPct(row.pct_total)}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-2.5 ${varColor}`}>
                    <span className="inline-flex items-center gap-1 text-xs font-medium">
                      <VarIcon size={12} />
                      {fmtPct(varPct)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 tabular-nums">{fmtDate(row.ultimo_pedido)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
