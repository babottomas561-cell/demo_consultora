import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';
import { formatCurrencyShort } from '../../analyticsUtils';

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

function Row({ label, value, pct, indent = 0, bold, color, subtle, divider, sign }) {
  return (
    <div className={`flex items-center justify-between gap-2 py-1.5 ${divider ? 'border-t border-slate-200' : ''}`}>
      <div className="flex items-center gap-1 min-w-0" style={{ paddingLeft: indent * 12 }}>
        {sign && <span className={`text-xs ${color ?? 'text-slate-400'}`}>{sign}</span>}
        <span className={`text-xs truncate ${bold ? 'font-bold text-slate-900' : subtle ? 'text-slate-400' : 'text-slate-600'}`}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {pct != null && (
          <span className={`text-[10px] tabular-nums w-12 text-right ${subtle ? 'text-slate-300' : 'text-slate-400'}`}>
            {pct}
          </span>
        )}
        <span className={`text-xs tabular-nums w-24 text-right ${bold ? 'font-bold' : 'font-medium'} ${color ?? 'text-slate-700'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

export default function EstadoResultadosWidget() {
  const { kpis, resultadoKpis, loadingKpis } = useVentasData();

  if (loadingKpis) return <TableSkeleton />;

  if (!kpis && !resultadoKpis) return (
    <div className="h-full flex items-center justify-center text-sm text-slate-400">Sin datos.</div>
  );

  const facturadoBruto    = Number(kpis?.facturado_bruto?.actual ?? 0);
  const facturadoConIva   = Number(kpis?.facturado_neto?.actual ?? 0);
  const facturadoNeto     = Number(resultadoKpis?.facturado_neto?.actual ?? kpis?.facturado_neto_sin_iva?.actual ?? 0);
  const devoluciones      = facturadoBruto - facturadoConIva;
  const cogs              = Number(resultadoKpis?.cogs?.actual ?? 0);
  const margenBruto       = Number(resultadoKpis?.margen_bruto?.actual ?? (facturadoNeto - cogs));
  const margenPct         = Number(resultadoKpis?.margen_pct?.actual ?? (facturadoNeto > 0 ? margenBruto / facturadoNeto * 100 : 0));
  const descuento         = Number(resultadoKpis?.descuento_total?.actual ?? 0);
  const descuentoPct      = Number(resultadoKpis?.descuento_pct?.actual ?? 0);
  const iva               = Number(kpis?.iva_debito?.actual ?? 0);
  const cobertura         = resultadoKpis?.cobertura_costo_pct ?? null;
  const productosBajoC    = Number(resultadoKpis?.productos_bajo_costo?.actual ?? 0);

  const pct = (v) => facturadoNeto > 0 ? `${(v / facturadoNeto * 100).toFixed(1)}%` : '—';

  return (
    <div className="h-full overflow-auto px-3 py-2">
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Estado de resultados</h3>
          <span className="text-[10px] text-slate-400">Período actual</span>
        </div>

        <Row label="Ventas brutas c/IVA (FA + ND)"  value={formatCurrencyShort(facturadoBruto)}  pct="" />
        <Row label="Notas de crédito / devoluciones" value={`(${formatCurrencyShort(devoluciones)})`} pct="" indent={1} sign="−" color="text-red-500" subtle />
        <Row label="IVA débito fiscal" value={`(${formatCurrencyShort(iva)})`} pct="" indent={1} sign="−" color="text-slate-400" subtle />
        <Row label="Ventas netas s/IVA"       value={formatCurrencyShort(facturadoNeto)}   pct="100%" bold divider />
        <Row label="Costo de mercadería vendida" value={`(${formatCurrencyShort(cogs)})`} pct={pct(-cogs)} indent={1} sign="−" color="text-red-500" subtle />
        <Row label="Margen bruto"             value={formatCurrencyShort(margenBruto)}     pct={fmtPct(margenPct)} bold color={margenPct >= 30 ? 'text-emerald-700' : margenPct >= 15 ? 'text-amber-600' : 'text-red-600'} divider />

        <div className="mt-3 pt-2 border-t border-dashed border-slate-200 space-y-1">
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Descuentos otorgados</span>
            <span className="tabular-nums">{formatCurrencyShort(descuento)} ({fmtPct(descuentoPct)})</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Facturado c/IVA</span>
            <span className="tabular-nums">{formatCurrencyShort(facturadoConIva)}</span>
          </div>
          {cobertura != null && (
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">Cobertura de costos</span>
              <span className={`tabular-nums font-medium ${cobertura >= 80 ? 'text-emerald-600' : cobertura >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {fmtPct(cobertura)} de líneas
              </span>
            </div>
          )}
          {productosBajoC > 0 && (
            <div className="flex justify-between text-[11px] mt-1 rounded-md bg-red-50 px-2 py-1">
              <span className="text-red-700 font-medium">⚠ Productos vendidos bajo costo</span>
              <span className="tabular-nums font-semibold text-red-700">{productosBajoC}</span>
            </div>
          )}
        </div>

        {cobertura != null && cobertura < 60 && (
          <p className="mt-2 text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1 leading-snug">
            ⚠ Solo {cobertura}% de las líneas tienen costo cargado. El margen bruto puede estar subestimado.
          </p>
        )}
      </div>
    </div>
  );
}
