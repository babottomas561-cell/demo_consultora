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

  const activeFilterCount = [selectedEmpresa, selectedDeposito, selectedLista, selectedVendedor, selectedRubro, selectedCliente].filter(Boolean).length;

  return (
    <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:-mx-6 sm:-mt-6 sm:mb-6 sm:px-6 lg:-mx-8 lg:-mt-8 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2.5">
        {/* Períodos */}
        <div className="flex flex-wrap items-center gap-1">
          {PERIODOS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePeriodoClick(key)}
              className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:text-[13px] sm:px-3 ${
                periodo === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filtros y fecha */}
        <div className="flex flex-wrap items-center gap-2">
          {empresas.length > 1 && (
            <InlineSelect
              label="Empresa"
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
              label="Depósito"
              value={selectedDeposito}
              onChange={(v) => setFilter('cod_deposito', v ? [v] : [])}
              options={depositos}
              valueKey="cod_deposito"
              labelKey="nombre"
            />
          )}
          {listas.length > 0 && (
            <InlineSelect
              label="Lista"
              value={selectedLista}
              onChange={(v) => setFilter('cod_lista_precios', v ? [v] : [])}
              options={listas}
              valueKey="cod_lista"
              labelKey="descripcion"
            />
          )}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Calendar size={13} className="text-slate-400" />
            <span className="hidden sm:inline">{formatDateDisplay(desde)} — {formatDateDisplay(hasta)}</span>
            <span className="sm:hidden">{formatDateDisplay(desde).slice(0, 5)}</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {activeFilterCount}
              </span>
            )}
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
