import { useState, useEffect, useMemo } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { Settings } from 'lucide-react';
import { useVentasData } from '../VentasDataContext';
import { formatCurrencyShort } from '../../analyticsUtils';

const STORAGE_KEY = 'ventas_goal_config';

function loadGoal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'); } catch { return null; }
}
function saveGoal(g) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); } catch {}
}

function parseGoalInput(raw) {
  const s = String(raw ?? '').trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export default function GoalTrackerWidget() {
  const { kpis, diaSemana, fetchDiaSemana, loadingKpis } = useVentasData();
  const [showConfig, setShowConfig] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [labelInput, setLabelInput] = useState('Meta mensual');
  const [goal, setGoal] = useState(() => loadGoal());

  // Pre-fetch día-semana para usar en proyección estacional
  useEffect(() => { fetchDiaSemana?.(); }, [fetchDiaSemana]);

  const facturado = Number(kpis?.facturado_neto?.actual ?? kpis?.facturado_neto ?? 0);
  const meta = goal?.value ?? 0;
  const pct = meta > 0 ? Math.min((facturado / meta) * 100, 150) : 0;
  const display_pct = meta > 0 ? Math.min((facturado / meta) * 100, 100) : 0;

  const color = display_pct >= 100 ? '#22c55e' : display_pct >= 75 ? '#4f46e5' : display_pct >= 50 ? '#f59e0b' : '#ef4444';

  // Proyección estacional: pondera por % histórico de cada día de la semana
  const proyeccion = useMemo(() => {
    if (!meta || !facturado) return null;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayOfMonth = today.getDate();

    // Si no hay datos de día-semana, fallback a lineal
    const porDia = diaSemana?.por_dia ?? [];
    const weights = porDia.length === 7 && porDia.some(d => Number(d.pct_total ?? 0) > 0);

    if (!weights) {
      const dailyRate = facturado / dayOfMonth;
      return { value: dailyRate * daysInMonth, method: 'lineal' };
    }

    // Calcular peso del período transcurrido vs. el total del mes
    // ISODOW: 1 = Lunes, 7 = Domingo
    const pctByDow = {};
    porDia.forEach(d => { pctByDow[d.dow] = Number(d.pct_total ?? 0); });

    let weightTranscurrido = 0;
    let weightTotal = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isodow = ((date.getDay() + 6) % 7) + 1; // JS getDay: 0=Dom, ajustar a ISODOW
      const w = pctByDow[isodow] ?? (100 / 7);
      weightTotal += w;
      if (day <= dayOfMonth) weightTranscurrido += w;
    }

    if (weightTranscurrido <= 0) return null;
    return { value: facturado / weightTranscurrido * weightTotal, method: 'estacional' };
  }, [meta, facturado, diaSemana]);

  const handleSave = () => {
    const v = parseGoalInput(goalInput);
    if (v > 0) {
      const g = { value: v, label: labelInput || 'Meta mensual' };
      setGoal(g);
      saveGoal(g);
    }
    setShowConfig(false);
  };

  useEffect(() => {
    if (goal) {
      setGoalInput(String(goal.value));
      setLabelInput(goal.label ?? 'Meta mensual');
    }
  }, []);

  if (loadingKpis) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse rounded-full bg-slate-200 w-28 h-28" />
      </div>
    );
  }

  if (!goal && !showConfig) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-4 text-center">
        <p className="text-sm font-medium text-slate-600">Configurá tu meta de ventas</p>
        <p className="text-xs text-slate-400">Vas a ver el progreso del período actual en tiempo real.</p>
        <button onClick={() => setShowConfig(true)}
          className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors">
          Definir meta
        </button>
      </div>
    );
  }

  if (showConfig) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-5">
        <p className="text-sm font-semibold text-slate-700">Configurar meta</p>
        <input
          type="text" value={labelInput} onChange={e => setLabelInput(e.target.value)}
          placeholder="Nombre (ej: Meta mensual)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <input
          type="text" value={goalInput} onChange={e => setGoalInput(e.target.value)}
          placeholder="Importe objetivo (ej: 5000000)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="flex gap-2 w-full">
          <button onClick={() => setShowConfig(false)}
            className="flex-1 rounded-xl border border-slate-200 text-slate-600 px-4 py-2 text-sm hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave}
            className="flex-1 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors">
            Guardar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-3 py-2 gap-1">
      <div className="flex items-center justify-between w-full shrink-0 mb-1">
        <p className="text-xs font-semibold text-slate-600">{goal?.label ?? 'Meta'}</p>
        <button onClick={() => setShowConfig(true)} className="rounded-lg p-1 hover:bg-slate-100">
          <Settings size={13} className="text-slate-400" />
        </button>
      </div>

      <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%" outerRadius="100%"
            startAngle={210} endAngle={-30}
            data={[{ value: display_pct, fill: color }]}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f1f5f9' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold tabular-nums" style={{ color }}>{Math.round(display_pct)}%</p>
          <p className="text-[10px] text-slate-400">completado</p>
        </div>
      </div>

      <div className="w-full space-y-1 shrink-0">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Actual</span>
          <span className="font-semibold text-slate-800 tabular-nums">{formatCurrencyShort(facturado)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Meta</span>
          <span className="font-semibold text-slate-500 tabular-nums">{formatCurrencyShort(meta)}</span>
        </div>
        {proyeccion && (
          <div className="flex justify-between text-xs border-t border-slate-100 pt-1">
            <span className="text-slate-400" title={proyeccion.method === 'estacional' ? 'Ajustada por día de semana histórico' : 'Proyección lineal'}>
              Proyección {proyeccion.method === 'estacional' ? '★' : ''}
            </span>
            <span className={`font-semibold tabular-nums ${proyeccion.value >= meta ? 'text-emerald-600' : 'text-amber-600'}`}>
              {formatCurrencyShort(proyeccion.value)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
