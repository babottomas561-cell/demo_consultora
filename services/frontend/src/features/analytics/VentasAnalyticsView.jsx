import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { Activity, DollarSign, Package, ShoppingCart, TrendingDown, Users } from 'lucide-react';

import apiClient from '../../api/client';
import useAuthStore from '../../store/authStore';
import { useFilterStore } from '../../store/filterStore';
import FilterBar from '../../components/FilterBar';
import { buildQueryParams, formatCurrency, formatNumber } from './analyticsUtils';

import CrossFilterProvider from '../../components/analytics/CrossFilterProvider';
import { useCrossFilter } from '../../hooks/useCrossFilter';
import DrillThroughBreadcrumbs from '../../components/analytics/DrillThroughBreadcrumbs';
import KPICard from '../../components/analytics/KPICard';
import ChartCard from '../../components/analytics/ChartCard';
import DataTable from '../../components/analytics/DataTable';
import ChartTooltip from '../../components/analytics/ChartTooltip';
import PeriodComparator from '../../components/analytics/PeriodComparator';
import PanelTabs from '../../components/analytics/PanelTabs';
import SavedViews from '../../components/analytics/SavedViews';
import ExportButton from '../../components/analytics/ExportButton';
import { SkeletonKPI, SkeletonChart } from '../../components/analytics/SkeletonLoader';
import EmptyState from '../../components/analytics/EmptyState';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtM = (v) => {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const CONDICION_LABEL = { 1: 'Efectivo', 2: 'Cta Cte', 3: 'Tarjeta', 4: 'Otros' };
const CONDICION_COLORS = { 1: '#16a34a', 2: '#4f46e5', 3: '#eab308', 4: '#94a3b8' };
const TIPO_COLORS = { FA: '#4f46e5', NC: '#ef4444', ND: '#f97316', PR: '#8b5cf6' };
const SEGMENTO_COLORS = { A: '#4f46e5', B: '#eab308', C: '#94a3b8' };

const TABS = [
  { key: 'temporal',     label: 'Temporal' },
  { key: 'productos',    label: 'Productos' },
  { key: 'vendedores',   label: 'Vendedores' },
  { key: 'clientes',     label: 'Clientes' },
  { key: 'comprobantes', label: 'Comprobantes' },
  { key: 'detalle',      label: 'Detalle' },
];

// ── Hook: data fetching ───────────────────────────────────────────────────────

const useVentasData = (user, activeCompany, filters, qs) => {
  const [kpis, setKpis] = useState(null);
  const [temporal, setTemporal] = useState(null);
  const [productos, setProductos] = useState(null);
  const [vendedores, setVendedores] = useState(null);
  const [clientes, setClientes] = useState(null);
  const [comprobantes, setComprobantes] = useState(null);
  const [transacciones, setTransacciones] = useState(null);
  const [granularidad, setGranularidad] = useState('mes');
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTemporal, setLoadingTemporal] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingVendedores, setLoadingVendedores] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingComprobantes, setLoadingComprobantes] = useState(false);
  const [loadingTransacciones, setLoadingTransacciones] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [error, setError] = useState(null);

  const canFetch = (user?.company_id) || (user?.is_admin && activeCompany);

  const fetchPrimary = useCallback(async () => {
    if (!canFetch) { setLoadingKpis(false); setLoadingTemporal(false); setLoadingProductos(false); setLoadingVendedores(false); return; }
    setLoadingKpis(true); setLoadingTemporal(true); setLoadingProductos(true); setLoadingVendedores(true);
    setError(null);
    try {
      const [kR, tR, pR, vR] = await Promise.all([
        apiClient.get(`/analytics/ventas/kpis${qs}`),
        apiClient.get(`/analytics/ventas/temporal${qs}&granularidad=${granularidad}`),
        apiClient.get(`/analytics/ventas/productos${qs}`),
        apiClient.get(`/analytics/ventas/por-vendedor${qs}`),
      ]);
      setKpis(kR.data);
      setTemporal(tR.data);
      setProductos(pR.data);
      setVendedores(vR.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de ventas.');
    } finally {
      setLoadingKpis(false); setLoadingTemporal(false); setLoadingProductos(false); setLoadingVendedores(false);
    }
  }, [qs, granularidad, canFetch]);

  const fetchTemporal = useCallback(async () => {
    if (!canFetch) return;
    setLoadingTemporal(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/temporal${qs}&granularidad=${granularidad}`);
      setTemporal(r.data);
    } catch (e) { console.error(e); } finally { setLoadingTemporal(false); }
  }, [qs, granularidad, canFetch]);

  const fetchClientes = useCallback(async () => {
    if (!canFetch || clientes) return;
    setLoadingClientes(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/por-cliente${qs}`);
      setClientes(r.data);
    } catch (e) { console.error(e); } finally { setLoadingClientes(false); }
  }, [qs, canFetch, clientes]);

  const fetchComprobantes = useCallback(async () => {
    if (!canFetch || comprobantes) return;
    setLoadingComprobantes(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/por-comprobante${qs}`);
      setComprobantes(r.data);
    } catch (e) { console.error(e); } finally { setLoadingComprobantes(false); }
  }, [qs, canFetch, comprobantes]);

  const fetchTransacciones = useCallback(async (page = 1) => {
    if (!canFetch) return;
    setLoadingTransacciones(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/transacciones${qs}&page=${page}&limit=50`);
      setTransacciones(r.data);
      setTxPage(page);
    } catch (e) { console.error(e); } finally { setLoadingTransacciones(false); }
  }, [qs, canFetch]);

  // Refresh primary data when filters change
  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);

  // Re-fetch temporal when granularity changes
  useEffect(() => { if (temporal) fetchTemporal(); }, [granularidad]);

  return {
    kpis, temporal, productos, vendedores, clientes, comprobantes, transacciones,
    granularidad, setGranularidad,
    loadingKpis, loadingTemporal, loadingProductos, loadingVendedores,
    loadingClientes, loadingComprobantes, loadingTransacciones,
    txPage, error,
    fetchClientes, fetchComprobantes, fetchTransacciones,
    refetch: fetchPrimary,
  };
};

