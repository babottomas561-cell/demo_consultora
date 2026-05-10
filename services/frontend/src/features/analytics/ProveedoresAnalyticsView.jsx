import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { AlertTriangle, Award, Calendar, DollarSign, Package, ShoppingBag } from 'lucide-react';

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

const useProveedoresData = (user, activeCompany, filters, qs) => {
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
        apiClient.get(`/analytics/proveedores/kpis${qs}`),
        apiClient.get(`/analytics/proveedores/ranking${qs}`),
      ]);
      setKpis(kR.data);
      setRanking(rR.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de proveedores.');
    } finally {
      setLoadingKpis(false); setLoadingRanking(false);
    }
  }, [qs, canFetch]);

  const fetchTemporal = useCallback(async () => {
    if (!canFetch || temporal) return;
    setLoadingTemporal(true);
    try {
      const r = await apiClient.get(`/analytics/proveedores/temporal${qs}`);
      setTemporal(r.data);
    } catch (e) { console.error(e); } finally { setLoadingTemporal(false); }
  }, [qs, canFetch, temporal]);

  const fetchDetalle = useCallback(async (proveedorId) => {
    if (!canFetch || !proveedorId) return;
    setDetalle(null);
    setLoadingDetalle(true);
    try {
      const r = await apiClient.get(`/analytics/proveedores/detalle/${proveedorId}${qs}`);
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

const ProveedoresKPIs = ({ kpis, loading }) => {
  const row1 = [
    { label: 'Proveedores activos', kpi: kpis?.proveedores_activos, format: 'number',   icon: ShoppingBag },
    { label: 'Total comprado',      kpi: kpis?.total_comprado,      format: 'currency', icon: DollarSign },
    { label: 'Órdenes de compra',   kpi: kpis?.ordenes,             format: 'number',   icon: Package },
    { label: 'Ticket promedio',     kpi: kpis?.ticket_promedio,     format: 'currency' },
  ];
  const row2 = [
    { label: 'Mejor proveedor',     kpi: kpis?.mejor_proveedor,     format: 'custom',   icon: Award,          severity: 'success' },
    {
      label: 'Saldo Cta Cte',
      kpi: kpis?.saldo_cta_cte,
      format: 'currency',
      severity: (kpis?.saldo_cta_cte?.actual ?? 0) > 0 ? 'warning' : 'neutral',
    },
    {
      label: 'Deuda vencida',
      kpi: kpis?.deuda_vencida,
      format: 'currency',
      icon: AlertTriangle,
      severity: (kpis?.deuda_vencida?.actual ?? 0) > 0 ? 'danger' : 'success',
    },
    {
      label: 'Vence en 30 días',
      kpi: kpis?.proximos_30d,
      format: 'currency',
      icon: Calendar,
      severity: (kpis?.proximos_30d?.actual ?? 0) > 0 ? 'warning' : 'neutral',
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

// ── Tab: Ranking ──────────────────────────────────────────────────────────────

const SEGMENTO_BADGE = {
  A: 'bg-indigo-100 text-indigo-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-slate-100 text-slate-600',
};

const TabRanking = ({ ranking, loading }) => {
  const proveedores = ranking?.proveedores ?? [];
  const top10 = proveedores.slice(0, 10);

  const chartData = top10.map((p) => ({
    name: p.nombre?.split(' ').slice(0, 2).join(' ') ?? `P${p.proveedor_id}`,
    total: p.total_comprado,
  }));

  const columns = [
    { key: 'nombre',          label: 'Proveedor' },
    { key: 'total_comprado',  label: 'Total comprado',  render: (r) => formatCurrency(r.total_comprado) },
    { key: 'ordenes',         label: 'Órdenes',          render: (r) => formatNumber(r.ordenes) },
    { key: 'ticket_promedio', label: 'Ticket prom.',    render: (r) => formatCurrency(r.ticket_promedio) },
    { key: 'ultima_compra',   label: 'Última compra',   render: (r) => r.ultima_compra?.slice(0, 10) ?? '-' },
    {
      key: 'saldo_cta_cte',
      label: 'Saldo Cta Cte',
      render: (r) => (
        <span className={r.saldo_cta_cte > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
          {formatCurrency(r.saldo_cta_cte)}
        </span>
      ),
    },
    {
      key: 'segmento',
      label: 'Segmento',
      render: (r) => (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${SEGMENTO_BADGE[r.segmento] ?? ''}`}>
          {r.segmento}
        </span>
      ),
    },
    { key: 'pct_del_total',   label: '% del total',     render: (r) => `${(r.pct_del_total ?? 0).toFixed(1)}%` },
  ];

  if (loading) return <SkeletonChart />;

  return (
    <div className="space-y-6">
      <ChartCard title="Top 10 proveedores por volumen de compra">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={64} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Bar dataKey="total" name="Total comprado" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={i < 3 ? '#4f46e5' : i < 6 ? '#6366f1' : '#a5b4fc'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <DataTable
        title="Ranking completo de proveedores"
        rows={proveedores}
        columns={columns}
        rowKey="proveedor_id"
      />
    </div>
  );
};

// ── Tab: Segmentación (ABC) ───────────────────────────────────────────────────

const TabSegmentacion = ({ ranking, loading }) => {
  const proveedores = ranking?.proveedores ?? [];

  const bySegmento = { A: [], B: [], C: [] };
  for (const p of proveedores) bySegmento[p.segmento]?.push(p);

  const pieData = ['A', 'B', 'C'].map((s) => ({
    name: `Segmento ${s}`,
    value: bySegmento[s].reduce((sum, p) => sum + p.total_comprado, 0),
    count: bySegmento[s].length,
    fill: SEGMENTO_COLORS[s],
  }));

  const barData = ['A', 'B', 'C'].map((s) => ({
    segmento: `Segmento ${s}`,
    proveedores: bySegmento[s].length,
    total: bySegmento[s].reduce((sum, p) => sum + p.total_comprado, 0),
  }));

  if (loading) return <SkeletonChart />;

  return (
    <div className="space-y-6">
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
                  {s === 'A' ? 'Top 80% del gasto' : s === 'B' ? '80–95% acumulado' : '+95% acumulado'}
                </p>
                <p className="text-xs text-slate-500">{bySegmento[s].length} proveedores</p>
              </div>
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {formatCurrency(bySegmento[s].reduce((sum, p) => sum + p.total_comprado, 0))}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ChartCard title="Distribución de gasto por segmento">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Proveedores por segmento">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="segmento" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="proveedores" name="Proveedores" radius={[4, 4, 0, 0]}>
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
    total_comprado: s.total_comprado,
    ordenes: s.ordenes,
    proveedores_activos: s.proveedores_activos,
  }));

  return (
    <div className="space-y-6">
      <ChartCard title="Gasto mensual en compras">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} width={64} />
            <Tooltip formatter={(v, name) => name === 'total_comprado' ? formatCurrency(v) : formatNumber(v)} />
            <Legend />
            <Line type="monotone" dataKey="total_comprado" name="Total comprado" stroke="#4f46e5" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Órdenes de compra por mes">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="ordenes" name="Órdenes" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

// ── Tab: Detalle ──────────────────────────────────────────────────────────────

const TabDetalle = ({ ranking, detalle, loading, onFetch }) => {
  const proveedores = ranking?.proveedores ?? [];
  const [selected, setSelected] = useState('');

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelected(id);
    if (id) onFetch(id);
  };

  const chartData = (detalle?.evolucion ?? []).map((e) => ({
    periodo: fmtPeriod(e.periodo),
    total_comprado: e.total_comprado,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Proveedor:</label>
        <select
          value={selected}
          onChange={handleSelect}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Seleccionar proveedor...</option>
          {proveedores.map((p) => (
            <option key={p.proveedor_id} value={p.proveedor_id}>{p.nombre}</option>
          ))}
        </select>
      </div>

      {loading && <SkeletonChart />}

      {!loading && detalle && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
                {detalle.proveedor?.nombre?.[0] ?? '?'}
              </div>
              <div className="flex-1">
                <p className="text-xl font-bold text-slate-900">{detalle.proveedor?.nombre}</p>
                <p className="text-sm text-slate-500">Última compra: {detalle.proveedor?.ultima_compra?.slice(0, 10) ?? '-'}</p>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-xs text-slate-500">Comprado</p>
                  <p className="text-lg font-bold text-indigo-600">{formatCurrency(detalle.proveedor?.total_comprado)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Órdenes</p>
                  <p className="text-lg font-bold text-slate-900">{formatNumber(detalle.proveedor?.ordenes)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Saldo Cta Cte</p>
                  <p className={`text-lg font-bold ${(detalle.proveedor?.saldo_cta_cte ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatCurrency(detalle.proveedor?.saldo_cta_cte)}
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
                  <Bar dataKey="total_comprado" name="Total comprado" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Top productos + próximos vencimientos */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <DataTable
              title="Top 10 productos comprados"
              rows={detalle.top_productos}
              rowKey="producto_id"
              columns={[
                { key: 'nombre',   label: 'Producto' },
                { key: 'total',    label: 'Total',    render: (r) => formatCurrency(r.total) },
                { key: 'unidades', label: 'Unidades', render: (r) => formatNumber(r.unidades) },
              ]}
            />
            {detalle.proximos_vencimientos?.length > 0 && (
              <DataTable
                title="Próximos vencimientos"
                rows={detalle.proximos_vencimientos}
                rowKey="comprobante_id"
                columns={[
                  { key: 'comprobante_id',    label: 'Comprobante' },
                  { key: 'fecha_vencimiento', label: 'Vencimiento', render: (r) => r.fecha_vencimiento?.slice(0, 10) ?? '-' },
                  { key: 'importe',           label: 'Importe',     render: (r) => formatCurrency(r.importe) },
                ]}
              />
            )}
          </div>
        </div>
      )}

      {!loading && !detalle && selected && (
        <p className="text-sm text-slate-400">No hay datos para el proveedor seleccionado en el período.</p>
      )}
    </div>
  );
};

// ── Panel inner ───────────────────────────────────────────────────────────────

const ProveedoresPanelInner = () => {
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
  } = useProveedoresData(user, activeCompany, filters, qs);

  const canFetch = (user?.company_id) || (user?.is_admin && activeCompany);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel Proveedores</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ranking, segmentación ABC y análisis de deuda por proveedor.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SavedViews />
          <ExportButton
            label="Exportar ranking"
            endpoint={`/analytics/proveedores/ranking${qs}`}
            filename="proveedores_ranking"
          />
        </div>
      </div>

      <FilterBar />

      <ProveedoresKPIs kpis={kpis} loading={loadingKpis} />

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

const ProveedoresAnalyticsView = () => (
  <CrossFilterProvider>
    <ProveedoresPanelInner />
  </CrossFilterProvider>
);

export default ProveedoresAnalyticsView;
