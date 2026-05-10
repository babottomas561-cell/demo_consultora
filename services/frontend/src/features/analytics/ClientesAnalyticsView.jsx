import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Activity, Award, DollarSign, TrendingUp, UserCheck, Users } from 'lucide-react';

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
  { key: 'ranking',      label: 'Ranking' },
  { key: 'segmentacion', label: 'Segmentación' },
  { key: 'temporal',     label: 'Temporal' },
  { key: 'detalle',      label: 'Detalle' },
];

const SEGMENTO_COLORS = { A: '#4f46e5', B: '#eab308', C: '#94a3b8' };
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

const useClientesData = (user, activeCompany, filters, qs) => {
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
        apiClient.get(`/analytics/clientes/kpis${qs}`),
        apiClient.get(`/analytics/clientes/ranking${qs}`),
      ]);
      setKpis(kR.data);
      setRanking(rR.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de clientes.');
    } finally {
      setLoadingKpis(false); setLoadingRanking(false);
    }
  }, [qs, canFetch]);

  const fetchTemporal = useCallback(async () => {
    if (!canFetch || temporal) return;
    setLoadingTemporal(true);
    try {
      const r = await apiClient.get(`/analytics/clientes/temporal${qs}`);
      setTemporal(r.data);
    } catch (e) { console.error(e); } finally { setLoadingTemporal(false); }
  }, [qs, canFetch, temporal]);

  const fetchDetalle = useCallback(async (clienteId) => {
    if (!canFetch || !clienteId) return;
    setDetalle(null);
    setLoadingDetalle(true);
    try {
      const r = await apiClient.get(`/analytics/clientes/detalle/${clienteId}${qs}`);
      setDetalle(r.data);
    } catch (e) { console.error(e); } finally { setLoadingDetalle(false); }
  }, [qs, canFetch]);

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

