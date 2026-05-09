import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

import apiClient from '../../api/client';
import useAuthStore from '../../store/authStore';
import { useFilterStore } from '../../store/filterStore';
import FilterBar from '../../components/FilterBar';
import { formatCurrency, buildQueryParams } from './analyticsUtils';

const formatYAxis = (value) => {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

const tooltipFormatter = (value) => [`$${Number(value || 0).toLocaleString('es-AR')}`, ''];

const KpiCard = ({ label, value, tone = 'default', subtitle }) => {
  const toneClass = tone === 'danger' ? 'text-red-700 bg-red-50' : tone === 'success' ? 'text-emerald-700 bg-emerald-50' : tone === 'warning' ? 'text-amber-700 bg-amber-50' : 'text-indigo-700 bg-indigo-50';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className={`mt-3 inline-flex px-3 py-1 rounded-lg ${toneClass}`}>
        <span className="text-xl font-bold">{value}</span>
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};

const ProgressBar = ({ value, max, color = '#4f46e5' }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-medium text-slate-500 w-12 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
};

const Badge = ({ text, tone = 'default' }) => {
  const cls = tone === 'danger' ? 'bg-red-100 text-red-700' : tone === 'success' ? 'bg-emerald-100 text-emerald-700' : tone === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{text}</span>;
};

const DataTable = ({ title, rows, columns, emptyLabel = 'Sin datos para mostrar.' }) => (
  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-200">
      <h3 className="font-semibold text-slate-900">{title}</h3>
    </div>
    {rows?.length ? (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-5 py-3 text-left font-semibold text-slate-600">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-5 py-3 text-slate-700">
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
  </div>
);

const SeriesChart = ({ data, bars, lines, title, yAxisRight, customTooltip }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
    {title && <h3 className="font-semibold text-slate-900 mb-4">{title}</h3>}
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data || []}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="periodo" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={formatYAxis} />
          {yAxisRight && (
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
          )}
          <Tooltip formatter={customTooltip || tooltipFormatter} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
          {(bars || []).map((bar) => (
            <Bar key={bar.key} yAxisId="left" dataKey={bar.key} fill={bar.color} name={bar.label} radius={[4, 4, 0, 0]} stackId={bar.stack} />
          ))}
          {(lines || []).map((line) => (
            <Line key={line.key} yAxisId={line.yAxisId || 'left'} type="monotone" dataKey={line.key} stroke={line.color} name={line.label} strokeWidth={2} dot={false} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const DonutChart = ({ data, title }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
    {title && <h3 className="font-semibold text-slate-900 mb-4">{title}</h3>}
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend formatter={(value) => <span className="text-sm text-slate-600">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const AnalyticsPage = ({ title, description, endpoint, buildView }) => {
  const user = useAuthStore((state) => state.user);
  const activeCompany = useAuthStore((state) => state.activeCompany);
  const periodo = useFilterStore((state) => state.periodo);
  const desde = useFilterStore((state) => state.desde);
  const hasta = useFilterStore((state) => state.hasta);
  const compararAnterior = useFilterStore((state) => state.comparar_anterior);
  const codEmpresa = useFilterStore((state) => state.cod_empresa);
  const tag = useFilterStore((state) => state.tag);
  const puntoDeVenta = useFilterStore((state) => state.punto_de_venta);
  const codVendedor = useFilterStore((state) => state.cod_vendedor);
  const codRubro = useFilterStore((state) => state.cod_rubro);
  const codSubrubro = useFilterStore((state) => state.cod_subrubro);
  const tipoComprobante = useFilterStore((state) => state.tipo_comprobante);
  const condicionVenta = useFilterStore((state) => state.condicion_venta);
  const codCliente = useFilterStore((state) => state.cod_cliente);
  const codArticulo = useFilterStore((state) => state.cod_articulo);
  const codDeposito = useFilterStore((state) => state.cod_deposito);
  const incluirAnuladas = useFilterStore((state) => state.incluir_anuladas);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filters = useMemo(() => ({
    periodo,
    desde,
    hasta,
    comparar_anterior: compararAnterior,
    cod_empresa: codEmpresa,
    tag,
    punto_de_venta: puntoDeVenta,
    cod_vendedor: codVendedor,
    cod_rubro: codRubro,
    cod_subrubro: codSubrubro,
    tipo_comprobante: tipoComprobante,
    condicion_venta: condicionVenta,
    cod_cliente: codCliente,
    cod_articulo: codArticulo,
    cod_deposito: codDeposito,
    incluir_anuladas: incluirAnuladas,
  }), [
    periodo,
    desde,
    hasta,
    compararAnterior,
    codEmpresa,
    tag,
    puntoDeVenta,
    codVendedor,
    codRubro,
    codSubrubro,
    tipoComprobante,
    condicionVenta,
    codCliente,
    codArticulo,
    codDeposito,
    incluirAnuladas,
  ]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildQueryParams(user, activeCompany, filters);
      const response = await apiClient.get(`${endpoint}${qs}`);
      setData(response.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel analítico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((user?.company_id) || (user?.is_admin && activeCompany)) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user, activeCompany, endpoint, filters]);

  if (user?.is_admin && !activeCompany) {
    return (
      <div className="py-20 text-center">
        <Activity className="mx-auto text-slate-400" size={40} />
        <h2 className="mt-4 text-xl font-bold text-slate-900">Seleccioná una empresa</h2>
        <p className="mt-2 text-slate-500">Los paneles analíticos leen datos del schema tenant activo.</p>
        <Link to="/admin/companies" className="mt-6 inline-flex px-4 py-2 bg-indigo-600 text-white rounded-lg">
          Elegir empresa
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center text-slate-500">
        <Loader2 className="animate-spin mr-2" size={22} />
        Cargando panel
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
        <button onClick={loadData} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-200 rounded-lg text-red-700">
          <RefreshCw size={16} />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FilterBar />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 mt-1">{description}</p>
      </div>
      {buildView(data || {}, { KpiCard, DataTable, SeriesChart, DonutChart, ProgressBar, Badge })}
    </div>
  );
};

export default AnalyticsPage;
