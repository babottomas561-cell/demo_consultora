import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Activity, Award, DollarSign, Target, TrendingUp, Users } from 'lucide-react';

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
  { key: 'ranking',    label: 'Ranking' },
  { key: 'evolucion',  label: 'Evolución' },
  { key: 'conversion', label: 'Conversión' },
  { key: 'detalle',    label: 'Detalle' },
];

const V_COLORS = ['#4f46e5', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#eab308', '#ef4444'];
const getColor = (i) => V_COLORS[i % V_COLORS.length];

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

// ── Hook: data fetching ───────────────────────────────────────────────────────

const useVendedoresData = (user, activeCompany, filters, qs) => {
  const [kpis,    setKpis]    = useState(null);
  const [ranking, setRanking] = useState(null);
  const [temporal, setTemporal] = useState(null);
  const [detalle,  setDetalle]  = useState(null);

  const [loadingKpis,    setLoadingKpis]    = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [loadingTemporal, setLoadingTemporal] = useState(false);
  const [loadingDetalle,  setLoadingDetalle]  = useState(false);

  const [error, setError] = useState(null);

  const canFetch = (user?.company_id) || (user?.is_admin && activeCompany);

  const fetchPrimary = useCallback(async () => {
    if (!canFetch) { setLoadingKpis(false); setLoadingRanking(false); return; }
    setLoadingKpis(true); setLoadingRanking(true);
    setError(null);
    try {
      const [kR, rR] = await Promise.all([
        apiClient.get(`/analytics/vendedores/kpis${qs}`),
        apiClient.get(`/analytics/vendedores/ranking${qs}`),
      ]);
      setKpis(kR.data);
      setRanking(rR.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de vendedores.');
    } finally {
      setLoadingKpis(false); setLoadingRanking(false);
    }
  }, [qs, canFetch]);

  const fetchTemporal = useCallback(async () => {
    if (!canFetch || temporal) return;
    setLoadingTemporal(true);
    try {
      const r = await apiClient.get(`/analytics/vendedores/temporal${qs}`);
      setTemporal(r.data);
    } catch (e) { console.error(e); } finally { setLoadingTemporal(false); }
  }, [qs, canFetch, temporal]);

  const fetchDetalle = useCallback(async (codVendedor) => {
    if (!canFetch || !codVendedor) return;
    setDetalle(null);
    setLoadingDetalle(true);
    try {
      const r = await apiClient.get(`/analytics/vendedores/detalle/${codVendedor}${qs}`);
      setDetalle(r.data);
    } catch (e) { console.error(e); } finally { setLoadingDetalle(false); }
  }, [qs, canFetch]);

  // Reset lazy data on filter change
  useEffect(() => {
    setTemporal(null);
    setDetalle(null);
  }, [qs]);

  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);

  return {
    kpis, ranking, temporal, detalle,
    loadingKpis, loadingRanking, loadingTemporal, loadingDetalle,
    error,
    fetchTemporal, fetchDetalle,
    refetch: fetchPrimary,
  };
};

// ── KPI Row ───────────────────────────────────────────────────────────────────

const VendedoresKPIs = ({ kpis, loading }) => {
  const row1 = [
    { label: 'Vendedores activos', kpi: kpis?.total_vendedores, format: 'number', icon: Users },
    { label: 'Facturado neto',     kpi: kpis?.facturado_total,   format: 'currency', icon: DollarSign },
    { label: 'Ticket prom. global', kpi: kpis?.ticket_promedio_global, format: 'currency', icon: Activity },
    { label: 'Margen total',       kpi: kpis?.margen_total,      format: 'currency', icon: TrendingUp },
  ];
  const row2 = [
    {
      label: 'Mejor vendedor',
      kpi: kpis?.mejor_vendedor,
      format: 'text',
      icon: Award,
      severity: 'success',
    },
    {
      label: 'Presupuestos emitidos',
      kpi: kpis?.presupuestos_emitidos,
      format: 'number',
      icon: Target,
    },
    {
      label: 'Tasa conversión',
      kpi: kpis?.tasa_conversion_global,
      format: 'percent',
      severity: kpis?.tasa_conversion_global?.actual < 30 ? 'error'
              : kpis?.tasa_conversion_global?.actual < 50 ? 'warning'
              : 'success',
    },
    {
      label: 'Descuento prom.',
      kpi: kpis?.descuento_prom,
      format: 'percent',
      severity: kpis?.descuento_prom?.actual > 15 ? 'warning' : 'neutral',
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
          kpi={c.kpi}
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

// ── Tab: Ranking ──────────────────────────────────────────────────────────────

const TabRanking = ({ ranking, loading }) => {
  const vendedores = ranking?.vendedores ?? [];

  const chartData = vendedores.map((v) => ({
    name: v.nombre?.split(' ')[0] ?? `V${v.cod_vendedor}`,
    facturado: v.facturado_neto,
    margen: v.margen_dolares,
  }));

  const columns = [
    { key: 'nombre',           label: 'Vendedor' },
    { key: 'facturado_neto',   label: 'Facturado neto',   render: (r) => formatCurrency(r.facturado_neto) },
    { key: 'tickets',          label: 'Tickets',           render: (r) => formatNumber(r.tickets) },
    { key: 'clientes_unicos',  label: 'Clientes únicos',  render: (r) => formatNumber(r.clientes_unicos) },
    { key: 'ticket_promedio',  label: 'Ticket prom.',     render: (r) => formatCurrency(r.ticket_promedio) },
    { key: 'margen_pct',       label: 'Margen %',         render: (r) => `${(r.margen_pct ?? 0).toFixed(1)}%` },
    {
      key: 'pct_cumplimiento',
      label: '% Cuota',
      render: (r) => r.pct_cumplimiento != null
        ? (
          <span className={`font-semibold ${r.pct_cumplimiento >= 100 ? 'text-emerald-600' : r.pct_cumplimiento >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
            {r.pct_cumplimiento.toFixed(1)}%
          </span>
        )
        : <span className="text-slate-400 text-xs">Sin cuota</span>,
    },
    { key: 'tasa_conversion',  label: 'Conv. presup.',    render: (r) => `${(r.tasa_conversion ?? 0).toFixed(1)}%` },
    { key: 'pct_del_total',    label: '% del total',      render: (r) => `${(r.pct_del_total ?? 0).toFixed(1)}%` },
  ];

  if (loading) return <SkeletonChart />;

  return (
    <div className="space-y-6">
      <ChartCard title="Facturado neto por vendedor">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={64} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Bar dataKey="facturado" name="Facturado neto" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={getColor(i)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <DataTable
        title="Comparativa vendedores"
        rows={vendedores}
        columns={columns}
        rowKey="cod_vendedor"
      />
    </div>
  );
};

// ── Tab: Evolución ────────────────────────────────────────────────────────────

const TabEvolucion = ({ temporal, loading, onMount }) => {
  const [metric, setMetric] = useState('facturado');

  useEffect(() => { onMount(); }, []);

  if (loading) return <SkeletonChart />;
  if (!temporal) return null;

  const { vendedores = [], series = [] } = temporal;

  const chartData = series.map((s) => {
    const point = { periodo: fmtPeriod(s.periodo) };
    vendedores.forEach((v) => {
      const cv = String(v.cod_vendedor);
      point[cv] = s[cv]?.[metric] ?? 0;
    });
    return point;
  });

  const metricLabel = metric === 'facturado' ? 'Facturado' : metric === 'tickets' ? 'Tickets' : 'Margen';

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['facturado', 'tickets', 'margen'].map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              metric === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {m === 'facturado' ? 'Facturado' : m === 'tickets' ? 'Tickets' : 'Margen'}
          </button>
        ))}
      </div>

      <ChartCard title={`Evolución mensual — ${metricLabel}`}>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={metric === 'tickets' ? formatNumber : fmtM} tick={{ fontSize: 11 }} width={64} />
            <Tooltip formatter={(v) => metric === 'tickets' ? formatNumber(v) : formatCurrency(v)} />
            <Legend />
            {vendedores.map((v, i) => (
              <Line
                key={v.cod_vendedor}
                type="monotone"
                dataKey={String(v.cod_vendedor)}
                name={v.nombre}
                stroke={getColor(i)}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

// ── Tab: Conversión ───────────────────────────────────────────────────────────

const TabConversion = ({ ranking, temporal, loading, onMount }) => {
  useEffect(() => { onMount(); }, []);

  const vendedores = ranking?.vendedores ?? [];
  const tasaGlobal = vendedores.length > 0
    ? vendedores.reduce((sum, v) => sum + (v.tasa_conversion ?? 0), 0) / vendedores.length
    : 0;

  const chartData = vendedores
    .filter((v) => v.presupuestos_emitidos > 0)
    .map((v) => ({
      name: v.nombre?.split(' ')[0] ?? `V${v.cod_vendedor}`,
      confirmados: v.presupuestos_confirmados,
      perdidos: v.presupuestos_emitidos - v.presupuestos_confirmados,
    }));

  const columns = [
    { key: 'nombre',                    label: 'Vendedor' },
    { key: 'presupuestos_emitidos',     label: 'Emitidos',     render: (r) => formatNumber(r.presupuestos_emitidos) },
    { key: 'presupuestos_confirmados',  label: 'Confirmados',  render: (r) => formatNumber(r.presupuestos_confirmados) },
    {
      key: 'tasa_conversion',
      label: 'Tasa conv.',
      render: (r) => (
        <span className={`font-semibold ${r.tasa_conversion >= 50 ? 'text-emerald-600' : r.tasa_conversion >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
          {(r.tasa_conversion ?? 0).toFixed(1)}%
        </span>
      ),
    },
  ];

  if (loading) return <SkeletonChart />;

  return (
    <div className="space-y-6">
      {tasaGlobal < 50 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ⚠️ La tasa de conversión promedio es <strong>{tasaGlobal.toFixed(1)}%</strong>. Considera revisar el seguimiento de presupuestos.
        </div>
      )}

      {chartData.length > 0 && (
        <ChartCard title="Presupuestos: confirmados vs. perdidos">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="confirmados" name="Confirmados" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="perdidos"    name="No confirmados" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <DataTable
        title="Conversión por vendedor"
        rows={vendedores.filter((v) => v.presupuestos_emitidos > 0)}
        columns={columns}
        rowKey="cod_vendedor"
      />
    </div>
  );
};

// ── Tab: Detalle ──────────────────────────────────────────────────────────────

const TabDetalle = ({ ranking, detalle, loading, onFetch }) => {
  const vendedores = ranking?.vendedores ?? [];
  const [selected, setSelected] = useState('');

  const handleSelect = (e) => {
    const cod = e.target.value;
    setSelected(cod);
    if (cod) onFetch(Number(cod));
  };

  const chartData = (detalle?.evolucion ?? []).map((e) => ({
    periodo: fmtPeriod(e.periodo),
    facturado: e.facturado,
    tickets: e.tickets,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Vendedor:</label>
        <select
          value={selected}
          onChange={handleSelect}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Seleccionar vendedor...</option>
          {vendedores.map((v) => (
            <option key={v.cod_vendedor} value={v.cod_vendedor}>{v.nombre}</option>
          ))}
        </select>
      </div>

      {loading && <SkeletonChart />}

      {!loading && detalle && (
        <div className="space-y-6">
          {/* Vendor header */}
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
              {detalle.vendedor?.nombre?.[0] ?? '?'}
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{detalle.vendedor?.nombre}</p>
              {detalle.vendedor?.cuota_mensual > 0 && (
                <p className="text-sm text-slate-500">Cuota mensual: {formatCurrency(detalle.vendedor.cuota_mensual)}</p>
              )}
            </div>
          </div>

          {/* Evolution chart */}
          {chartData.length > 0 && (
            <ChartCard title="Evolución de facturación">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(v, name) => name === 'facturado' ? formatCurrency(v) : formatNumber(v)} />
                  <Bar dataKey="facturado" name="Facturado" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Top clientes + productos */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <DataTable
              title="Top 10 clientes"
              rows={detalle.top_clientes}
              rowKey="cliente_id"
              columns={[
                { key: 'nombre',    label: 'Cliente' },
                { key: 'facturado', label: 'Facturado', render: (r) => formatCurrency(r.facturado) },
                { key: 'tickets',   label: 'Tickets',   render: (r) => formatNumber(r.tickets) },
              ]}
            />
            <DataTable
              title="Top 10 productos"
              rows={detalle.top_productos}
              rowKey="producto_id"
              columns={[
                { key: 'nombre',    label: 'Producto' },
                { key: 'facturado', label: 'Facturado', render: (r) => formatCurrency(r.facturado) },
                { key: 'unidades',  label: 'Unidades',  render: (r) => formatNumber(r.unidades) },
              ]}
            />
          </div>

          {/* Presupuestos pendientes */}
          {detalle.presupuestos_pendientes?.length > 0 && (
            <DataTable
              title="Presupuestos pendientes"
              rows={detalle.presupuestos_pendientes}
              rowKey="id"
              columns={[
                { key: 'fecha',          label: 'Fecha' },
                { key: 'cliente_nombre', label: 'Cliente' },
                { key: 'total',          label: 'Total', render: (r) => formatCurrency(r.total) },
              ]}
            />
          )}
        </div>
      )}

      {!loading && !detalle && selected && (
        <p className="text-sm text-slate-400">No hay datos para el vendedor seleccionado.</p>
      )}
    </div>
  );
};

// ── Panel inner (with filter store) ──────────────────────────────────────────

const VendedoresPanelInner = () => {
  const user        = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore = useFilterStore();

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
  const activeTab = searchParams.get('tab') ?? 'ranking';
  const setTab = (key) => setSearchParams({ tab: key }, { replace: true });

  const {
    kpis, ranking, temporal, detalle,
    loadingKpis, loadingRanking, loadingTemporal, loadingDetalle,
    error,
    fetchTemporal, fetchDetalle,
    refetch,
  } = useVendedoresData(user, activeCompany, filters, qs);

  const canFetch = (user?.company_id) || (user?.is_admin && activeCompany);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel Vendedores</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ranking, evolución y análisis de conversión por vendedor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SavedViews />
          <ExportButton
            label="Exportar ranking"
            endpoint={`/analytics/vendedores/ranking${qs}`}
            filename="vendedores_ranking"
          />
        </div>
      </div>

      {/* Filters */}
      <FilterBar />

      {/* KPIs */}
      <VendedoresKPIs kpis={kpis} loading={loadingKpis} />

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!canFetch && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Seleccioná una empresa para ver los datos.
        </div>
      )}

      {/* Tabs */}
      <PanelTabs tabs={TABS} activeTab={activeTab} onTabChange={setTab} />

      <div className="mt-4">
        {activeTab === 'ranking' && (
          <TabRanking ranking={ranking} loading={loadingRanking} />
        )}
        {activeTab === 'evolucion' && (
          <TabEvolucion
            temporal={temporal}
            loading={loadingTemporal}
            onMount={fetchTemporal}
          />
        )}
        {activeTab === 'conversion' && (
          <TabConversion
            ranking={ranking}
            temporal={temporal}
            loading={loadingRanking}
            onMount={fetchTemporal}
          />
        )}
        {activeTab === 'detalle' && (
          <TabDetalle
            ranking={ranking}
            detalle={detalle}
            loading={loadingDetalle}
            onFetch={fetchDetalle}
          />
        )}
      </div>
    </div>
  );
};

// ── Root export ───────────────────────────────────────────────────────────────

const VendedoresAnalyticsView = () => (
  <CrossFilterProvider>
    <VendedoresPanelInner />
  </CrossFilterProvider>
);

export default VendedoresAnalyticsView;
