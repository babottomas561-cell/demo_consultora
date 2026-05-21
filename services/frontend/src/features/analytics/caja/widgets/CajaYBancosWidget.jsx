import { Landmark, Wallet, TrendingUp } from 'lucide-react';
import { useInfomanagerFetch } from '../../infomanager/useInfomanagerFetch';
import { formatCurrencyShort } from '../../analyticsUtils';

const fmt = (v) => formatCurrencyShort(v ?? 0);

function SaldoBar({ value, total, color }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function CajaYBancosWidget() {
  const { data, loading, error } = useInfomanagerFetch('caja/saldo-por-cuenta', (f) => ({
    hasta: f.hasta,
  }));

  if (loading) {
    return (
      <div className="h-full flex flex-col gap-3 p-4 animate-pulse">
        <div className="h-5 w-40 rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-2 mt-1">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded bg-slate-100" />)}
        </div>
      </div>
    );
  }

  if (error || !data?.tiene_datos) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 p-4">
        <Landmark size={32} />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600">Sin datos del mayor contable</p>
          <p className="text-xs mt-1">
            {error || 'El mayor no tiene movimientos de caja/bancos. Sincronizá el conector InfoManager.'}
          </p>
        </div>
      </div>
    );
  }

  const { total_disponible, total_caja, total_bancos, cuentas } = data;
  const cajas  = cuentas.filter(c => c.tipo === 'caja');
  const bancos = cuentas.filter(c => c.tipo === 'banco');

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Disponibilidad Total</p>
          <p className="text-2xl font-bold text-slate-900">{fmt(total_disponible)}</p>
        </div>
        <div className="bg-indigo-100 p-2 rounded-xl">
          <TrendingUp size={20} className="text-indigo-600" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-amber-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet size={13} className="text-amber-600" />
            <p className="text-[10px] font-semibold text-amber-600 uppercase">Cajas</p>
          </div>
          <p className="text-lg font-bold text-amber-700">{fmt(total_caja)}</p>
          <p className="text-[10px] text-amber-500">{cajas.length} cuenta{cajas.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-sky-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Landmark size={13} className="text-sky-600" />
            <p className="text-[10px] font-semibold text-sky-600 uppercase">Bancos</p>
          </div>
          <p className="text-lg font-bold text-sky-700">{fmt(total_bancos)}</p>
          <p className="text-[10px] text-sky-500">{bancos.length} cuenta{bancos.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
        {cajas.length > 0 && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pt-1">Cajas</p>
        )}
        {cajas.map((c) => (
          <div key={c.cuenta} className="bg-amber-50/60 rounded-lg px-3 py-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-700 truncate max-w-[65%]">{c.descripcion}</span>
              <span className={`text-sm font-bold tabular-nums ${c.saldo >= 0 ? 'text-amber-700' : 'text-red-600'}`}>
                {fmt(c.saldo)}
              </span>
            </div>
            <SaldoBar value={Math.max(0, c.saldo)} total={Math.max(total_caja, 1)} color="bg-amber-400" />
          </div>
        ))}

        {bancos.length > 0 && (
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pt-2">Bancos</p>
        )}
        {bancos.map((c) => (
          <div key={c.cuenta} className="bg-sky-50/60 rounded-lg px-3 py-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-slate-700 truncate max-w-[65%]">{c.descripcion}</span>
              <span className={`text-sm font-bold tabular-nums ${c.saldo >= 0 ? 'text-sky-700' : 'text-red-600'}`}>
                {fmt(c.saldo)}
              </span>
            </div>
            <SaldoBar value={Math.max(0, c.saldo)} total={Math.max(total_bancos, 1)} color="bg-sky-400" />
          </div>
        ))}
      </div>
    </div>
  );
}
