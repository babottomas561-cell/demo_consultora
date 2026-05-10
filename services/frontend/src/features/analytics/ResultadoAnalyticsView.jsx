import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart,
  Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import {
  AlertTriangle, DollarSign, Package, Percent, ShoppingCart,
  Tag, TrendingDown, TrendingUp,
} from 'lucide-react';

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
const fmtPct = (v) => `${Number(v ?? 0).toFixed(1)}%`;

const QUAD_COLORS = { estrella: '#16a34a', diamante: '#4f46e5', vaca: '#eab308', perro: '#ef4444' };
const QUAD_LABELS = { estrella: '⭐ Estrellas', diamante: '💎 Diamantes', vaca: '🐄 Vacas', perro: '🐕 Perros' };

const TABS = [
  { key: 'temporal', label: 'Temporal' },
  { key: 'productos', label: 'Productos' },
  { key: 'vendedores', label: 'Vendedores' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'descuentos', label: 'Descuentos' },
];

// ── Data hook ────────────────────────────────────────────────────────────────

const useResultadoData = (user, activeCompany, filters, qs) => {
  const [kpis, setKpis] = useState(null);
  const [temporal, setTemporal] = useState(null);
  const [productos, setProductos] = useState(null);
  const [vendedores, setVendedores] = useState(null);
  const [clientes, setClientes] = useState(null);
  const [descuentos, setDescuentos] = useState(null);
  const [granularidad, setGranularidad] = useState('mes');
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTemporal, setLoadingTemporal] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingVendedores, setLoadingVendedores] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingDescuentos, setLoadingDescuentos] = useState(false);
  const [error, setError] = useState(null);

  const canFetch = (user?.company_id) || (user?.is_admin && activeCompany);

  const fetchPrimary = useCallback(async () => {
    if (!canFetch) { setLoadingKpis(false); setLoadingTemporal(false); setLoadingProductos(false); return; }
    setLoadingKpis(true); setLoadingTemporal(true); setLoadingProductos(true);
    setError(null);
    try {
      const [kR, tR, pR] = await Promise.all([
        apiClient.get(`/analytics/resultado/kpis${qs}`),
        apiClient.get(`/analytics/resultado/temporal${qs}&granularidad=${granularidad}`),
        apiClient.get(`/analytics/resultado/por-producto${qs}`),
      ]);
      setKpis(kR.data);
      setTemporal(tR.data);
      setProductos(pR.data);
    } catch (e) { setError(e.message); }
    setLoadingKpis(false); setLoadingTemporal(false); setLoadingProductos(false);
  }, [qs, granularidad, canFetch]);

  const fetchVendedores = useCallback(async () => {
    if (!canFetch || vendedores) return;
    setLoadingVendedores(true);
    try { const r = await apiClient.get(`/analytics/resultado/por-vendedor${qs}`); setVendedores(r.data); }
    catch (e) { setError(e.message); }
    setLoadingVendedores(false);
  }, [qs, canFetch, vendedores]);

  const fetchClientes = useCallback(async () => {
    if (!canFetch || clientes) return;
    setLoadingClientes(true);
    try { const r = await apiClient.get(`/analytics/resultado/por-cliente${qs}`); setClientes(r.data); }
    catch (e) { setError(e.message); }
    setLoadingClientes(false);
  }, [qs, canFetch, clientes]);

  const fetchDescuentos = useCallback(async () => {
    if (!canFetch || descuentos) return;
    setLoadingDescuentos(true);
    try { const r = await apiClient.get(`/analytics/resultado/descuentos${qs}`); setDescuentos(r.data); }
    catch (e) { setError(e.message); }
    setLoadingDescuentos(false);
  }, [qs, canFetch, descuentos]);

  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);

  useEffect(() => {
    setVendedores(null); setClientes(null); setDescuentos(null);
  }, [qs]);

  return {
    kpis, temporal, productos, vendedores, clientes, descuentos,
    granularidad, setGranularidad,
    loadingKpis, loadingTemporal, loadingProductos, loadingVendedores, loadingClientes, loadingDescuentos,
    error, fetchVendedores, fetchClientes, fetchDescuentos,
  };
};

// ── KPIs ─────────────────────────────────────────────────────────────────────

