import { useEffect } from 'react';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmtCohortMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MONTHS_ES[parseInt(m, 10) - 1]} ${String(y).slice(-2)}`;
}

function retentionColor(pct) {
  if (pct === undefined || pct === null) return 'bg-slate-50 text-slate-300';
  if (pct >= 80) return 'bg-emerald-600 text-white';
  if (pct >= 60) return 'bg-emerald-400 text-white';
  if (pct >= 40) return 'bg-amber-300 text-amber-900';
  if (pct >= 20) return 'bg-orange-200 text-orange-800';
  if (pct > 0)   return 'bg-red-100 text-red-700';
  return 'bg-slate-50 text-slate-300';
}

export default function CohortRetencionWidget() {
  const { cohort, loadingCohort, fetchCohort } = useVentasData();

  useEffect(() => { fetchCohort(); }, [fetchCohort]);

  if (loadingCohort) return <TableSkeleton />;

  const cohorts = cohort?.cohorts ?? [];
  const maxOffset = cohort?.max_offset ?? 11;

  if (!cohorts.length) return (
    <div className="h-full flex items-center justify-center text-sm text-slate-400 p-4 text-center">
      No hay suficientes datos históricos para calcular retención de cohortes.
    </div>
  );

  const offsets = Array.from({ length: Math.min(maxOffset + 1, 7) }, (_, i) => i);

  return (
    <div className="h-full flex flex-col px-3 py-2 gap-2">
      <div className="flex items-center justify-between shrink-0">
        <p className="text-xs font-semibold text-slate-600">Retención mensual por cohorte</p>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <span className="w-3 h-3 rounded-sm bg-emerald-600 shrink-0" /> Alta
          <span className="w-3 h-3 rounded-sm bg-amber-300 shrink-0 ml-1" /> Media
          <span className="w-3 h-3 rounded-sm bg-red-100 shrink-0 ml-1" /> Baja
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left py-1 pr-2 text-slate-400 font-medium whitespace-nowrap sticky left-0 bg-white z-10 text-[10px]">
                Cohorte
              </th>
              <th className="text-center px-1 py-1 text-slate-400 font-medium text-[10px] whitespace-nowrap">
                N
              </th>
              {offsets.map(i => (
                <th key={i} className="text-center px-1 py-1 text-slate-400 font-medium text-[10px] whitespace-nowrap">
                  M+{i}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.slice(-12).map((c) => (
              <tr key={c.cohort_month} className="border-t border-slate-50">
                <td className="py-1 pr-2 whitespace-nowrap text-slate-600 font-medium sticky left-0 bg-white z-10 text-[10px]">
                  {fmtCohortMonth(c.cohort_month)}
                </td>
                <td className="text-center px-1 py-1 text-slate-500 tabular-nums text-[10px]">
                  {c.cohort_size}
                </td>
                {offsets.map(i => {
                  const pct = c.retention?.[i];
                  return (
                    <td key={i} className="px-0.5 py-0.5">
                      <div className={`rounded text-center text-[10px] font-semibold py-1 min-w-[28px] tabular-nums ${retentionColor(pct)}`}>
                        {pct != null ? `${pct}%` : '—'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-slate-400 text-center shrink-0">
        % clientes que volvieron a comprar en el mes M+N desde su primera compra
      </p>
    </div>
  );
}
