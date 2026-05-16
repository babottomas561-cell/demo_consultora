import { useEffect, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import apiClient from '../api/client';
import useAuthStore from '../store/authStore';
import { useFilterStore } from '../store/filterStore';

const PERIODOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'anio', label: 'Año' },
  { key: 'custom', label: 'Personalizado' },
];

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

function InlineSelect({ label, value, onChange, options, valueKey, labelKey }) {
  return (
    <div className="relative flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        className="appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-2.5 pr-7 text-[13px] font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt[valueKey]} value={opt[valueKey]}>
            {opt[labelKey]}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 text-slate-400" />
    </div>
  );
}

const FilterBar = () => {
  const {
    periodo, desde, hasta, setPeriodo, setCustomRange, setFilter,
    cod_empresa, cod_deposito, cod_lista_precios, cod_vendedor, cod_rubro, cod_cliente,
  } = useFilterStore();
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);

  const [customDesde, setCustomDesde] = useState(desde);
  const [customHasta, setCustomHasta] = useState(hasta);

  const [empresas, setEmpresas] = useState([]);
  const [depositos, setDepositos] = useState([]);
  const [listas, setListas] = useState([]);
  const [rubros, setRubros] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const canFetch = Boolean(user?.company_id || (user?.is_admin && activeCompany));

  useEffect(() => {
    if (!canFetch) return;
    const companyParam = user?.is_admin && activeCompany ? `?company_id=${activeCompany.id}` : '';
    Promise.all([
      apiClient.get(`/analytics/empresas${companyParam}`),
      apiClient.get(`/analytics/depositos${companyParam}`),
      apiClient.get(`/analytics/listas-precios${companyParam}`),
      apiClient.get(`/analytics/rubros${companyParam}`),
      apiClient.get(`/analytics/vendedores-lookup${companyParam}`),
      apiClient.get(`/analytics/clientes-lookup${companyParam}`),
      apiClient.get(`/analytics/proveedores-lookup${companyParam}`),
    ]).then(([eRes, dRes, lRes, rRes, vRes, cRes, pRes]) => {
      setEmpresas(eRes.data?.empresas ?? []);
      setDepositos(dRes.data?.depositos ?? []);
      setListas(lRes.data?.listas ?? []);
      setRubros(rRes.data?.rubros ?? []);
      setVendedores(vRes.data?.vendedores ?? []);
      setClientes(cRes.data?.clientes ?? []);
      setProveedores(pRes.data?.proveedores ?? []);
    }).catch(() => {});
  }, [canFetch, user?.is_admin, activeCompany?.id]);

  const handlePeriodoClick = (key) => {
    if (key === 'custom') {
      setCustomDesde(desde);
      setCustomHasta(hasta);
      setPeriodo('custom');
    } else {
      setPeriodo(key);
    }
  };

  const handleApplyCustom = () => {
    if (customDesde && customHasta) {
      setCustomRange(customDesde, customHasta);
    }
  };

  const selectedEmpresa = cod_empresa?.[0] ?? '';
  const selectedDeposito = cod_deposito?.[0] ?? '';
  const selectedLista = cod_lista_precios?.[0] ?? '';
  const selectedVendedor = cod_vendedor?.[0] ?? '';
  const selectedRubro = cod_rubro?.[0] ?? '';
  const selectedCliente = cod_cliente?.[0] ?? '';

  return (
    <div className="sticky top-0 z-10 -mx-8 -mt-8 mb-6 border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIODOS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePeriodoClick(key)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                periodo === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {empresas.length > 1 && (
            <InlineSelect
              label="Todas las empresas"
              value={selectedEmpresa}
              onChange={(v) => setFilter('cod_empresa', v ? [v] : [])}
              options={empresas}
              valueKey="cod_empresa"
              labelKey="nombre"
            />
          )}
          {vendedores.length > 0 && (
            <InlineSelect
              label="Todos los vendedores"
              value={selectedVendedor}
              onChange={(v) => setFilter('cod_vendedor', v ? [v] : [])}
              options={vendedores}
              valueKey="cod_vendedor"
              labelKey="nombre"
            />
          )}
          {rubros.length > 0 && (
            <InlineSelect
              label="Todos los rubros"
              value={selectedRubro}
              onChange={(v) => setFilter('cod_rubro', v ? [v] : [])}
              options={rubros}
              valueKey="cod_rubro"
              labelKey="nombre"
            />
          )}
          {depositos.length > 0 && (
            <InlineSelect
              label="Todos los depósitos"
              value={selectedDeposito}
              onChange={(v) => setFilter('cod_deposito', v ? [v] : [])}
              options={depositos}
              valueKey="cod_deposito"
              labelKey="nombre"
            />
          )}
          {listas.length > 0 && (
            <InlineSelect
              label="Todas las listas"
              value={selectedLista}
              onChange={(v) => setFilter('cod_lista_precios', v ? [v] : [])}
              options={listas}
              valueKey="cod_lista"
              labelKey="descripcion"
            />
          )}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Calendar size={14} className="text-slate-400" />
            <span>{formatDateDisplay(desde)} — {formatDateDisplay(hasta)}</span>
          </div>
        </div>
      </div>

      {periodo === 'custom' && (
        <div className="flex items-center gap-3 pb-3">
          <input
            type="date"
            value={customDesde}
            onChange={(e) => setCustomDesde(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-slate-400 text-sm">—</span>
          <input
            type="date"
            value={customHasta}
            onChange={(e) => setCustomHasta(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleApplyCustom}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
