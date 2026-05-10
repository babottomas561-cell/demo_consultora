import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, Archive, Package, TrendingDown, TrendingUp,
} from 'lucide-react';

import apiClient from '../../api/client';
import useAuthStore from '../../store/authStore';
import { useFilterStore } from '../../store/filterStore';
import FilterBar from '../../components/FilterBar';
import { buildQueryParams, formatCurrency, formatNumber } from './analyticsUtils';

import CrossFilterProvider from '../../components/analytics/CrossFilterProvider';
import KPICard from '../../components/analytics/KPICard';
import ChartCard from '../../components/analytics/ChartCard';
import DataTable from '../../components/analytics/DataTable';
import PeriodComparator from '../../components/analytics/PeriodComparator';
import PanelTabs from '../../components/analytics/PanelTabs';
import SavedViews from '../../components/analytics/SavedViews';
import ExportButton from '../../components/analytics/ExportButton';
import { SkeletonKPI, SkeletonChart } from '../../components/analytics/SkeletonLoader';

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const TABS = [
  { key: 'inventario', label: 'Inventario' },
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'rotacion', label: 'Rotación ABC' },
  { key: 'alertas', label: 'Alertas' },
  { key: 'reposicion', label: 'Reposición' },
];

const ESTADO_COLORS = {
  ok: 'text-green-700 bg-green-50',
  bajo: 'text-amber-700 bg-amber-50',
  sin_stock: 'text-red-700 bg-red-50',
  sobrestock: 'text-indigo-700 bg-indigo-50',
  sin_movimiento: 'text-slate-700 bg-slate-100',
};
const ESTADO_LABELS = {
  ok: 'OK',
  bajo: 'Stock bajo',
  sin_stock: 'Sin stock',
  sobrestock: 'Sobrestock',
  sin_movimiento: 'Sin movimiento',
};
const SEV_COLORS = { critical: 'border-l-4 border-red-500 bg-red-50', warning: 'border-l-4 border-amber-500 bg-amber-50', info: 'border-l-4 border-blue-400 bg-blue-50' };
const SEV_ICONS = { critical: '🔴', warning: '🟡', info: '🔵' };
const ABC_COLORS = { A: '#4f46e5', B: '#eab308', C: '#94a3b8' };

// ── Data hook ────────────────────────────────────────────────────────────────

