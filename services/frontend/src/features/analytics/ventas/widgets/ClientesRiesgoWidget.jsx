import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, Sparkles, Users } from 'lucide-react';
import { TableSkeleton } from '../../../../components/ui/WidgetSkeleton';
import { useVentasData } from '../VentasDataContext';
import { formatCurrencyShort } from '../../analyticsUtils';

const TABS = [
  { id: 'perdidos',  label: 'Perdidos',   icon: AlertTriangle,  color: 'red',     desc: 'Compraban antes, no compraron este período' },
  { id: 'en_caida',  label: 'En caída',   icon: TrendingDown,   color: 'amber',   desc: 'Compraron pero ≥40% menos que antes' },
  { id: 'nuevos',    label: 'Nuevos',     icon: Sparkles,       color: 'emerald', desc: 'Primera compra en el período' },
];

const COLOR_MAP = {
  red:     { bg: 'bg-red-600',     bgSoft: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     accent: 'text-red-600' },
  amber:   { bg: 'bg-amber-500',   bgSoft: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   accent: 'text-amber-600' },
  emerald: { bg: 'bg-emerald-600', bgSoft: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', accent: 'text-emerald-600' },
};

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export default function ClientesRiesgoWidget() {
  const { clientesRiesgo, loadingClientesRiesgo, fetchClientesRiesgo, comparar } = useVentasData();
  const [tab, setTab] = useState('perdidos');

  useEffect(() => { fetchClientesRiesgo(); }, [fetchClientesRiesgo]);

  if (loadingClientesRiesgo) return <TableSkeleton />;

  if (!clientesRiesgo) return (
    <div className="h-full flex items-center justify-center text-sm text-slate-400 p-4 text-center">
      Sin datos para análisis de clientes en riesgo.
    </div>
  );

  const { perdidos = [], en_caida = [], nuevos = [], totales = {} } = clientesRiesgo;
  const data = tab === 'perdidos' ? perdidos : tab === 'en_caida' ? en_caida : nuevos;
  const counts = {
    perdidos: totales.perdidos_cnt ?? perdidos.length,
    en_caida: totales.en_caida_cnt ?? en_caida.length,
    nuevos:   totales.nuevos_cnt ?? nuevos.length,
  };
  const headlineByTab = {
    perdidos: { value: totales.perdidos_facturado_ant ?? 0, label: 'Facturado perdido' },
    en_caida: { value: totales.en_caida_riesgo ?? 0,        label: 'Riesgo de caída' },
    nuevos:   { value: totales.nuevos_facturado ?? 0,       label: 'Facturado de nuevos' },
  };

  const currentColor = COLOR_MAP[TABS.find(t => t.id === tab).color];

  return (
    <div className="h-full flex flex-col px-3 py-2 gap-2">
      {/* Tabs */}
      <div className="flex gap-1 shrink-0">
        {TABS.map(t => {
          const Icon = t.icon;
          const c = COLOR_MAP[t.color];
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors
                ${isActive ? `${c.bg} text-white` : `border border-slate-200 text-slate-600 hover:bg-slate-50`}`}>
              <div className="flex items-center gap-1">
                <Icon size={11} />
                <span>{t.label}</span>
              </div>
              <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-slate-400'}`}>{counts[t.id]}</span>
            </button>
          );
        })}
      </div>

      {/* Headline KPI */}
      <div className={`rounded-xl ${currentColor.bgSoft} border ${currentColor.border} px-3 py-2 shrink-0`}>
        <p className={`text-[10px] font-semibold uppercase tracking-wide ${currentColor.text}`}>{headlineByTab[tab].label}</p>
        <p className={`text-lg font-bold tabular-nums ${currentColor.text}`}>{formatCurrencyShort(headlineByTab[tab].value)}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{TABS.find(t => t.id === tab).desc}</p>
      </div>

      {/* Lista */}
      <div className="flex-1 min-h-0 overflow-auto relative">
        {!comparar && tab !== 'nuevos' ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 gap-2">
            <Users className="text-slate-300" size={24} />
            <p className="text-xs font-medium text-slate-500">Activá "Comparar período anterior"</p>
            <p className="text-[10px] text-slate-400">Necesario para detectar clientes {tab === 'perdidos' ? 'perdidos' : 'en caída'}.</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400 text-center py-4">
            {tab === 'perdidos' && '✓ Sin clientes perdidos en este período.'}
            {tab === 'en_caida' && '✓ Sin clientes con caída significativa.'}
            {tab === 'nuevos' && 'Sin clientes nuevos en este período.'}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-100">
                <th className="text-left py-1.5 px-2 text-slate-400 font-medium">Cliente</th>
                {tab !== 'nuevos' && (
                  <>
                    <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Antes</th>
                    <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Ahora</th>
                    <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Δ</th>
                  </>
                )}
                {tab === 'nuevos' && (
                  <>
                    <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Facturado</th>
                    <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Tickets</th>
                    <th className="text-right py-1.5 px-2 text-slate-400 font-medium">Primera</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.cod_cliente} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-1.5 px-2 text-slate-700 max-w-[160px] truncate font-medium">{c.cliente_nombre}</td>
                  {tab !== 'nuevos' && (
                    <>
                      <td className="py-1.5 px-2 text-right text-slate-500 tabular-nums">{formatCurrencyShort(c.facturado_anterior)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-700 tabular-nums">{formatCurrencyShort(c.facturado_actual)}</td>
                      <td className={`py-1.5 px-2 text-right font-semibold tabular-nums ${currentColor.accent}`}>{fmtPct(c.variacion_pct)}</td>
                    </>
                  )}
                  {tab === 'nuevos' && (
                    <>
                      <td className="py-1.5 px-2 text-right text-slate-700 tabular-nums font-semibold">{formatCurrencyShort(c.facturado_actual)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-500 tabular-nums">{c.tickets}</td>
                      <td className="py-1.5 px-2 text-right text-slate-400 tabular-nums text-[10px]">{fmtDate(c.primera_compra)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
