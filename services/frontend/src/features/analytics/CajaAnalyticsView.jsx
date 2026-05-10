import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { ArrowDownCircle, ArrowUpCircle, DollarSign, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';

import apiClient from '../../api/client';
import useAuthStore from '../../store/authStore';
import { useFilterStore } from '../../store/filterStore';
import FilterBar from '../../components/FilterBar';
import { buildQueryParams, formatCurrency, formatNumber } from './analyticsUtils';

import CrossFilterProvider from '../../components/analytics/CrossFilterProvider';
import KPICard from '../../components/analytics/KPICard';
import ChartCard from '../../components/analytics/ChartCard';
import DataTable from '../../components/analytics/DataTable';
import PanelTabs from '../../components/analytics/PanelTabs';
import SavedViews from '../../components/analytics/SavedViews';
import ExportButton from '../../components/analytics/ExportButton';
import { SkeletonKPI, SkeletonChart } from '../../components/analytics/SkeletonLoader';

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'flujo',       label: 'Flujo' },
  { key: 'por_tipo',    label: 'Por tipo' },
  { key: 'movimientos', label: 'Movimientos' },
];

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const fmtPeriod = (v) => {
  if (!v) return '';
  const raw = String(v);
  const date = raw.length === 7 ? new Date(`${raw}-01T00:00:00`) : new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return `${MONTHS[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
};

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const TIPO_COLORS = [
  '#4f46e5', '#10b981', '#f97316', '#ec4899', '#8b5cf6',
  '#06b6d4', '#eab308', '#ef4444', '#14b8a6', '#a855f7',
];

// ── Hook: data fetching ───────────────────────────────────────────────────────

const useCajaData = (user, activeCompany, filters, qs) => {
  const [kpis,    setKpis]    = useState(null);
  const [flujo,   setFlujo]   = useState(null);
  const [porTipo, setPorTipo] = useState(null);
  const [movimientos,    setMovimientos]    = useState(null);

  const [loadingKpis,    setLoadingKpis]    = useState(true);
  const [loadingFlujo,   setLoadingFlujo]   = useState(true);
  const [loadingPorTipo, setLoadingPorTipo] = useState(false);
  const [loadingMovs,    setLoadingMovs]    = useState(false);

  const [movsPage, setMovsPage] = useState(1);
  const [error, setError] = useState(null);

  const canFetch = (user?.company_id) || (user?.is_admin && activeCompany);

  const fetchPrimary = useCallback(async () => {
    if (!canFetch) { setLoadingKpis(false); setLoadingFlujo(false); return; }
    setLoadingKpis(true); setLoadingFlujo(true);
    setError(null);
    try {
      const [kR, fR] = await Promise.all([
        apiClient.get(`/analytics/caja/kpis${qs}`),
        apiClient.get(`/analytics/caja/flujo${qs}`),
      ]);
      setKpis(kR.data);
      setFlujo(fR.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de caja.');
    } finally {
      setLoadingKpis(false); setLoadingFlujo(false);
    }
  }, [qs, canFetch]);

  const fetchPorTipo = useCallback(async () => {
    if (!canFetch || porTipo) return;
    setLoadingPorTipo(true);
    try {
      const r = await apiClient.get(`/analytics/caja/por-tipo${qs}`);
      setPorTipo(r.data);
    } catch (e) { console.error(e); } finally { setLoadingPorTipo(false); }
  }, [qs, canFetch, porTipo]);

  const fetchMovimientos = useCallback(async (page = 1) => {
    if (!canFetch) return;
    setLoadingMovs(true);
    try {
      const r = await apiClient.get(`/analytics/caja/movimientos${qs}&page=${page}&limit=50`);
      setMovimientos(r.data);
      setMovsPage(page);
    } catch (e) { console.error(e); } finally { setLoadingMovs(false); }
  }, [qs, canFetch]);

  useEffect(() => {
    setPorTipo(null);
    setMovimientos(null);
    setMovsPage(1);
  }, [qs]);

  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);

  return {
    kpis, flujo, porTipo, movimientos, movsPage,
    loadingKpis, loadingFlujo, loadingPorTipo, loadingMovs,
    error,
    fetchPorTipo, fetchMovimientos,
    refetch: fetchPrimary,
  };
};

// ── KPI Row ───────────────────────────────────────────────────────────────────

const CajaKPIs = ({ kpis, loading }) => {
  const flujoNeto = kpis?.flujo_neto?.actual ?? 0;
  const row1 = [
    { label: 'Ingresos totales',  kpi: kpis?.ingresos,   format: 'currency', icon: ArrowUpCircle,   severity: 'success' },
    { label: 'Egresos totales',   kpi: kpis?.egresos,    format: 'currency', icon: ArrowDownCircle, severity: 'error' },
    {
      label: 'Flujo neto',
      kpi: kpis?.flujo_neto,
      format: 'currency',
      icon: flujoNeto >= 0 ? TrendingUp : TrendingDown,
      severity: flujoNeto >= 0 ? 'success' : 'danger',
    },
    { label: 'Movimientos',       kpi: kpis?.movimientos, format: 'number',  icon: RefreshCw },
  ];
  const row2 = [
    {
      label: 'Saldo actual',
      kpi: kpis?.saldo_actual,
      format: 'currency',
      icon: DollarSign,
      severity: (kpis?.saldo_actual?.actual ?? 0) >= 0 ? 'success' : 'danger',
    },
    { label: 'Mayor ingreso',  kpi: kpis?.mayor_ingreso,    format: 'currency', severity: 'success' },
    { label: 'Mayor egreso',   kpi: kpis?.mayor_egreso,     format: 'currency', severity: 'error' },
    {
      label: 'Ratio cobro/pago',
      kpi: kpis?.ratio_cobro_pago,
      format: 'number',
      severity: (kpis?.ratio_cobro_pago?.actual ?? 0) >= 1 ? 'success' : 'warning',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonKPI key={i} />)}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonKPI key={i} />)}
        </div>
      </div>
    );
  }

  const renderRow = (cards) => (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => (
        <KPICard
          key={c.label}
          label={c.label}
          value={c.kpi?.actual}
          format={c.format}
          icon={c.icon}
          severity={c.severity ?? 'neutral'}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {renderRow(row1)}
      {renderRow(row2)}
    </div>
  );
};

// ── Tab: Flujo ────────────────────────────────────────────────────────────────

const TabFlujo = ({ flujo, loading }) => {
  if (loading) return <SkeletonChart />;
  if (!flujo) return null;

  const chartData = (flujo.series ?? []).map((s) => ({
    periodo: fmtPeriod(s.periodo),
    ingresos: s.ingresos,
    egresos: -s.egresos,       // negative for visual below zero
    flujo_neto: s.flujo_neto,
    saldo_acumulado: s.saldo_acumulado,
  }));

  const areaData = (flujo.series ?? []).map((s) => ({
    periodo: fmtPeriod(s.periodo),
    saldo_acumulado: s.saldo_acumulado,
  }));

  return (
    <div className="space-y-6">
      {/* Ingresos / Egresos ComposedChart */}
      <ChartCard title="Ingresos vs. Egresos mensuales">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={64} />
            <Tooltip formatter={(v, name) => [formatCurrency(Math.abs(v)), name === 'egresos' ? 'Egresos' : name === 'ingresos' ? 'Ingresos' : 'Flujo neto']} />
            <Legend />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
            <Bar dataKey="ingresos" name="Ingresos"   fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="egresos"  name="Egresos"    fill="#ef4444" radius={[0, 0, 4, 4]} />
            <Line type="monotone" dataKey="flujo_neto" name="Flujo neto" stroke="#4f46e5" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Saldo acumulado area chart */}
      <ChartCard title="Saldo acumulado">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={areaData} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
            <defs>
              <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={64} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="saldo_acumulado"
              name="Saldo acumulado"
              stroke="#4f46e5"
              strokeWidth={2}
              fill="url(#saldoGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

// ── Tab: Por tipo ─────────────────────────────────────────────────────────────

const TabPorTipo = ({ porTipo, loading, onMount }) => {
  useEffect(() => { onMount(); }, []);

  if (loading) return <SkeletonChart />;
  if (!porTipo) return null;

  const tipos = porTipo.por_tipo ?? [];

  const pieIngData = tipos
    .filter((t) => t.ingresos > 0)
    .map((t, i) => ({ name: t.tipo, value: t.ingresos, fill: TIPO_COLORS[i % TIPO_COLORS.length] }));

  const pieEgrData = tipos
    .filter((t) => t.egresos > 0)
    .map((t, i) => ({ name: t.tipo, value: t.egresos, fill: TIPO_COLORS[i % TIPO_COLORS.length] }));

  const columns = [
    { key: 'tipo',        label: 'Tipo' },
    { key: 'ingresos',    label: 'Ingresos',    render: (r) => <span className="text-emerald-600 font-medium">{formatCurrency(r.ingresos)}</span> },
    { key: 'egresos',     label: 'Egresos',     render: (r) => <span className="text-red-500 font-medium">{formatCurrency(r.egresos)}</span> },
    {
      key: 'neto',
      label: 'Neto',
      render: (r) => (
        <span className={`font-semibold ${r.neto >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(r.neto)}
        </span>
      ),
    },
    { key: 'movimientos', label: 'Movimientos', render: (r) => formatNumber(r.movimientos) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {pieIngData.length > 0 && (
          <ChartCard title="Ingresos por tipo">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieIngData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                  {pieIngData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
        {pieEgrData.length > 0 && (
          <ChartCard title="Egresos por tipo">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieEgrData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                  {pieEgrData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      <DataTable title="Detalle por tipo de movimiento" rows={tipos} columns={columns} rowKey="tipo" />
    </div>
  );
};

// ── Tab: Movimientos ──────────────────────────────────────────────────────────

const TabMovimientos = ({ movimientos, loading, movsPage, onFetch }) => {
  useEffect(() => { onFetch(1); }, []);

  const total = movimientos?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  const columns = [
    { key: 'fecha',           label: 'Fecha',        render: (r) => r.fecha?.slice(0, 10) ?? '-' },
    { key: 'tipo',            label: 'Tipo' },
    { key: 'descripcion',     label: 'Descripción' },
    {
      key: 'importe',
      label: 'Importe',
      render: (r) => (
        <span className={`font-semibold ${r.importe >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {formatCurrency(r.importe)}
        </span>
      ),
    },
    {
      key: 'saldo_acumulado',
      label: 'Saldo',
      render: (r) => r.saldo_acumulado != null ? (
        <span className={r.saldo_acumulado >= 0 ? 'text-slate-700' : 'text-red-600'}>
          {formatCurrency(r.saldo_acumulado)}
        </span>
      ) : '-',
    },
  ];

  return (
    <div className="space-y-4">
      {loading && <SkeletonChart />}

      {!loading && movimientos && (
        <>
          <DataTable
            title={`Movimientos de caja (${formatNumber(total)} total)`}
            rows={movimientos.movimientos ?? []}
            columns={columns}
            rowKey="fecha"
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={movsPage <= 1}
                onClick={() => onFetch(movsPage - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50"
              >
                ← Anterior
              </button>
              <span className="text-sm text-slate-600">
                Página {movsPage} de {totalPages}
              </span>
              <button
                disabled={movsPage >= totalPages}
                onClick={() => onFetch(movsPage + 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Panel inner ───────────────────────────────────────────────────────────────

const CajaPanelInner = () => {
  const user          = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore   = useFilterStore();

  const filters = useMemo(() => filterStore.getApiFilters(), [
    filterStore.periodo,
    filterStore.desde,
    filterStore.hasta,
    filterStore.comparar_anterior,
    filterStore.cod_empresa,
    filterStore.tag,
    filterStore.punto_de_venta,
    filterStore.cod_vendedor,
    filterStore.cod_rubro,
    filterStore.cod_subrubro,
    filterStore.tipo_comprobante,
    filterStore.condicion_venta,
    filterStore.cod_cliente,
    filterStore.cod_articulo,
    filterStore.cod_deposito,
    filterStore.incluir_anuladas,
  ]);

  const qs = buildQueryParams(user, activeCompany, filters);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'flujo';
  const setTab = (key) => setSearchParams({ tab: key }, { replace: true });

  const {
    kpis, flujo, porTipo, movimientos, movsPage,
    loadingKpis, loadingFlujo, loadingPorTipo, loadingMovs,
    error,
    fetchPorTipo, fetchMovimientos,
    refetch,
  } = useCajaData(user, activeCompany, filters, qs);

  const canFetch = (user?.company_id) || (user?.is_admin && activeCompany);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel Flujo de Caja</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ingresos, egresos, saldo acumulado y análisis por tipo de movimiento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SavedViews />
          <ExportButton
            label="Exportar movimientos"
            endpoint={`/analytics/caja/movimientos${qs}&limit=10000`}
            filename="caja_movimientos"
          />
        </div>
      </div>

      <FilterBar />

      <CajaKPIs kpis={kpis} loading={loadingKpis} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {!canFetch && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Seleccioná una empresa para ver los datos.
        </div>
      )}

      <PanelTabs tabs={TABS} activeTab={activeTab} onTabChange={setTab} />

      <div className="mt-4">
        {activeTab === 'flujo' && (
          <TabFlujo flujo={flujo} loading={loadingFlujo} />
        )}
        {activeTab === 'por_tipo' && (
          <TabPorTipo porTipo={porTipo} loading={loadingPorTipo} onMount={fetchPorTipo} />
        )}
        {activeTab === 'movimientos' && (
          <TabMovimientos
            movimientos={movimientos}
            loading={loadingMovs}
            movsPage={movsPage}
            onFetch={fetchMovimientos}
          />
        )}
      </div>
    </div>
  );
};

// ── Root export ───────────────────────────────────────────────────────────────

const CajaAnalyticsView = () => (
  <CrossFilterProvider>
    <CajaPanelInner />
  </CrossFilterProvider>
);

export default CajaAnalyticsView;