const useStockData = (user, activeCompany, filters, qs) => {
  const [kpis, setKpis] = useState(null);
  const [inventario, setInventario] = useState(null);
  const [movimientos, setMovimientos] = useState(null);
  const [rotacion, setRotacion] = useState(null);
  const [alertas, setAlertas] = useState(null);
  const [reposicion, setReposicion] = useState(null);

  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingInventario, setLoadingInventario] = useState(true);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [loadingRotacion, setLoadingRotacion] = useState(false);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [loadingReposicion, setLoadingReposicion] = useState(false);
  const [error, setError] = useState(null);

  const canFetch = (user?.company_id) || (user?.is_admin && activeCompany);

  const fetchPrimary = useCallback(async () => {
    if (!canFetch) { setLoadingKpis(false); setLoadingInventario(false); return; }
    setLoadingKpis(true); setLoadingInventario(true);
    setError(null);
    try {
      const [kR, iR] = await Promise.all([
        apiClient.get(`/analytics/stock/kpis${qs}`),
        apiClient.get(`/analytics/stock/por-producto${qs}`),
      ]);
      setKpis(kR.data);
      setInventario(iR.data);
    } catch (e) { setError(e.message); }
    setLoadingKpis(false); setLoadingInventario(false);
  }, [qs, canFetch]);

  const fetchMovimientos = useCallback(async () => {
    if (!canFetch || movimientos) return;
    setLoadingMovimientos(true);
    try { const r = await apiClient.get(`/analytics/stock/movimientos${qs}`); setMovimientos(r.data); }
    catch (e) { setError(e.message); }
    setLoadingMovimientos(false);
  }, [qs, canFetch, movimientos]);

  const fetchRotacion = useCallback(async () => {
    if (!canFetch || rotacion) return;
    setLoadingRotacion(true);
    try { const r = await apiClient.get(`/analytics/stock/rotacion${qs}`); setRotacion(r.data); }
    catch (e) { setError(e.message); }
    setLoadingRotacion(false);
  }, [qs, canFetch, rotacion]);

  const fetchAlertas = useCallback(async () => {
    if (!canFetch || alertas) return;
    setLoadingAlertas(true);
    try { const r = await apiClient.get(`/analytics/stock/alertas${qs}`); setAlertas(r.data); }
    catch (e) { setError(e.message); }
    setLoadingAlertas(false);
  }, [qs, canFetch, alertas]);

  const fetchReposicion = useCallback(async () => {
    if (!canFetch || reposicion) return;
    setLoadingReposicion(true);
    try { const r = await apiClient.get(`/analytics/stock/reposicion${qs}`); setReposicion(r.data); }
    catch (e) { setError(e.message); }
    setLoadingReposicion(false);
  }, [qs, canFetch, reposicion]);

  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);
  useEffect(() => {
    setMovimientos(null); setRotacion(null); setAlertas(null); setReposicion(null);
  }, [qs]);

  return {
    kpis, inventario, movimientos, rotacion, alertas, reposicion,
    loadingKpis, loadingInventario, loadingMovimientos, loadingRotacion,
    loadingAlertas, loadingReposicion,
    error, fetchMovimientos, fetchRotacion, fetchAlertas, fetchReposicion,
  };
};

// ── KPIs ─────────────────────────────────────────────────────────────────────

const StockKPIs = ({ kpis, loading }) => {
  if (loading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array(7).fill(0).map((_, i) => <SkeletonKPI key={i} />)}</div>;
  if (!kpis) return null;
  const k = kpis;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KPICard label="Total artículos" value={k.total_articulos?.actual ?? 0} icon={Package} color="slate" />
      <KPICard label="Con stock" value={k.con_stock?.actual ?? 0} icon={TrendingUp} color="green" />
      <KPICard label="Sin stock" value={k.sin_stock?.actual ?? 0} icon={TrendingDown} color={k.sin_stock?.actual > 0 ? 'red' : 'green'} badge={k.sin_stock?.actual > 0 ? 'ALERTA' : null} />
      <KPICard label="Stock bajo" value={k.stock_bajo?.actual ?? 0} icon={AlertTriangle} color={k.stock_bajo?.actual > 0 ? 'amber' : 'green'} />
      <KPICard label="Valor inventario" value={formatCurrency(k.valor_inventario_costo?.actual)} icon={Archive} color="indigo" />
      <KPICard label="Días inventario prom." value={`${k.dias_inventario_promedio?.actual ?? 0}d`} icon={Package} color="slate" />
      <KPICard label="Sin movimiento 90d" value={k.articulos_sin_movimiento?.actual ?? 0} icon={AlertTriangle} color={k.articulos_sin_movimiento?.actual > 0 ? 'orange' : 'green'} />
    </div>
  );
};

// ── Inventario Tab ────────────────────────────────────────────────────────────