// ── KPI Row ───────────────────────────────────────────────────────────────────

const VentasKPIs = ({ kpis, loading, comparar }) => {
  const series = kpis ? [] : [];

  const cards = [
    {
      label: 'Facturado neto',
      kpi: kpis?.facturado_neto,
      severity: 'neutral',
      format: 'currency',
      icon: DollarSign,
    },
    {
      label: 'Tickets FA',
      kpi: kpis?.tickets,
      severity: 'neutral',
      format: 'number',
      icon: ShoppingCart,
    },
    {
      label: 'Ticket promedio',
      kpi: kpis?.ticket_promedio,
      severity: 'success',
      format: 'currency',
    },
    {
      label: 'Unidades',
      kpi: kpis?.unidades,
      severity: 'neutral',
      format: 'number',
      icon: Package,
    },
    {
      label: 'Clientes únicos',
      kpi: kpis?.clientes_unicos,
      severity: 'neutral',
      format: 'number',
      icon: Users,
    },
    {
      label: 'Tasa devolución',
      kpi: kpis?.tasa_devolucion,
      severity: kpis?.tasa_devolucion?.actual > 5 ? 'warning' : kpis?.tasa_devolucion?.actual < 3 ? 'success' : 'neutral',
      format: 'percent',
      icon: TrendingDown,
    },
    {
      label: 'IVA débito fiscal',
      kpi: kpis?.iva_debito,
      severity: 'neutral',
      format: 'currency',
    },
    {
      label: 'Margen bruto est.',
      kpi: kpis?.margen_bruto_pct,
      severity: kpis?.margen_bruto_pct?.actual > 30 ? 'success' : 'neutral',
      format: 'percent',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
        {cards.map((_, i) => <SkeletonKPI key={i} />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-5">
      {cards.map(({ label, kpi, severity, format, icon }) => (
        <KPICard
          key={label}
          label={label}
          value={kpi?.actual}
          severity={severity}
          format={format}
          icon={icon}
          compareValue={comparar ? kpi?.anterior : undefined}
          variation={comparar ? kpi?.variacion_pct : undefined}
          compareLabel="vs ant."
        />
      ))}
    </div>
  );
};

// ── Temporal Tab ──────────────────────────────────────────────────────────────

const GRAN_OPTIONS = [
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'trimestre', label: 'Trimestre' },
];

const TemporalTab = ({ temporal, loading, granularidad, setGranularidad, comparar }) => {
  const { applyFilter } = useCrossFilter();
  const series = temporal?.series ?? [];

  const GranToggle = () => (
    <div className="flex gap-1">
      {GRAN_OPTIONS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setGranularidad(key)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            granularidad === key
              ? 'bg-indigo-600 text-white'
              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <ChartCard
        title="Evolución de ventas"
        subtitle="Facturado neto y tickets por período"
        loading={loading}
        empty={!loading && !series.length}
        className="h-[380px]"
        contentClassName="h-[300px]"
      >
        <div className="flex justify-end mb-2"><GranToggle /></div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} onClick={(d) => d?.activePayload && applyFilter('periodo', [d.activeLabel], false)}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="periodo" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmtM} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip content={<ChartTooltip format="currency" />} />
            <Legend />
            {comparar && <Bar yAxisId="left" dataKey="facturado_anterior" name="Facturado anterior" fill="#e2e8f0" radius={[3, 3, 0, 0]} />}
            <Bar yAxisId="left" dataKey="facturado" name="Facturado neto" fill="#4f46e5" radius={[3, 3, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="tickets" name="Tickets" stroke="#f97316" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Devoluciones por período"
        loading={loading}
        empty={!loading && !series.length}
        className="h-[280px]"
        contentClassName="h-[210px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="periodo" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={fmtM} />
            <Tooltip content={<ChartTooltip format="currency" />} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="devoluciones" name="Devoluciones" stroke="#ef4444" fill="#fef2f2" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

// ── Productos Tab ─────────────────────────────────────────────────────────────

const ProductosTab = ({ productos, loading }) => {
  const { applyFilter } = useCrossFilter();
  const ranking = productos?.ranking ?? [];
  const rubros = productos?.por_rubro ?? [];
  const pareto = productos?.pareto ?? [];

  const colsProductos = [
    { key: 'nombre', label: 'Producto' },
    { key: 'unidades', label: 'Unid.', align: 'right', render: (r) => formatNumber(r.unidades) },
    { key: 'facturado', label: 'Facturado', align: 'right', render: (r) => formatCurrency(r.facturado) },
    { key: 'pct_total', label: '% Total', align: 'right', render: (r) => fmtPct(r.pct_total) },
    { key: 'margen_pct', label: 'Margen%', align: 'right', render: (r) => (
        <span className={r.margen_pct > 30 ? 'text-emerald-600 font-semibold' : 'text-slate-700'}>
          {fmtPct(r.margen_pct)}
        </span>
      ) },
    { key: 'tickets', label: 'Tickets', align: 'right', render: (r) => formatNumber(r.tickets) },
    { key: 'clientes_unicos', label: 'Clientes', align: 'right', render: (r) => formatNumber(r.clientes_unicos) },
  ];

  const colsRubros = [
    { key: 'nombre', label: 'Rubro' },
    { key: 'facturado', label: 'Facturado', align: 'right', render: (r) => formatCurrency(r.facturado) },
    { key: 'pct_total', label: '% Total', align: 'right', render: (r) => fmtPct(r.pct_total) },
    { key: 'tickets', label: 'Tickets', align: 'right', render: (r) => formatNumber(r.tickets) },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 space-y-4">
        <ChartCard title="Pareto de productos (top 20)" loading={loading} empty={!loading && !pareto.length} className="h-[300px]" contentClassName="h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={pareto}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="producto" axisLine={false} tickLine={false} tick={false} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip content={<ChartTooltip />} />
              <Bar yAxisId="left" dataKey="facturado" name="Facturado" fill="#4f46e5" radius={[3, 3, 0, 0]} onClick={(d) => applyFilter('cod_articulo', [d.producto])} cursor="pointer" />
              <Line yAxisId="right" type="monotone" dataKey="acumulado_pct" name="% Acum." stroke="#f97316" strokeWidth={2} dot={false} />
              <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '80%', fill: '#ef4444', fontSize: 10 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <DataTable title="Ranking de productos" columns={colsProductos} rows={ranking} loading={loading} exportFilename="productos" />
      </div>

      <div className="lg:col-span-2 space-y-4">
        <ChartCard title="Facturación por rubro" loading={loading} empty={!loading && !rubros.length} className="h-[280px]" contentClassName="h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rubros} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} />
              <YAxis type="category" dataKey="nombre" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={80} />
              <Tooltip content={<ChartTooltip format="currency" />} />
              <Bar dataKey="facturado" name="Facturado" fill="#818cf8" radius={[0, 3, 3, 0]} onClick={(d) => applyFilter('cod_rubro', [d.cod_rubro])} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <DataTable title="Por rubro" columns={colsRubros} rows={rubros} loading={loading} />
      </div>
    </div>
  );
};

// ── Vendedores Tab ────────────────────────────────────────────────────────────

const VendedoresTab = ({ vendedores: data, loading }) => {
  const { applyFilter } = useCrossFilter();
  const list = data?.vendedores ?? [];

  const cols = [
    { key: 'nombre_vendedor', label: 'Vendedor' },
    { key: 'facturado_neto', label: 'Facturado', align: 'right', render: (r) => formatCurrency(r.facturado_neto) },
    { key: 'tickets', label: 'Tickets', align: 'right', render: (r) => formatNumber(r.tickets) },
    { key: 'ticket_promedio', label: 'Ticket prom.', align: 'right', render: (r) => formatCurrency(r.ticket_promedio) },
    { key: 'clientes_unicos', label: 'Clientes', align: 'right', render: (r) => formatNumber(r.clientes_unicos) },
    { key: 'margen_pct', label: 'Margen%', align: 'right', render: (r) => fmtPct(r.margen_pct) },
    { key: 'pct_del_total', label: '% Total', align: 'right', render: (r) => fmtPct(r.pct_del_total) },
    { key: 'presupuestos_emitidos', label: 'Presup.', align: 'right' },
    { key: 'tasa_conversion', label: 'Conversión', align: 'right', render: (r) => fmtPct(r.tasa_conversion) },
  ];

  const initials = (name) => name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="space-y-4">
      <ChartCard title="Ranking de vendedores" loading={loading} empty={!loading && !list.length} className="h-[280px]" contentClassName="h-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={list} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmtM} />
            <YAxis type="category" dataKey="nombre_vendedor" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={100} />
            <Tooltip content={<ChartTooltip format="currency" />} />
            <Bar dataKey="facturado_neto" name="Facturado" radius={[0, 3, 3, 0]}
              onClick={(d) => applyFilter('cod_vendedor', [d.cod_vendedor])} cursor="pointer">
              {list.map((_, i) => <Cell key={i} fill={['#4f46e5', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'][i % 5]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {!loading && list.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {list.map((v, i) => (
            <div
              key={v.cod_vendedor}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => applyFilter('cod_vendedor', [v.cod_vendedor])}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {initials(v.nombre_vendedor)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900">{v.nombre_vendedor}</p>
                  <span className="text-[10px] font-bold text-slate-400">#{i + 1}</span>
                </div>
              </div>
              <p className="text-sm font-bold text-slate-900">{formatCurrency(v.facturado_neto)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{formatNumber(v.tickets)} tickets · {fmtPct(v.pct_del_total)} del total</p>
              <p className="text-[10px] text-slate-400">Margen: {fmtPct(v.margen_pct)}</p>
              {v.tasa_conversion > 0 && (
                <p className="text-[10px] text-indigo-600 mt-1 font-medium">Conv. {fmtPct(v.tasa_conversion)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <DataTable title="Detalle por vendedor" columns={cols} rows={list} loading={loading} exportFilename="vendedores" />
    </div>
  );
};

// ── Clientes Tab ──────────────────────────────────────────────────────────────

const ClientesTab = ({ clientes: data, loading }) => {
  const { applyFilter } = useCrossFilter();
  const list = data?.clientes ?? [];
  const abc = data?.abc_summary ?? {};

  const donutData = Object.entries(abc).map(([seg, vals]) => ({
    name: `Segmento ${seg}`,
    value: vals.facturado,
    color: SEGMENTO_COLORS[seg] ?? '#94a3b8',
    clientes: vals.clientes,
  }));

  const cols = [
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'segmento', label: 'Seg.', render: (r) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white`} style={{ background: SEGMENTO_COLORS[r.segmento] }}>{r.segmento}</span>
      ) },
    { key: 'facturado_neto', label: 'Facturado', align: 'right', render: (r) => formatCurrency(r.facturado_neto) },
    { key: 'tickets', label: 'Tickets', align: 'right' },
    { key: 'ticket_promedio', label: 'Ticket prom.', align: 'right', render: (r) => formatCurrency(r.ticket_promedio) },
    { key: 'margen_pct', label: 'Margen%', align: 'right', render: (r) => fmtPct(r.margen_pct) },
    { key: 'dias_sin_comprar', label: 'Días inact.', align: 'right' },
    { key: 'es_nuevo', label: 'Nuevo', render: (r) => r.es_nuevo ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Nuevo</span> : null },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Segmentación ABC" subtitle="A=top 80% facturación · B=siguiente 15% · C=resto" loading={loading} empty={!loading && !donutData.length} className="h-[280px]">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                onClick={(d) => applyFilter('segmento', [d.name.replace('Segmento ', '')])}>
                {donutData.map((d, i) => <Cell key={i} fill={d.color} cursor="pointer" />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend formatter={(v, e) => `${v} (${e.payload.clientes} clientes)`} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="grid grid-rows-3 gap-3">
          {Object.entries(abc).map(([seg, vals]) => (
            <div key={seg} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ background: SEGMENTO_COLORS[seg] }}>
                {seg}
              </div>
              <div>
                <p className="text-xs text-slate-500">Segmento {seg}</p>
                <p className="font-bold text-slate-900">{formatCurrency(vals.facturado)}</p>
                <p className="text-xs text-slate-400">{vals.clientes} clientes</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <DataTable title="Ranking de clientes" columns={cols} rows={list} loading={loading} exportFilename="clientes" />
    </div>
  );
};

// ── Comprobantes Tab ──────────────────────────────────────────────────────────

const COND_PALETTE = ['#4f46e5', '#16a34a', '#eab308', '#94a3b8'];
const FACT_PALETTE = ['#4f46e5', '#818cf8', '#c7d2fe'];

const DonutSimple = ({ chartData, title, loading, onClick }) => (
  <ChartCard title={title} loading={loading} empty={!loading && !chartData.length} className="h-[260px]">
    <ResponsiveContainer width="100%" height={170}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value"
          onClick={(d) => onClick && onClick(d)}>
          {chartData.map((d, i) => <Cell key={i} fill={d.color} cursor={onClick ? 'pointer' : 'default'} />)}
        </Pie>
        <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
        <Legend iconType="circle" iconSize={9} formatter={(v) => <span className="text-xs">{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  </ChartCard>
);

const ComprobantesTab = ({ comprobantes: data, loading }) => {
  const { applyFilter } = useCrossFilter();

  const tipoData = (data?.por_tipo ?? []).map((r) => ({
    name: r.tipo, value: r.importe, color: TIPO_COLORS[r.tipo] ?? '#94a3b8',
  }));
  const condData = (data?.por_condicion_venta ?? []).map((r, i) => ({
    name: r.condicion,
    value: r.importe,
    color: COND_PALETTE[i % COND_PALETTE.length],
  }));
  const factData = (data?.por_tipo_factura ?? []).map((r, i) => ({
    name: `Factura ${r.tipo}`, value: r.importe, color: FACT_PALETTE[i % FACT_PALETTE.length],
  }));

  const pdvCols = [
    { key: 'punto', label: 'Punto de venta' },
    { key: 'tickets', label: 'Tickets', align: 'right', render: (r) => formatNumber(r.tickets) },
    { key: 'facturado', label: 'Facturado', align: 'right', render: (r) => formatCurrency(r.facturado) },
    { key: 'pct_total', label: '% Total', align: 'right', render: (r) => fmtPct(r.pct_total) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DonutSimple chartData={tipoData} title="Por tipo comprobante" loading={loading} onClick={(d) => applyFilter('tipo_comprobante', [d.name])} />
        <DonutSimple chartData={condData} title="Por condición de venta" loading={loading} onClick={(d) => applyFilter('condicion_venta', [d.name])} />
        <DonutSimple chartData={factData} title="Por tipo de factura" loading={loading} />
      </div>
      <DataTable title="Por punto de venta" columns={pdvCols} rows={data?.por_punto_de_venta ?? []} loading={loading} />
    </div>
  );
};

// ── Detalle Tab ───────────────────────────────────────────────────────────────

const DetalleTab = ({ transacciones: data, loading, fetchTransacciones }) => {
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const pages = data?.pages ?? 1;

  const cols = [
    { key: 'fecha', label: 'Fecha', render: (r) => r.fecha?.slice(0, 10) },
    { key: 'tipo_comprobante', label: 'Tipo' },
    { key: 'tipo_factura', label: 'Letra' },
    { key: 'punto_de_venta', label: 'Pto.Vta' },
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'producto_nombre', label: 'Producto' },
    { key: 'cantidad', label: 'Cant.', align: 'right', render: (r) => formatNumber(r.cantidad) },
    { key: 'neto', label: 'Neto', align: 'right', render: (r) => formatCurrency(r.neto) },
    { key: 'iva_importe', label: 'IVA', align: 'right', render: (r) => formatCurrency(r.iva_importe) },
    { key: 'total', label: 'Total', align: 'right', render: (r) => formatCurrency(r.total) },
    { key: 'anulada', label: 'Anul.', render: (r) => r.anulada === 'S' ? <span className="text-red-500 font-bold text-xs">S</span> : null },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{formatNumber(total)} transacciones en total</span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => fetchTransacciones(page - 1)} disabled={page <= 1} className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40">‹</button>
            <span>Pág. {page} / {pages}</span>
            <button onClick={() => fetchTransacciones(page + 1)} disabled={page >= pages} className="rounded border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-40">›</button>
          </div>
        )}
      </div>
      <DataTable title="Transacciones" columns={cols} rows={rows} loading={loading} exportFilename="transacciones_ventas" />
    </div>
  );
};

// ── Main panel ────────────────────────────────────────────────────────────────

const VentasPanelInner = () => {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore = useFilterStore();
  const comparar = filterStore.comparar_anterior;
  const panelRef = useRef(null);

  const filters = useMemo(() => filterStore.getApiFilters(), [
    filterStore.periodo, filterStore.desde, filterStore.hasta,
    filterStore.comparar_anterior, filterStore.cod_empresa, filterStore.tag,
    filterStore.punto_de_venta, filterStore.cod_vendedor, filterStore.cod_rubro,
    filterStore.cod_subrubro, filterStore.tipo_comprobante, filterStore.condicion_venta,
    filterStore.cod_cliente, filterStore.cod_articulo, filterStore.cod_deposito,
    filterStore.incluir_anuladas,
  ]);

  const qs = buildQueryParams(user, activeCompany, filters);
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'temporal';

  const d = useVentasData(user, activeCompany, filters, qs);

  // Lazy-load tab data on tab switch
  useEffect(() => {
    if (activeTab === 'clientes') d.fetchClientes();
    if (activeTab === 'comprobantes') d.fetchComprobantes();
    if (activeTab === 'detalle' && !d.transacciones) d.fetchTransacciones(1);
  }, [activeTab]);

  // No company selected (admin mode)
  if (user?.is_admin && !activeCompany) {
    return (
      <div className="py-20 text-center">
        <Activity className="mx-auto text-slate-400" size={40} />
        <h2 className="mt-4 text-xl font-bold text-slate-900">Seleccioná una empresa</h2>
        <p className="mt-2 text-slate-500">Los paneles analíticos leen datos del schema tenant activo.</p>
        <Link to="/admin/companies" className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">Elegir empresa</Link>
      </div>
    );
  }

  if (d.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex items-center justify-between">
        <p className="text-red-700 font-medium">{d.error}</p>
        <button onClick={d.refetch} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Reintentar</button>
      </div>
    );
  }

  const tabContent = {
    temporal:     <TemporalTab temporal={d.temporal} loading={d.loadingTemporal} granularidad={d.granularidad} setGranularidad={d.setGranularidad} comparar={comparar} />,
    productos:    <ProductosTab productos={d.productos} loading={d.loadingProductos} />,
    vendedores:   <VendedoresTab vendedores={d.vendedores} loading={d.loadingVendedores} />,
    clientes:     <ClientesTab clientes={d.clientes} loading={d.loadingClientes} />,
    comprobantes: <ComprobantesTab comprobantes={d.comprobantes} loading={d.loadingComprobantes} />,
    detalle:      <DetalleTab transacciones={d.transacciones} loading={d.loadingTransacciones} fetchTransacciones={d.fetchTransacciones} />,
  };

  return (
    <div className="space-y-0" ref={panelRef}>
      <FilterBar />

      <div className="space-y-3 pt-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Panel Ventas</h1>
            <p className="text-sm text-slate-500">Ingresos, márgenes, clientes y vendedores.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SavedViews />
            <ExportButton
              data={{ Ventas: d.temporal?.series ?? [] }}
              filename="ventas"
              panelRef={panelRef}
            />
          </div>
        </div>

        <PeriodComparator />
        <DrillThroughBreadcrumbs />

        <VentasKPIs kpis={d.kpis} loading={d.loadingKpis} comparar={comparar} />

        <PanelTabs tabs={TABS} paramKey="tab" variant="underline" />

        <div className="pt-3">
          {tabContent[activeTab] ?? <EmptyState variant="no-data" />}
        </div>
      </div>
    </div>
  );
};

const VentasAnalyticsView = () => (
  <CrossFilterProvider>
    <VentasPanelInner />
  </CrossFilterProvider>
);

export default VentasAnalyticsView;