const ResultadoKPIs = ({ kpis, loading, comparar }) => {
  if (loading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array(8).fill(0).map((_, i) => <SkeletonKPI key={i} />)}</div>;
  if (!kpis) return null;
  const k = kpis;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Facturado neto" value={formatCurrency(k.facturado_neto?.actual)} icon={DollarSign} color="blue"
          variacion={comparar ? k.facturado_neto?.variacion_pct : null} anterior={comparar ? k.facturado_neto?.anterior : null} formatAnterior={formatCurrency} />
        <KPICard label="COGS / Costo merc." value={formatCurrency(k.cogs?.actual)} icon={Package} color="slate"
          variacion={comparar ? k.cogs?.variacion_pct : null} anterior={comparar ? k.cogs?.anterior : null} formatAnterior={formatCurrency} invertVariation />
        <KPICard label="Margen bruto $" value={formatCurrency(k.margen_bruto?.actual)} icon={TrendingUp} color="green"
          variacion={comparar ? k.margen_bruto?.variacion_pct : null} anterior={comparar ? k.margen_bruto?.anterior : null} formatAnterior={formatCurrency} />
        <KPICard label="Margen bruto %" value={fmtPct(k.margen_pct?.actual)} icon={Percent} color="green"
          variacion={comparar ? k.margen_pct?.variacion_pct : null} anterior={comparar ? k.margen_pct?.anterior : null} formatAnterior={fmtPct} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Ticket prom. margen" value={formatCurrency(k.ticket_margen?.actual)} icon={ShoppingCart} color="indigo"
          variacion={comparar ? k.ticket_margen?.variacion_pct : null} anterior={comparar ? k.ticket_margen?.anterior : null} formatAnterior={formatCurrency} />
        <KPICard label="Productos bajo costo" value={k.productos_bajo_costo?.actual ?? 0} icon={AlertTriangle}
          color={k.productos_bajo_costo?.actual > 0 ? 'red' : 'green'}
          badge={k.productos_bajo_costo?.actual > 0 ? 'ALERTA' : null} />
        <KPICard label="Descuento total" value={formatCurrency(k.descuento_total?.actual)} icon={Tag} color="orange"
          variacion={comparar ? k.descuento_total?.variacion_pct : null} anterior={comparar ? k.descuento_total?.anterior : null} formatAnterior={formatCurrency} invertVariation />
        <KPICard label="Descuento prom. %" value={fmtPct(k.descuento_pct?.actual)} icon={Percent} color="amber" />
      </div>
      {k.cobertura_costo_pct < 100 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          ⚠️ El COGS incluye {k.cobertura_costo_pct}% de las ventas (resto sin precio de compra)
        </div>
      )}
    </div>
  );
};

// ── Temporal Tab ─────────────────────────────────────────────────────────────

