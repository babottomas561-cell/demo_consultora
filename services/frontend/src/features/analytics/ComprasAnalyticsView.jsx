import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Loader2, RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import apiClient from '../../api/client';
import useAuthStore from '../../store/authStore';
import { useFilterStore } from '../../store/filterStore';
import FilterBar from '../../components/FilterBar';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { buildQueryParams, formatCurrency, formatNumber } from './analyticsUtils';
import PanelTabs from './components/PanelTabs';
import { CrossFilterProvider, useCrossFilter } from './components/CrossFilterProvider';
import { DrillThroughBreadcrumbs, ExportButton, PeriodComparator, SavedViews } from './components/AnalyticsControls';

const tabs = [
  { id: 'temporal', label: 'Temporal' },
  { id: 'productos', label: 'Productos' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'calendario', label: 'Calendario de pagos' },
  { id: 'precios', label: 'Variación de precios' },
  { id: 'transacciones', label: 'Detalle transacciones' },
];

const granularidades = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'trimestre', label: 'Trimestre' },
];

const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const formatYAxis = (value) => {
  const numeric = Number(value || 0);
  if (Math.abs(numeric) >= 1000000) return `$${(numeric / 1000000).toFixed(1)}M`;
  if (Math.abs(numeric) >= 1000) return `$${(numeric / 1000).toFixed(0)}K`;
  return `$${numeric}`;
};

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const formatDateTick = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${monthLabels[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-AR');
};

const variationTone = (value) => {
  const numeric = Number(value || 0);
  if (numeric > 0) return 'text-emerald-700';
  if (numeric < 0) return 'text-red-700';
  return 'text-slate-500';
};

const KpiCard = ({ label, metric, tone = 'default', money = false, number = false, badge = null }) => {
  const palette = {
    default: 'border-t-indigo-600 bg-indigo-50 text-indigo-700',
    slate: 'border-t-slate-500 bg-slate-50 text-slate-700',
    success: 'border-t-emerald-600 bg-emerald-50 text-emerald-700',
    warning: 'border-t-amber-500 bg-amber-50 text-amber-700',
    danger: 'border-t-red-600 bg-red-50 text-red-700',
    orange: 'border-t-orange-500 bg-orange-50 text-orange-700',
  }[tone];
  const actual = metric?.actual || 0;
  const value = money ? formatCurrency(actual) : number ? formatNumber(actual) : actual;

  return (
    <Card className={`min-h-[136px] border-t-[3px] p-5 ${palette?.split(' ')[0] || 'border-t-indigo-600'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-slate-500" title={label}>{label}</p>
        {badge && (
          <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span>
        )}
      </div>
      <div className={`mt-3 inline-flex rounded-lg px-3 py-1 ${palette?.split(' ').slice(1).join(' ')}`}>
        <span className="text-xl font-bold tabular-nums">{value}</span>
      </div>
      {metric?.variacion_pct !== undefined && metric?.variacion_pct !== null && (
        <p className={`mt-4 text-xs font-semibold ${variationTone(metric.variacion_pct)}`}>
          {metric.variacion_pct > 0 ? '↑' : metric.variacion_pct < 0 ? '↓' : '→'} {Math.abs(metric.variacion_pct).toFixed(1)}% vs período anterior
        </p>
      )}
    </Card>
  );
};

const DataTable = ({ title, rows, columns, onRowClick, emptyLabel = 'Sin datos para mostrar.' }) => (
  <Card className="overflow-hidden">
    <div className="border-b border-slate-200 px-5 py-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    </div>
    {rows?.length ? (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="border-b border-slate-200 px-5 py-3 text-left text-xs font-semibold text-slate-600">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr
                key={`${title}-${index}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer hover:bg-indigo-50/60' : 'hover:bg-slate-50'}
              >
                {columns.map((column) => (
                  <td key={column.key} className="border-b border-slate-100 px-5 py-3 text-slate-700">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="px-5 py-8 text-sm text-slate-500">{emptyLabel}</div>
    )}
  </Card>
);

const ProgressBar = ({ value, color = '#4f46e5' }) => (
  <div className="flex items-center gap-2">
    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${Math.min(Number(value || 0), 100)}%`, backgroundColor: color }} />
    </div>
    <span className="w-12 text-right text-xs font-medium text-slate-500">{formatPercent(value)}</span>
  </div>
);

const ComprasContent = () => {
  const user = useAuthStore((state) => state.user);
  const activeCompany = useAuthStore((state) => state.activeCompany);
  const filterState = useFilterStore((state) => state.getApiFilters());
  const compararAnterior = useFilterStore((state) => state.comparar_anterior);
  const { filters: crossFilters, setFilter, clearFilter, clearAll } = useCrossFilter();

  const [activeTab, setActiveTab] = useState('temporal');
  const [granularidad, setGranularidad] = useState('mes');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    kpis: null,
    temporal: [],
    productos: [],
    proveedores: [],
    vencimientos: [],
    precios: [],
    transacciones: { data: [], total: 0, page: 1, limit: 50 },
  });

  const filters = useMemo(() => filterState, [filterState]);

  const query = useMemo(() => buildQueryParams(user, activeCompany, filters), [user, activeCompany, filters]);

  const loadData = useCallback(async () => {
    if (!(user?.company_id || (user?.is_admin && activeCompany))) return;
    setLoading(true);
    setError(null);
    try {
      const sep = query ? '&' : '?';
      const [kpis, temporal, productos, proveedores, calendario, precios, transacciones] = await Promise.all([
        apiClient.get(`/analytics/compras/kpis${query}`),
        apiClient.get(`/analytics/compras/temporal${query}${sep}granularidad=${granularidad}`),
        apiClient.get(`/analytics/compras/por-producto${query}`),
        apiClient.get(`/analytics/compras/por-proveedor${query}`),
        apiClient.get(`/analytics/compras/calendario-pagos${query}`),
        apiClient.get(`/analytics/compras/variacion-precios${query}`),
        apiClient.get(`/analytics/compras/transacciones${query}`),
      ]);
      setData({
        kpis: kpis.data,
        temporal: temporal.data.series || [],
        productos: productos.data.productos || [],
        proveedores: proveedores.data.proveedores || [],
        vencimientos: calendario.data.vencimientos || [],
        precios: precios.data.productos || [],
        transacciones: transacciones.data,
      });
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de compras.');
    } finally {
      setLoading(false);
    }
  }, [activeCompany, granularidad, query, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const sep = query ? '&' : '?';
      const response = await apiClient.get(`/analytics/compras/exportar${query}${sep}granularidad=${granularidad}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'compras_analytics.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (user?.is_admin && !activeCompany) {
    return (
      <div className="py-20 text-center">
        <CalendarDays className="mx-auto text-slate-400" size={40} />
        <h2 className="mt-4 text-xl font-bold text-slate-900">Seleccioná una empresa</h2>
        <p className="mt-2 text-slate-500">El panel de compras lee datos del schema tenant activo.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={22} />
        Cargando panel compras
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4">
        <span className="text-sm font-medium text-red-800">{error}</span>
        <Button variant="secondary" size="sm" onClick={loadData}>
          <RefreshCw size={14} />
          Reintentar
        </Button>
      </div>
    );
  }

  const calendarioGrupos = {
    hoy: data.vencimientos.filter((row) => row.urgencia === 'hoy'),
    semana: data.vencimientos.filter((row) => row.urgencia === 'semana'),
    mes: data.vencimientos.filter((row) => row.urgencia === 'mes'),
    futuro: data.vencimientos.filter((row) => row.urgencia === 'futuro'),
  };
  const proveedoresVisibles = crossFilters.proveedor
    ? data.proveedores.filter((row) => row.proveedor_id === crossFilters.proveedor.id)
    : data.proveedores;
  const sumVencimientos = (rows) => rows.reduce((acc, row) => acc + Number(row.importe || 0), 0);
  const alertasPrecios = data.precios.filter((row) => Number(row.variacion_pct || 0) > 30);

  return (
    <div className="space-y-6">
      <FilterBar />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-900">Panel Compras</h1>
          <p className="mt-1 text-sm text-slate-500">Compras, proveedores, vencimientos y variación de precios.</p>
          <div className="mt-3">
            <PeriodComparator active={compararAnterior} />
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <SavedViews />
          <ExportButton onClick={handleExport} loading={exporting} />
        </div>
      </div>

      <DrillThroughBreadcrumbs filters={crossFilters} onClear={clearFilter} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total comprado" metric={data.kpis?.total_comprado} money />
        <KpiCard label="IVA crédito fiscal" metric={data.kpis?.iva_credito_fiscal} tone="slate" money />
        <KpiCard label="Órdenes de compra" metric={data.kpis?.ordenes} number />
        <KpiCard label="Ticket promedio compra" metric={data.kpis?.ticket_promedio_compra} tone="success" money />
        <KpiCard label="Proveedores activos" metric={data.kpis?.proveedores_activos} tone="warning" number />
        <KpiCard label="Deuda vencida a proveedores" metric={data.kpis?.deuda_vencida} tone={(data.kpis?.deuda_vencida?.actual || 0) > 0 ? 'danger' : 'success'} money badge={(data.kpis?.deuda_vencida?.actual || 0) > 0 ? 'CRÍTICO' : null} />
        <KpiCard label="Próximos vencimientos 30d" metric={data.kpis?.proximos_vencimientos_30d} tone="orange" money />
        <KpiCard label="Unidades compradas" metric={data.kpis?.unidades_compradas} tone="slate" number />
      </div>

      <PanelTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="underline" />

      {activeTab === 'temporal' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {granularidades.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setGranularidad(item.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  granularidad === item.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Card className="p-5">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.temporal}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="periodo" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={formatDateTick} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={formatYAxis} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                  <Tooltip formatter={(value, name) => (name === 'ordenes' ? [formatNumber(value), 'Órdenes'] : [formatCurrency(value), name])} />
                  <Bar yAxisId="left" dataKey="total_comprado" fill="#0f766e" name="Total comprado" radius={[4, 4, 0, 0]} />
                  {compararAnterior && <Bar yAxisId="left" dataKey="total_comprado_anterior" fill="#cbd5e1" name="Período anterior" radius={[4, 4, 0, 0]} />}
                  <Line yAxisId="right" dataKey="ordenes" stroke="#f97316" name="Órdenes" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-5 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-[3px] bg-teal-700" /> Total comprado</span>
              <span className="inline-flex items-center gap-2"><span className="h-px w-7 border-t border-dashed border-orange-500" /> Órdenes</span>
              {compararAnterior && <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-[3px] bg-slate-300" /> Período anterior</span>}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'productos' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
          <DataTable
            title="Productos comprados"
            rows={data.productos}
            columns={[
              { key: 'nombre', label: 'Producto' },
              { key: 'unidades', label: 'Unidades', render: (row) => formatNumber(row.unidades) },
              { key: 'total_comprado', label: 'Total comprado', render: (row) => formatCurrency(row.total_comprado) },
              { key: 'pct_total', label: '% Total', render: (row) => <ProgressBar value={row.pct_total} color="#0f766e" /> },
              { key: 'precio_promedio', label: 'Precio prom.', render: (row) => formatCurrency(row.precio_promedio) },
              { key: 'ultimo_precio', label: 'Último precio', render: (row) => formatCurrency(row.ultimo_precio) },
              { key: 'variacion_precio_pct', label: 'Var. precio', render: (row) => formatPercent(row.variacion_precio_pct) },
              { key: 'proveedores_distintos', label: 'Proveedores', render: (row) => formatNumber(row.proveedores_distintos) },
            ]}
          />
          <Card className="p-5">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Pareto de compras</h3>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.productos.slice(0, 12)} layout="vertical" margin={{ left: 16, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={formatYAxis} />
                  <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="total_comprado" fill="#0f766e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'proveedores' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {proveedoresVisibles.slice(0, 6).map((proveedor) => (
              <button
                key={proveedor.proveedor_id}
                type="button"
                onClick={() => setFilter('proveedor', { id: proveedor.proveedor_id, label: proveedor.proveedor_nombre })}
                className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">{proveedor.proveedor_nombre}</h3>
                  <Badge tone="brand">{formatPercent(proveedor.pct_total)}</Badge>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(proveedor.total_comprado)}</p>
                <p className="mt-1 text-sm text-slate-500">{formatNumber(proveedor.ordenes)} órdenes · Último pedido {formatDate(proveedor.ultimo_pedido)}</p>
                <p className="mt-1 text-xs text-slate-400">Hace {formatNumber(proveedor.dias_desde_ultimo_pedido)} días</p>
              </button>
            ))}
          </div>
          <DataTable
            title="Ranking de proveedores"
            rows={proveedoresVisibles}
            onRowClick={(row) => setFilter('proveedor', { id: row.proveedor_id, label: row.proveedor_nombre })}
            columns={[
              { key: 'proveedor_nombre', label: 'Proveedor' },
              { key: 'total_comprado', label: 'Total comprado', render: (row) => formatCurrency(row.total_comprado) },
              { key: 'ordenes', label: 'Órdenes', render: (row) => formatNumber(row.ordenes) },
              { key: 'pct_total', label: '% Total', render: (row) => <ProgressBar value={row.pct_total} color="#0f766e" /> },
              { key: 'precio_promedio_variacion', label: 'Var. precio prom.', render: (row) => formatPercent(row.precio_promedio_variacion) },
              { key: 'ultimo_pedido', label: 'Último pedido', render: (row) => formatDate(row.ultimo_pedido) },
            ]}
          />
          {crossFilters.proveedor && (
            <Button variant="ghost" size="sm" onClick={clearAll}>Limpiar filtro de proveedor</Button>
          )}
        </div>
      )}

      {activeTab === 'calendario' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard label="A pagar hoy" metric={{ actual: sumVencimientos(calendarioGrupos.hoy) }} tone="danger" money />
            <KpiCard label="A pagar esta semana" metric={{ actual: sumVencimientos(calendarioGrupos.semana) }} tone="orange" money />
            <KpiCard label="A pagar este mes" metric={{ actual: sumVencimientos(calendarioGrupos.mes) }} tone="warning" money />
          </div>
          <div className="flex justify-end">
            <ExportButton onClick={handleExport} loading={exporting} label="Exportar calendario" />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            {[
              ['hoy', 'HOY', 'border-red-200 bg-red-50 text-red-700'],
              ['semana', 'ESTA SEMANA', 'border-orange-200 bg-orange-50 text-orange-700'],
              ['mes', 'ESTE MES', 'border-amber-200 bg-amber-50 text-amber-700'],
              ['futuro', 'MÁS ADELANTE', 'border-emerald-200 bg-emerald-50 text-emerald-700'],
            ].map(([key, label, tone]) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</h3>
                <div className="space-y-3">
                  {calendarioGrupos[key].length ? calendarioGrupos[key].map((item, index) => (
                    <div key={`${key}-${index}`} className={`rounded-lg border p-3 ${tone}`}>
                      <p className="text-sm font-semibold">{item.proveedor_nombre}</p>
                      <p className="mt-1 text-lg font-bold">{formatCurrency(item.importe)}</p>
                      <p className="text-xs opacity-80">{formatDate(item.fecha_vencimiento)} · {item.dias_para_vencer} días</p>
                    </div>
                  )) : <p className="text-sm text-slate-400">Sin vencimientos.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'precios' && (
        <div className="space-y-4">
          {alertasPrecios.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
              <AlertTriangle size={18} />
              {alertasPrecios.length} productos subieron más de 30% en el período.
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
            <DataTable
              title="Variación de precios"
              rows={data.precios}
              columns={[
                { key: 'nombre', label: 'Producto' },
                { key: 'precio_inicio_periodo', label: 'Precio inicio', render: (row) => formatCurrency(row.precio_inicio_periodo) },
                { key: 'precio_fin_periodo', label: 'Precio fin', render: (row) => formatCurrency(row.precio_fin_periodo) },
                { key: 'variacion_pct', label: 'Variación', render: (row) => <Badge tone={(row.variacion_pct || 0) > 20 ? 'danger' : 'default'}>{formatPercent(row.variacion_pct)}</Badge> },
                { key: 'proveedor_nombre', label: 'Proveedor' },
                { key: 'ultimo_proveedor', label: 'Último proveedor' },
              ]}
            />
            <Card className="p-5">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Subas por producto</h3>
              <div className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.precios.slice(0, 14)} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tickFormatter={formatPercent} />
                    <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip formatter={(value) => formatPercent(value)} />
                    <Bar dataKey="variacion_pct" fill="#dc2626" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'transacciones' && (
        data.transacciones?.data?.length ? (
          <DataTable
            title={`Detalle transacciones (${formatNumber(data.transacciones.total)})`}
            rows={data.transacciones.data}
            columns={[
              { key: 'id', label: 'ID' },
              { key: 'fecha', label: 'Fecha', render: (row) => formatDate(row.fecha) },
              { key: 'proveedor_nombre', label: 'Proveedor' },
              { key: 'producto_nombre', label: 'Producto' },
              { key: 'cantidad', label: 'Cantidad', render: (row) => formatNumber(row.cantidad) },
              { key: 'precio_unitario', label: 'Precio unit', render: (row) => formatCurrency(row.precio_unitario) },
              { key: 'total', label: 'Total', render: (row) => formatCurrency(row.total) },
              { key: 'iva', label: 'IVA', render: (row) => formatCurrency(row.iva) },
            ]}
          />
        ) : (
          <EmptyState title="Sin transacciones" description="No hay compras para el rango y filtros seleccionados." />
        )
      )}
    </div>
  );
};

const ComprasAnalyticsView = () => (
  <CrossFilterProvider>
    <ComprasContent />
  </CrossFilterProvider>
);

export default ComprasAnalyticsView;
