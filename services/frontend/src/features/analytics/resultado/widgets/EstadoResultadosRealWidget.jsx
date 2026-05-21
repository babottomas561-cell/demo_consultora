import { useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';
import { formatCurrencyShort } from '../../analyticsUtils';

const fmt = (v) => formatCurrencyShort(v ?? 0);
const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

function LineER({ label, value, indent = false, bold = false, highlight = null, pct = null }) {
  const cls = highlight === 'positive' ? 'text-emerald-700'
            : highlight === 'negative' ? 'text-red-600'
            : bold ? 'text-slate-900' : 'text-slate-700';
  return (
    <div className={`flex items-center justify-between py-1 ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold' : ''} ${cls}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-bold' : 'font-medium'} ${cls}`}>
        {fmt(value)}
        {pct != null && <span className="ml-2 text-xs text-slate-400">{fmtPct(pct)}</span>}
      </span>
    </div>
  );
}

function Divider() { return <div className="border-t border-slate-200 my-1" />; }

function DetailSection({ title, items, expanded, onToggle }) {
  return (
    <div className="mt-2">
      <button onClick={onToggle} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium">
        {expanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>} {title} ({items.length})
      </button>
      {expanded && (
        <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-slate-100">
          {items.map((it) => (
            <div key={it.cuenta} className="flex justify-between text-xs text-slate-500">
              <span className="truncate max-w-[60%]">{it.descripcion}</span>
              <span className="tabular-nums">{fmt(it.saldo)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EstadoResultadosRealWidget() {
  const [showIngDetail, setShowIngDetail] = useState(false);
  const [showEgrDetail, setShowEgrDetail] = useState(false);

  const { data, loading, error } = useInfomanagerFetch('resultado/estado-resultados', (f) => ({
    desde: f.desde,
    hasta: f.hasta,
  }));

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-2 p-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-4 rounded bg-slate-200" style={{ width: `${60 + (i * 7) % 35}%` }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 p-4">
        <AlertCircle size={24} className="text-red-400" />
        <p className="text-sm text-center">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const r = data.resumen;
  const esDeriado = data.fuente === 'derivado_ventas_compras';

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Estado de Resultados</h3>
        {esDeriado && (
          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Estimado (sin mayor)
          </span>
        )}
      </div>

      <div className="bg-emerald-50 rounded-lg p-2 mb-2">
        <LineER label="Ingresos por Ventas"  value={r.ingresos_ventas} bold />
        {r.ingresos_otros > 0 && <LineER label="Otros Ingresos" value={r.ingresos_otros} indent />}
        <Divider />
        <LineER label="Total Ingresos" value={r.total_ingresos} bold highlight="positive" />
      </div>

      <div className="px-1 mb-1">
        <LineER label="(-) Costo Mercadería (COGS)" value={r.cogs} highlight={r.cogs > 0 ? 'negative' : null} />
        <Divider />
        <LineER label="Margen Bruto" value={r.margen_bruto} bold
          highlight={r.margen_bruto >= 0 ? 'positive' : 'negative'} pct={r.margen_pct} />
      </div>

      {r.gastos_estructura > 0 && (
        <div className="px-1 mb-1">
          <LineER label="(-) Gastos de Estructura" value={r.gastos_estructura} highlight="negative" />
          <Divider />
          <LineER label="EBITDA" value={r.ebitda} bold highlight={r.ebitda >= 0 ? 'positive' : 'negative'} />
        </div>
      )}

      {(r.gastos_financieros > 0 || r.impuestos > 0) && (
        <div className="px-1 mb-1">
          {r.gastos_financieros > 0 && <LineER label="(-) Gastos Financieros" value={r.gastos_financieros} highlight="negative" />}
          {r.impuestos > 0 && <LineER label="(-) Impuestos" value={r.impuestos} highlight="negative" />}
        </div>
      )}

      <div className={`rounded-lg p-2 mt-1 ${r.resultado_neto >= 0 ? 'bg-emerald-100' : 'bg-red-50'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">Resultado Neto</span>
          <div className="flex items-center gap-2">
            {r.resultado_neto >= 0
              ? <TrendingUp size={14} className="text-emerald-600" />
              : <TrendingDown size={14} className="text-red-500" />}
            <span className={`text-lg font-bold tabular-nums ${r.resultado_neto >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {fmt(r.resultado_neto)}
            </span>
          </div>
        </div>
      </div>

      {!esDeriado && (data.detalle_ingresos?.length > 0 || data.detalle_egresos?.length > 0) && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          {data.detalle_ingresos?.length > 0 && (
            <DetailSection title="Detalle Ingresos" items={data.detalle_ingresos}
              expanded={showIngDetail} onToggle={() => setShowIngDetail(v => !v)} />
          )}
          {data.detalle_egresos?.length > 0 && (
            <DetailSection title="Detalle Egresos" items={data.detalle_egresos}
              expanded={showEgrDetail} onToggle={() => setShowEgrDetail(v => !v)} />
          )}
        </div>
      )}
    </div>
  );
}