const ClientesKPIs = ({ kpis, loading }) => {
  const row1 = [
    { label: 'Clientes activos',   kpi: kpis?.clientes_activos,  format: 'number',   icon: Users },
    { label: 'Facturado neto',     kpi: kpis?.facturado_total,   format: 'currency', icon: DollarSign },
    { label: 'Ticket promedio',    kpi: kpis?.ticket_promedio,   format: 'currency', icon: Activity },
    { label: 'Clientes nuevos',    kpi: kpis?.clientes_nuevos,   format: 'number',   icon: UserCheck, severity: 'success' },
  ];
  const row2 = [
    { label: 'Mejor cliente',      kpi: kpis?.mejor_cliente,     format: 'text',     icon: Award,      severity: 'success' },
    {
      label: 'Saldo Cta Cte',
      kpi: kpis?.saldo_cta_cte,
      format: 'currency',
      icon: TrendingUp,
      severity: (kpis?.saldo_cta_cte?.actual ?? 0) > 0 ? 'warning' : 'neutral',
    },
    {
      label: 'Deuda vencida',
      kpi: kpis?.deuda_vencida,
      format: 'currency',
      severity: (kpis?.deuda_vencida?.actual ?? 0) > 0 ? 'error' : 'success',
    },
    {
      label: 'Tasa retención',
      kpi: kpis?.tasa_retencion,
      format: 'percent',
      severity: (kpis?.tasa_retencion?.actual ?? 0) >= 60 ? 'success'
              : (kpis?.tasa_retencion?.actual ?? 0) >= 40 ? 'warning'
              : 'error',
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

const SEGMENTO_BADGE = {
  A: 'bg-indigo-100 text-indigo-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-slate-100 text-slate-600',
};

const TabRanking = ({ ranking, loading }) => {
  const clientes = ranking?.clientes ?? [];
  const top10 = clientes.slice(0, 10);

  const chartData = top10.map((c) => ({
    name: c.nombre?.split(' ').slice(0, 2).join(' ') ?? `C${c.cliente_id}`,
    facturado: c.facturado_neto,
  }));

  const columns = [
    { key: 'nombre',        label: 'Cliente' },
    { key: 'facturado_neto', label: 'Facturado neto',  render: (r) => formatCurrency(r.facturado_neto) },
    { key: 'tickets',       label: 'Tickets',           render: (r) => formatNumber(r.tickets) },
    { key: 'ticket_promedio', label: 'Ticket prom.',   render: (r) => formatCurrency(r.ticket_promedio) },
    { key: 'margen_pct',    label: 'Margen %',          render: (r) => `${(r.margen_pct ?? 0).toFixed(1)}%` },
    { key: 'ultima_compra', label: 'Última compra',     render: (r) => r.ultima_compra?.slice(0, 10) ?? '-' },
    {
      key: 'segmento',
      label: 'Segmento',
      render: (r) => (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${SEGMENTO_BADGE[r.segmento] ?? ''}`}>
          {r.segmento}
        </span>
      ),
    },
    { key: 'pct_del_total', label: '% del total',       render: (r) => `${(r.pct_del_total ?? 0).toFixed(1)}%` },
  ];

  if (loading) return <SkeletonChart />;

  return (
    <div className="space-y-6">
      <ChartCard title="Top 10 clientes por facturación">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={64} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Bar dataKey="facturado" name="Facturado neto" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={i < 3 ? '#4f46e5' : i < 6 ? '#6366f1' : '#a5b4fc'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <DataTable
        title="Ranking completo de clientes"
        rows={clientes}
        columns={columns}
        rowKey="cliente_id"
      />
    </div>
  );
};

// ── Tab: Segmentación (ABC) ───────────────────────────────────────────────────

const TabSegmentacion = ({ ranking, loading }) => {
  const clientes = ranking?.clientes ?? [];

  const bySegmento = { A: [], B: [], C: [] };
  for (const c of clientes) bySegmento[c.segmento]?.push(c);

  const pieData = ['A', 'B', 'C'].map((s) => ({
    name: `Segmento ${s}`,
    value: bySegmento[s].reduce((sum, c) => sum + c.facturado_neto, 0),
    count: bySegmento[s].length,
    fill: SEGMENTO_COLORS[s],
  }));

  const barData = ['A', 'B', 'C'].map((s) => ({
    segmento: `Segmento ${s}`,
    clientes: bySegmento[s].length,
    facturado: bySegmento[s].reduce((sum, c) => sum + c.facturado_neto, 0),
  }));

  if (loading) return <SkeletonChart />;

  return (
    <div className="space-y-6">
      {/* ABC explanation */}
      <div className="grid grid-cols-3 gap-4">
        {['A', 'B', 'C'].map((s) => (
          <div
            key={s}
            className="rounded-xl border bg-white p-4 shadow-sm"
            style={{ borderTopColor: SEGMENTO_COLORS[s], borderTopWidth: 3 }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: SEGMENTO_COLORS[s] }}
              >
                {s}
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {s === 'A' ? 'Top 80% del revenue' : s === 'B' ? '80–95% acumulado' : '+95% acumulado'}
                </p>
                <p className="text-xs text-slate-500">{bySegmento[s].length} clientes</p>
              </div>
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {formatCurrency(bySegmento[s].reduce((sum, c) => sum + c.facturado_neto, 0))}
            </p>
          </div>
        ))}
      </div>

      {/* Charts side by side */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ChartCard title="Distribución de revenue por segmento">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Clientes por segmento">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="segmento" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="clientes" name="Clientes" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={SEGMENTO_COLORS[['A', 'B', 'C'][i]]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

// ── Tab: Temporal ─────────────────────────────────────────────────────────────

const TabTemporal = ({ temporal, loading, onMount }) => {
  useEffect(() => { onMount(); }, []);

  if (loading) return <SkeletonChart />;
  if (!temporal) return null;

  const series = temporal.series ?? [];
  const chartData = series.map((s) => ({
    periodo: fmtPeriod(s.periodo),
    facturado: s.facturado,
    clientes_activos: s.clientes_activos,
    tickets: s.tickets,
  }));

  return (
    <div className="space-y-6">
      <ChartCard title="Facturación mensual">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={64} />
            <Tooltip formatter={(v, name) => name === 'facturado' ? formatCurrency(v) : formatNumber(v)} />
            <Legend />
            <Line type="monotone" dataKey="facturado" name="Facturado neto" stroke="#4f46e5" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Clientes activos por mes">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="clientes_activos" name="Clientes activos" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

// ── Tab: Detalle ──────────────────────────────────────────────────────────────

const TabDetalle = ({ ranking, detalle, loading, onFetch }) => {
  const clientes = ranking?.clientes ?? [];
  const [selected, setSelected] = useState('');

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelected(id);
    if (id) onFetch(Number(id));
  };

  const chartData = (detalle?.evolucion ?? []).map((e) => ({
    periodo: fmtPeriod(e.periodo),
    facturado: e.facturado,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Cliente:</label>
        <select
          value={selected}
          onChange={handleSelect}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Seleccionar cliente...</option>
          {clientes.map((c) => (
            <option key={c.cliente_id} value={c.cliente_id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {loading && <SkeletonChart />}

      {!loading && detalle && (
        <div className="space-y-6">
          {/* Client header */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
                {detalle.cliente?.nombre?.[0] ?? '?'}
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-slate-900">{detalle.cliente?.nombre}</p>
                <p className="text-sm text-slate-500">Última compra: {detalle.cliente?.ultima_compra?.slice(0, 10) ?? '-'}</p>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-xs text-slate-500">Facturado</p>
                  <p className="text-lg font-bold text-indigo-600">{formatCurrency(detalle.cliente?.facturado)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tickets</p>
                  <p className="text-lg font-bold text-slate-900">{formatNumber(detalle.cliente?.tickets)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Saldo Cta Cte</p>
                  <p className={`text-lg font-bold ${(detalle.cliente?.saldo_cta_cte ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatCurrency(detalle.cliente?.saldo_cta_cte)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Evolution */}
          {chartData.length > 0 && (
            <ChartCard title="Evolución de compras">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="facturado" name="Facturado" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Top productos */}
          <DataTable
            title="Top 10 productos comprados"
            rows={detalle.top_productos}
            rowKey="producto_id"
            columns={[
              { key: 'nombre',    label: 'Producto' },
              { key: 'facturado', label: 'Facturado',  render: (r) => formatCurrency(r.facturado) },
              { key: 'unidades',  label: 'Unidades',   render: (r) => formatNumber(r.unidades) },
            ]}
          />
        </div>
      )}

      {!loading && !detalle && selected && (
        <p className="text-sm text-slate-400">No hay datos para el cliente seleccionado en el período.</p>
      )}
    </div>
  );
};

// ── Panel inner ───────────────────────────────────────────────────────────────

const ClientesPanelInner = () => {
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
  const activeTab = searchParams.get('tab') ?? 'ranking';
  const setTab = (key) => setSearchParams({ tab: key }, { replace: true });

  const {
    kpis, ranking, temporal, detalle,
    loadingKpis, loadingRanking, loadingTemporal, loadingDetalle,
    error,
    fetchTemporal, fetchDetalle,
    refetch,
  } = useClientesData(user, activeCompany, filters, qs);

  const canFetch = (user?.company_id) || (user?.is_admin && activeCompany);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ranking, segmentación ABC y análisis de retención por cliente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SavedViews />
          <ExportButton
            label="Exportar ranking"
            endpoint={`/analytics/clientes/ranking${qs}`}
            filename="clientes_ranking"
          />
        </div>
      </div>

      <FilterBar />

      <ClientesKPIs kpis={kpis} loading={loadingKpis} />

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
        {activeTab === 'ranking' && (
          <TabRanking ranking={ranking} loading={loadingRanking} />
        )}
        {activeTab === 'segmentacion' && (
          <TabSegmentacion ranking={ranking} loading={loadingRanking} />
        )}
        {activeTab === 'temporal' && (
          <TabTemporal temporal={temporal} loading={loadingTemporal} onMount={fetchTemporal} />
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

const ClientesAnalyticsView = () => (
  <CrossFilterProvider>
    <ClientesPanelInner />
  </CrossFilterProvider>
);

export default ClientesAnalyticsView;