const InventarioTab = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  if (!data) return null;

  const productos = data.productos ?? [];
  const porDeposito = data.por_deposito ?? [];

  const cols = [
    { key: 'nombre', label: 'Artículo' },
    { key: 'deposito_nombre', label: 'Depósito' },
    { key: 'cantidad', label: 'Stock', align: 'right', render: (r) => formatNumber(r.cantidad) },
    { key: 'stock_minimo', label: 'Mín', align: 'right', render: (r) => formatNumber(r.stock_minimo) },
    { key: 'valor_stock', label: 'Valor', align: 'right', render: (r) => formatCurrency(r.valor_stock) },
    { key: 'unidades_vendidas_periodo', label: 'Vendido', align: 'right', render: (r) => formatNumber(r.unidades_vendidas_periodo) },
    { key: 'venta_diaria_promedio', label: 'Vta/día', align: 'right', render: (r) => r.venta_diaria_promedio.toFixed(1) },
    { key: 'dias_inventario', label: 'Días inv.', align: 'right', render: (r) => (
      <span className={r.dias_inventario > 180 ? 'text-indigo-600 font-bold' : r.dias_inventario < 30 ? 'text-red-600 font-bold' : ''}>
        {r.dias_inventario >= 999 ? '∞' : r.dias_inventario}
      </span>
    )},
    { key: 'estado', label: 'Estado', render: (r) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${ESTADO_COLORS[r.estado] ?? 'text-slate-600 bg-slate-100'}`}>
        {ESTADO_LABELS[r.estado] ?? r.estado}
      </span>
    )},
  ];

  return (
    <div className="space-y-4">
      {porDeposito.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {porDeposito.map((d) => (
            <div key={d.cod_deposito} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-500">{d.nombre}</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(d.valor_total)}</p>
              <p className="text-xs text-slate-400">{formatNumber(d.total_articulos)} artículos</p>
            </div>
          ))}
        </div>
      )}
      <DataTable
        title="Stock por artículo"
        columns={cols}
        rows={productos}
        rowClassName={(r) => {
          if (r.estado === 'sin_stock') return 'bg-red-50';
          if (r.estado === 'bajo') return 'bg-amber-50';
          return '';
        }}
      />
    </div>
  );
};

// ── Movimientos Tab ───────────────────────────────────────────────────────────

const MovimientosTab = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  if (!data) return null;

  const series = data.series ?? [];
  const porArticulo = data.por_articulo ?? [];

  const artCols = [
    { key: 'nombre', label: 'Artículo' },
    { key: 'entradas', label: 'Entradas', align: 'right', render: (r) => formatNumber(r.entradas) },
    { key: 'salidas', label: 'Salidas', align: 'right', render: (r) => formatNumber(r.salidas) },
    { key: 'stock_actual', label: 'Stock actual', align: 'right', render: (r) => formatNumber(r.stock_actual) },
  ];

  return (
    <div className="space-y-4">
      <ChartCard title="Entradas y salidas por período" subtitle="Compras vs ventas en unidades">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={series} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => formatNumber(v)} />
            <Legend />
            <Bar dataKey="entradas" name="Entradas" fill="#16a34a" radius={[3, 3, 0, 0]} />
            <Bar dataKey="salidas" name="Salidas" fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Line dataKey="saldo_periodo" name="Saldo" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
      <DataTable title="Movimientos por artículo" columns={artCols} rows={porArticulo} />
    </div>
  );
};

// ── Rotación ABC Tab ──────────────────────────────────────────────────────────

const RotacionTab = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  if (!data) return null;

  const ranking = data.ranking ?? [];
  const abc = data.abc ?? {};

  const cols = [
    { key: 'nombre', label: 'Artículo' },
    { key: 'clasificacion', label: 'ABC', render: (r) => (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
        style={{ backgroundColor: ABC_COLORS[r.clasificacion] ?? '#94a3b8' }}>
        {r.clasificacion}
      </span>
    )},
    { key: 'stock_actual', label: 'Stock', align: 'right', render: (r) => formatNumber(r.stock_actual) },
    { key: 'unidades_vendidas', label: 'Vendido', align: 'right', render: (r) => formatNumber(r.unidades_vendidas) },
    { key: 'venta_diaria', label: 'Vta/día', align: 'right', render: (r) => r.venta_diaria.toFixed(1) },
    { key: 'dias_inventario', label: 'Días inv.', align: 'right', render: (r) => (
      <span className={r.dias_inventario > 180 ? 'text-indigo-600 font-bold' : ''}>{r.dias_inventario >= 999 ? '∞' : r.dias_inventario}</span>
    )},
    { key: 'valor_stock', label: 'Valor', align: 'right', render: (r) => formatCurrency(r.valor_stock) },
    { key: 'pct_valor_total', label: '% Valor', align: 'right', render: (r) => `${r.pct_valor_total}%` },
  ];

  const abcChartData = Object.entries(abc).map(([cls, v]) => ({
    name: `Clase ${cls}`,
    articulos: v.articulos,
    valor: v.valor,
    pct: v.pct_valor,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(abc).map(([cls, v]) => (
          <div key={cls} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold mb-2"
              style={{ backgroundColor: ABC_COLORS[cls] }}>
              {cls}
            </span>
            <p className="text-xs text-slate-500">{v.articulos} artículos · {v.pct_valor}% del valor</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(v.valor)}</p>
          </div>
        ))}
      </div>

      <ChartCard title="Valor de inventario por clase ABC">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={abcChartData} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, n) => n === 'valor' ? [formatCurrency(v), 'Valor'] : [v, n]} />
            <Bar dataKey="valor" name="Valor" radius={[4, 4, 0, 0]}>
              {abcChartData.map((d, i) => (
                <Cell key={i} fill={ABC_COLORS[d.name.slice(-1)] ?? '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <DataTable title="Ranking de rotación por artículo" columns={cols} rows={ranking} />
    </div>
  );
};

// ── Alertas Tab ───────────────────────────────────────────────────────────────

const AlertasTab = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  if (!data) return null;

  const alertas = data.alertas ?? [];
  const resumen = data.resumen ?? {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'critical', label: 'Críticas', color: 'red' },
          { key: 'warning', label: 'Advertencias', color: 'amber' },
          { key: 'info', label: 'Informativas', color: 'blue' },
        ].map(({ key, label, color }) => (
          <div key={key} className={`rounded-xl border border-${color}-200 bg-${color}-50 p-4 text-center`}>
            <p className={`text-2xl font-bold text-${color}-700`}>{resumen[key] ?? 0}</p>
            <p className={`text-xs text-${color}-600`}>{label}</p>
          </div>
        ))}
      </div>

      {alertas.length === 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center text-green-800 font-medium">
          ✅ Sin alertas activas para el período seleccionado
        </div>
      ) : (
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <div key={i} className={`rounded-lg p-4 ${SEV_COLORS[a.severidad] ?? 'bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {SEV_ICONS[a.severidad]} {a.nombre}
                    <span className="ml-2 text-xs text-slate-500 font-normal">#{a.cod_articulo}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{a.detalle}</p>
                  <p className="text-xs text-indigo-600 mt-1 font-medium">→ {a.accion_sugerida}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-500">Stock: {formatNumber(a.stock_actual)}</p>
                  <p className="text-xs text-slate-500">Mín: {formatNumber(a.stock_minimo)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Reposición Tab ────────────────────────────────────────────────────────────

const ReposicionTab = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  if (!data) return null;

  const sugerencias = data.sugerencias ?? [];
  const costoTotal = sugerencias.reduce((s, r) => s + r.costo_estimado, 0);

  const cols = [
    { key: 'nombre', label: 'Artículo' },
    { key: 'stock_actual', label: 'Stock actual', align: 'right', render: (r) => formatNumber(r.stock_actual) },
    { key: 'venta_diaria', label: 'Vta/día', align: 'right', render: (r) => r.venta_diaria.toFixed(1) },
    { key: 'dias_cobertura', label: 'Días cobertura', align: 'right', render: (r) => (
      <span className={r.dias_cobertura < 15 ? 'text-red-600 font-bold' : r.dias_cobertura < 30 ? 'text-amber-600' : ''}>
        {r.dias_cobertura >= 999 ? '∞' : r.dias_cobertura}
      </span>
    )},
    { key: 'cantidad_sugerida', label: 'Sugerido reponer', align: 'right', render: (r) => (
      <span className="font-semibold text-indigo-700">{formatNumber(r.cantidad_sugerida)}</span>
    )},
    { key: 'costo_estimado', label: 'Costo estimado', align: 'right', render: (r) => formatCurrency(r.costo_estimado) },
    { key: 'ultimo_proveedor', label: 'Último proveedor' },
  ];

  return (
    <div className="space-y-4">
      {sugerencias.length > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-indigo-800 font-medium">
            {sugerencias.length} artículo{sugerencias.length > 1 ? 's' : ''} requieren reposición
          </p>
          <p className="text-sm font-bold text-indigo-700">
            Inversión estimada: {formatCurrency(costoTotal)}
          </p>
        </div>
      )}
      {sugerencias.length === 0 ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center text-green-800 font-medium">
          ✅ No hay artículos que requieran reposición urgente
        </div>
      ) : (
        <DataTable title="Sugerencias de reposición" columns={cols} rows={sugerencias} />
      )}
    </div>
  );
};

// ── Main Panel ───────────────────────────────────────────────────────────────

const StockPanelInner = () => {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore = useFilterStore();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'inventario';

  const filters = useMemo(() => filterStore.getApiFilters(), [
    filterStore.periodo, filterStore.desde, filterStore.hasta,
    filterStore.comparar_anterior, filterStore.cod_empresa, filterStore.tag,
    filterStore.punto_de_venta, filterStore.cod_vendedor, filterStore.cod_rubro,
    filterStore.cod_subrubro, filterStore.tipo_comprobante, filterStore.condicion_venta,
    filterStore.cod_cliente, filterStore.cod_articulo, filterStore.cod_deposito,
    filterStore.incluir_anuladas,
  ]);

  const qs = buildQueryParams(user, activeCompany, filters);

  const d = useStockData(user, activeCompany, filters, qs);

  useEffect(() => {
    if (activeTab === 'movimientos') d.fetchMovimientos();
    if (activeTab === 'rotacion') d.fetchRotacion();
    if (activeTab === 'alertas') d.fetchAlertas();
    if (activeTab === 'reposicion') d.fetchReposicion();
  }, [activeTab, d.fetchMovimientos, d.fetchRotacion, d.fetchAlertas, d.fetchReposicion]);

  if (user?.is_admin && !activeCompany) {
    return (
      <div className="py-20 text-center">
        <Package className="mx-auto text-slate-400" size={40} />
        <h2 className="mt-4 text-xl font-bold text-slate-900">Seleccioná una empresa</h2>
        <p className="mt-2 text-slate-500">Los paneles analíticos leen datos del schema tenant activo.</p>
      </div>
    );
  }

  const tabContent = {
    inventario: <InventarioTab data={d.inventario} loading={d.loadingInventario} />,
    movimientos: <MovimientosTab data={d.movimientos} loading={d.loadingMovimientos} />,
    rotacion: <RotacionTab data={d.rotacion} loading={d.loadingRotacion} />,
    alertas: <AlertasTab data={d.alertas} loading={d.loadingAlertas} />,
    reposicion: <ReposicionTab data={d.reposicion} loading={d.loadingReposicion} />,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Panel Stock</h1>
          <p className="text-sm text-slate-500">Inventario real, rotación ABC, alertas y sugerencias de reposición.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SavedViews panel="stock" />
          <ExportButton
            apiEndpoint={`/analytics/stock/por-producto${qs}`}
            filename="stock"
            formats={['csv']}
          />
        </div>
      </div>
      <FilterBar />
      <PeriodComparator />
      <StockKPIs kpis={d.kpis} loading={d.loadingKpis} />
      <PanelTabs tabs={TABS} paramKey="tab" variant="underline" />
      {tabContent[activeTab]}
    </div>
  );
};

const StockAnalyticsView = () => (
  <CrossFilterProvider>
    <StockPanelInner />
  </CrossFilterProvider>
);

export default StockAnalyticsView;