const TemporalTab = ({ data, loading, granularidad, setGranularidad }) => {
  const series = data?.series ?? [];
  const avgMargen = series.length ? series.reduce((s, r) => s + r.margen_pct, 0) / series.length : 0;

  return (
    <div className="space-y-4">
      <ChartCard title="Facturación, COGS y Margen" subtitle="Composición de resultados por período" loading={loading}>
        <div className="flex justify-end gap-1 mb-2">
          {['dia', 'semana', 'mes', 'trimestre'].map((g) => (
            <button key={g} onClick={() => setGranularidad(g)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${g === granularidad ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {g.charAt(0).toUpperCase() + g.slice(1).replace('trimestre', 'Trim.')}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={series} margin={{ top: 5, right: 50, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tickFormatter={fmtM} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, n) => n === 'Margen %' ? [fmtPct(v), n] : [fmtM(v), n]} />
            <Legend />
            <Bar yAxisId="left" dataKey="facturado_neto" name="Facturado neto" fill="#4f46e5" radius={[3, 3, 0, 0]} />
            <Bar yAxisId="left" dataKey="cogs" name="COGS" fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Line yAxisId="left" dataKey="margen_bruto" name="Margen $" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="right" dataKey="margen_pct" name="Margen %" stroke="#16a34a" strokeDasharray="5 5" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Evolución del margen %" subtitle="Tendencia del margen bruto porcentual" loading={loading}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={series} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis domain={['auto', 'auto']} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [fmtPct(v), 'Margen %']} />
            <ReferenceLine y={avgMargen} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: `Prom ${fmtPct(avgMargen)}`, position: 'right', fontSize: 10 }} />
            <defs>
              <linearGradient id="margenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="margen_pct" stroke="#16a34a" fill="url(#margenGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Descuentos por período" subtitle="Total descontado y % promedio" loading={loading}>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={series} margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtM} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, n) => n === 'Descuento %' ? [fmtPct(v), n] : [fmtM(v), n]} />
            <Legend />
            <Bar dataKey="descuento_total" name="Descuento total" fill="#f97316" radius={[3, 3, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

// ── Productos Tab ────────────────────────────────────────────────────────────

const ProductosTab = ({ data, loading }) => {
  const { applyFilter } = useCrossFilter();
  const ranking = data?.ranking ?? [];
  const medianas = data?.medianas ?? { facturado: 0, margen_pct: 0 };
  const bajoCosto = ranking.filter((p) => p.margen_pct < 0);

  const scatterData = ranking.map((p) => ({
    x: Math.max(p.facturado, 1),
    y: p.margen_pct,
    z: Math.max(p.unidades, 10),
    nombre: p.nombre,
    cuadrante: p.cuadrante,
    margen_dolares: p.margen_dolares,
    facturado: p.facturado,
    producto_id: p.producto_id,
  }));

  const cols = [
    { key: 'nombre', label: 'Producto' },
    { key: 'cuadrante', label: 'Cuadrante', render: (r) => (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: QUAD_COLORS[r.cuadrante] + '18', color: QUAD_COLORS[r.cuadrante] }}>
        {QUAD_LABELS[r.cuadrante]?.split(' ')[0]} {r.cuadrante}
      </span>
    )},
    { key: 'facturado', label: 'Facturado', align: 'right', render: (r) => formatCurrency(r.facturado) },
    { key: 'cogs', label: 'COGS', align: 'right', render: (r) => formatCurrency(r.cogs) },
    { key: 'margen_dolares', label: 'Margen $', align: 'right', render: (r) => (
      <span className={r.margen_pct < 0 ? 'text-red-600 font-bold' : ''}>{formatCurrency(r.margen_dolares)}</span>
    )},
    { key: 'margen_pct', label: 'Margen %', align: 'right', render: (r) => (
      <span className={r.margen_pct < 0 ? 'text-red-600 font-bold' : ''}>{fmtPct(r.margen_pct)}</span>
    )},
    { key: 'descuento_total', label: 'Descuento', align: 'right', render: (r) => formatCurrency(r.descuento_total) },
  ];

  const CustomScatterTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
        <p className="font-semibold text-slate-900">{d.nombre}</p>
        <p>Facturado: {formatCurrency(d.facturado)}</p>
        <p>Margen $: {formatCurrency(d.margen_dolares)}</p>
        <p>Margen %: {fmtPct(d.y)}</p>
        <p className="mt-1 text-slate-500">{QUAD_LABELS[d.cuadrante]}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {bajoCosto.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 font-medium">
          ⚠️ {bajoCosto.length} producto{bajoCosto.length > 1 ? 's se están' : ' se está'} vendiendo bajo el costo de compra
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Cuadrante de producto" subtitle="Facturación vs. Margen %" loading={loading}>
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="x" type="number" scale="log" domain={['auto', 'auto']} tickFormatter={fmtM} name="Facturado" tick={{ fontSize: 10 }} />
              <YAxis dataKey="y" type="number" domain={['auto', 'auto']} tickFormatter={(v) => `${v}%`} name="Margen %" tick={{ fontSize: 10 }} />
              <ZAxis dataKey="z" type="number" range={[40, 400]} />
              <ReferenceLine x={medianas.facturado} stroke="#94a3b8" strokeDasharray="4 4" />
              <ReferenceLine y={medianas.margen_pct} stroke="#94a3b8" strokeDasharray="4 4" />
              <Tooltip content={<CustomScatterTooltip />} />
              <Scatter data={scatterData} isAnimationActive={false}
                onClick={(d) => applyFilter('producto_id', [d.producto_id])}>
                {scatterData.map((d, i) => (
                  <Cell key={i} fill={QUAD_COLORS[d.cuadrante] ?? '#94a3b8'} fillOpacity={0.7} cursor="pointer" />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1 text-[10px] font-medium">
            {Object.entries(QUAD_LABELS).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: QUAD_COLORS[k] }} />
                {v}
              </span>
            ))}
          </div>
        </ChartCard>

        <DataTable title="Ranking por margen" columns={cols} rows={ranking} loading={loading}
          rowClassName={(r) => r.margen_pct < 0 ? 'bg-red-50' : ''} />
      </div>
    </div>
  );
};

// ── Vendedores Tab ───────────────────────────────────────────────────────────

const VendedoresTab = ({ data, loading }) => {
  const ranking = data?.ranking ?? [];
  const avgDesc = ranking.length ? ranking.reduce((s, v) => s + v.descuento_promedio_pct, 0) / ranking.length : 0;
  const highDiscount = ranking.filter((v) => v.descuento_promedio_pct > avgDesc * 2);

  const cols = [
    { key: 'nombre', label: 'Vendedor' },
    { key: 'facturado', label: 'Facturado', align: 'right', render: (r) => formatCurrency(r.facturado) },
    { key: 'cogs', label: 'COGS', align: 'right', render: (r) => formatCurrency(r.cogs) },
    { key: 'margen_dolares', label: 'Margen $', align: 'right', render: (r) => formatCurrency(r.margen_dolares) },
    { key: 'margen_pct', label: 'Margen %', align: 'right', render: (r) => fmtPct(r.margen_pct) },
    { key: 'descuento_promedio_pct', label: 'Desc. Prom %', align: 'right', render: (r) => (
      <span className={r.descuento_promedio_pct > 10 ? 'text-red-600 font-bold' : r.descuento_promedio_pct > 5 ? 'text-amber-600' : 'text-green-600'}>
        {fmtPct(r.descuento_promedio_pct)}
      </span>
    )},
    { key: 'tickets', label: 'Tickets', align: 'right', render: (r) => formatNumber(r.tickets) },
  ];

  return (
    <div className="space-y-4">
      {highDiscount.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 font-medium">
          ⚠️ {highDiscount.map((v) => v.nombre).join(', ')} tiene{highDiscount.length > 1 ? 'n' : ''} descuento {'>'} 2x el promedio del equipo ({fmtPct(avgDesc)})
        </div>
      )}
      <ChartCard title="Facturación vs Margen generado" loading={loading}>
        <ResponsiveContainer width="100%" height={Math.max(200, ranking.length * 50)}>
          <BarChart data={ranking} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" tickFormatter={fmtM} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="nombre" width={90} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="facturado" name="Facturado" fill="#4f46e5" radius={[0, 3, 3, 0]} />
            <Bar dataKey="margen_dolares" name="Margen $" fill="#16a34a" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Descuento promedio por vendedor" loading={loading}>
        <ResponsiveContainer width="100%" height={Math.max(180, ranking.length * 40)}>
          <BarChart data={ranking} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="nombre" width={90} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [fmtPct(v), 'Desc. %']} />
            <ReferenceLine x={avgDesc} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: `Prom. ${fmtPct(avgDesc)}`, position: 'top', fontSize: 10 }} />
            <Bar dataKey="descuento_promedio_pct" name="Desc. Prom %" isAnimationActive={false}>
              {ranking.map((v, i) => (
                <Cell key={i} fill={v.descuento_promedio_pct > 10 ? '#ef4444' : v.descuento_promedio_pct > 5 ? '#eab308' : '#16a34a'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <DataTable title="Detalle vendedores" columns={cols} rows={ranking} loading={loading} />
    </div>
  );
};

// ── Clientes Tab ─────────────────────────────────────────────────────────────

const ClientesTab = ({ data, loading }) => {
  const ranking = data?.ranking ?? [];

  const scatterData = ranking.map((c) => ({
    x: Math.max(c.facturado, 1), y: c.margen_pct,
    nombre: c.cliente_nombre, facturado: c.facturado,
    margen_dolares: c.margen_dolares, descuento_promedio_pct: c.descuento_promedio_pct,
  }));

  const medFact = ranking.length ? [...ranking].sort((a, b) => a.facturado - b.facturado)[Math.floor(ranking.length / 2)].facturado : 0;
  const medMarg = ranking.length ? [...ranking].sort((a, b) => a.margen_pct - b.margen_pct)[Math.floor(ranking.length / 2)].margen_pct : 0;

  const lowMarginHigh = ranking.filter((c) => c.facturado > medFact && c.margen_pct < medMarg);

  const cols = [
    { key: 'cliente_nombre', label: 'Cliente' },
    { key: 'facturado', label: 'Facturado', align: 'right', render: (r) => formatCurrency(r.facturado) },
    { key: 'cogs', label: 'COGS', align: 'right', render: (r) => formatCurrency(r.cogs) },
    { key: 'margen_dolares', label: 'Margen $', align: 'right', render: (r) => formatCurrency(r.margen_dolares) },
    { key: 'margen_pct', label: 'Margen %', align: 'right', render: (r) => (
      <span className={r.margen_pct < 0 ? 'text-red-600 font-bold' : ''}>{fmtPct(r.margen_pct)}</span>
    )},
    { key: 'descuento_promedio_pct', label: 'Desc. Prom %', align: 'right', render: (r) => fmtPct(r.descuento_promedio_pct) },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
        <p className="font-semibold">{d.nombre}</p>
        <p>Facturado: {formatCurrency(d.facturado)}</p>
        <p>Margen $: {formatCurrency(d.margen_dolares)}</p>
        <p>Margen %: {fmtPct(d.y)}</p>
        <p>Desc. prom: {fmtPct(d.descuento_promedio_pct)}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {lowMarginHigh.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 font-medium">
          💡 {lowMarginHigh.length} cliente{lowMarginHigh.length > 1 ? 's tienen' : ' tiene'} alta facturación pero bajo margen — revisar descuentos
        </div>
      )}
      <ChartCard title="Clientes: Facturación vs Margen %" loading={loading}>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="x" type="number" scale="log" domain={['auto', 'auto']} tickFormatter={fmtM} tick={{ fontSize: 10 }} />
            <YAxis dataKey="y" type="number" domain={['auto', 'auto']} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
            <ReferenceLine x={medFact} stroke="#94a3b8" strokeDasharray="4 4" />
            <ReferenceLine y={medMarg} stroke="#94a3b8" strokeDasharray="4 4" />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={scatterData} fill="#4f46e5" fillOpacity={0.6} isAnimationActive={false} />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>
      <DataTable title="Ranking clientes por margen" columns={cols} rows={ranking} loading={loading} />
    </div>
  );
};

// ── Descuentos Tab ───────────────────────────────────────────────────────────

const DescuentosTab = ({ data, loading }) => {
  if (loading) return <SkeletonChart />;
  if (!data) return null;

  const alertas = (data.mayores_descuentos ?? []).filter((d) => d.descuento_pct > 20);

  const semaforo = (pct) => {
    if (pct > 10) return 'text-red-600 font-bold';
    if (pct > 5) return 'text-amber-600';
    return 'text-green-600';
  };

  const vendCols = [
    { key: 'nombre', label: 'Vendedor' },
    { key: 'descuento_total', label: 'Desc. Total', align: 'right', render: (r) => formatCurrency(r.descuento_total) },
    { key: 'descuento_pct_promedio', label: 'Desc. % Prom', align: 'right', render: (r) => (
      <span className={semaforo(r.descuento_pct_promedio)}>{fmtPct(r.descuento_pct_promedio)}</span>
    )},
    { key: 'tickets_con_descuento', label: 'Tickets c/desc.', align: 'right', render: (r) => formatNumber(r.tickets_con_descuento) },
  ];

  const prodCols = [
    { key: 'nombre', label: 'Producto' },
    { key: 'descuento_total', label: 'Desc. Total', align: 'right', render: (r) => formatCurrency(r.descuento_total) },
    { key: 'descuento_pct_promedio', label: 'Desc. % Prom', align: 'right', render: (r) => fmtPct(r.descuento_pct_promedio) },
    { key: 'tickets_con_descuento', label: 'Tickets', align: 'right', render: (r) => formatNumber(r.tickets_con_descuento) },
  ];

  const mayorCols = [
    { key: 'fecha', label: 'Fecha' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'vendedor', label: 'Vendedor' },
    { key: 'producto', label: 'Producto' },
    { key: 'descuento_pct', label: 'Desc. %', align: 'right', render: (r) => (
      <span className={r.descuento_pct > 20 ? 'text-red-600 font-bold' : ''}>{fmtPct(r.descuento_pct)}</span>
    )},
    { key: 'descuento_dolares', label: 'Desc. $', align: 'right', render: (r) => formatCurrency(r.descuento_dolares) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-xs text-slate-500 mb-1">Total descontado</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(data.total_descontado)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-xs text-slate-500 mb-1">% sobre facturación</p>
          <p className="text-2xl font-bold text-amber-600">{fmtPct(data.pct_sobre_facturacion)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-xs text-slate-500 mb-1">Facturación perdida</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(data.facturacion_perdida)}</p>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 font-medium">
          🚨 {alertas.length} descuento{alertas.length > 1 ? 's' : ''} individual{alertas.length > 1 ? 'es' : ''} supera{alertas.length === 1 ? '' : 'n'} el 20%
        </div>
      )}

      <DataTable title="Descuentos por vendedor" columns={vendCols} rows={data.por_vendedor ?? []} />
      <DataTable title="Descuentos por producto" columns={prodCols} rows={data.por_producto ?? []} />
      <DataTable title="Mayores descuentos individuales (Top 10)" columns={mayorCols} rows={data.mayores_descuentos ?? []}
        rowClassName={(r) => r.descuento_pct > 20 ? 'bg-red-50' : ''} />
    </div>
  );
};

// ── Main Panel ───────────────────────────────────────────────────────────────

const ResultadoPanelInner = () => {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore = useFilterStore();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'temporal';

  const filters = useMemo(() => filterStore.getApiFilters(), [
    filterStore.periodo, filterStore.desde, filterStore.hasta,
    filterStore.comparar_anterior, filterStore.cod_empresa, filterStore.tag,
    filterStore.punto_de_venta, filterStore.cod_vendedor, filterStore.cod_rubro,
    filterStore.cod_subrubro, filterStore.tipo_comprobante, filterStore.condicion_venta,
    filterStore.cod_cliente, filterStore.cod_articulo, filterStore.cod_deposito,
    filterStore.incluir_anuladas,
  ]);

  const qs = buildQueryParams(user, activeCompany, filters);

  const d = useResultadoData(user, activeCompany, filters, qs);

  useEffect(() => {
    if (activeTab === 'vendedores') d.fetchVendedores();
    if (activeTab === 'clientes') d.fetchClientes();
    if (activeTab === 'descuentos') d.fetchDescuentos();
  }, [activeTab, d.fetchVendedores, d.fetchClientes, d.fetchDescuentos]);

  if (user?.is_admin && !activeCompany) {
    return (
      <div className="py-20 text-center">
        <TrendingUp className="mx-auto text-slate-400" size={40} />
        <h2 className="mt-4 text-xl font-bold text-slate-900">Seleccioná una empresa</h2>
        <p className="mt-2 text-slate-500">Los paneles analíticos leen datos del schema tenant activo.</p>
      </div>
    );
  }

  const tabContent = {
    temporal: <TemporalTab data={d.temporal} loading={d.loadingTemporal} granularidad={d.granularidad} setGranularidad={d.setGranularidad} />,
    productos: <ProductosTab data={d.productos} loading={d.loadingProductos} />,
    vendedores: <VendedoresTab data={d.vendedores} loading={d.loadingVendedores} />,
    clientes: <ClientesTab data={d.clientes} loading={d.loadingClientes} />,
    descuentos: <DescuentosTab data={d.descuentos} loading={d.loadingDescuentos} />,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Panel Resultado</h1>
          <p className="text-sm text-slate-500">Márgenes, costos, descuentos y rentabilidad por producto, vendedor y cliente.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SavedViews panel="resultado" />
          <ExportButton
            apiEndpoint={`/analytics/resultado/exportar${qs}`}
            filename="resultado"
            formats={['excel', 'csv']}
          />
        </div>
      </div>
      <FilterBar />
      <PeriodComparator />
      <DrillThroughBreadcrumbs />
      <ResultadoKPIs kpis={d.kpis} loading={d.loadingKpis} comparar={filters.comparar_anterior} />
      <PanelTabs tabs={TABS} paramKey="tab" variant="underline" />
      {tabContent[activeTab]}
    </div>
  );
};

const ResultadoAnalyticsView = () => (
  <CrossFilterProvider>
    <ResultadoPanelInner />
  </CrossFilterProvider>
);

export default ResultadoAnalyticsView;
