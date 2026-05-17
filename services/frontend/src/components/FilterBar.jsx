import { useEffect, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import apiClient from '../api/client';
import useAuthStore from '../store/authStore';
import { useFilterStore } from '../store/filterStore';

const PERIODOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Sem.' },
  { key: 'mes', label: 'Mes' },
  { key: 'trimestre', label: 'Trim.' },
  { key: 'anio', label: 'Año' },
  { key: 'custom', label: 'Custom' },
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
        className="appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-2 pr-6 text-[12px] font-medium text-slate-600 shadow-sm transition-colors hover:border-slate-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:pl-2.5 sm:pr-7 sm:text-[13px]"
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt[valueKey]} value={opt[valueKey]}>
            {opt[labelKey]}
          </option>
        ))}
      </select>
      <ChevronDown size={11} className="pointer-events-none absolute right-1.5 text-slate-400 sm:right-2" />
    </div>
  );
}

const FilterBar = () => {
  const {
    periodo, desde, hasta, setPeriodo, setCustomRange, setFilter,
    cod_empresa, cod_deposito, cod_lista_precios, cod_vendedor, cod_rubro,
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
    ]).then(([eRes, dRes, lRes, rRes, vRes]) => {
      setEmpresas(eRes.data?.empresas ?? []);
      setDepositos(dRes.data?.depositos ?? []);
      setListas(lRes.data?.listas ?? []);
      setRubros(rRes.data?.rubros ?? []);
      setVendedores(vRes.data?.vendedores ?? []);
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

  return (
    <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-slate-200 bg-white shadow-sm sm:-mx-6 sm:-mt-6 sm:mb-6 lg:-mx-8 lg:-mt-8">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5 sm:px-6 sm:py-3 lg:px-6">
        <div className="flex flex-wrap items-center gap-1">
          {PERIODOS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePeriodoClick(key)}
              className={`rounded-md px-2 py-1 text-[12px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:px-3 sm:py-1.5 sm:text-[13px] ${
                periodo === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {empresas.length > 1 && (
            <InlineSelect
              label="Empresas"
              value={selectedEmpresa}
              onChange={(v) => setFilter('cod_empresa', v ? [v] : [])}
              options={empresas}
              valueKey="cod_empresa"
              labelKey="nombre"
            />
          )}
          {vendedores.length > 0 && (
            <InlineSelect
              label="Vendedor"
              value={selectedVendedor}
              onChange={(v) => setFilter('cod_vendedor', v ? [v] : [])}
              options={vendedores}
              valueKey="cod_vendedor"
              labelKey="nombre"
            />
          )}
          {rubros.length > 0 && (
            <InlineSelect
              label="Rubro"
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
          <div className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 sm:flex">
            <Calendar size={13} className="text-slate-400" />
            <span>{formatDateDisplay(desde)} — {formatDateDisplay(hasta)}</span>
          </div>
        </div>
      </div>

      {periodo === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-3 py-2 sm:px-6 sm:py-3">
          <input
            type="date"
            value={customDesde}
            onChange={(e) => setCustomDesde(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:flex-none"
          />
          <span className="text-sm text-slate-400">—</span>
          <input
            type="date"
            value={customHasta}
            onChange={(e) => setCustomHasta(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:flex-none"
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
