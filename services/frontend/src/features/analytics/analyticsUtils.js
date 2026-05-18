const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const formatCurrency = (value) => (
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toFiniteNumber(value))
);

export const formatNumber = (value) => (
  new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(toFiniteNumber(value))
);

// Abbreviated formatters for KPI cards where space is limited
export const formatCurrencyShort = (value) => {
  const n = toFiniteNumber(value);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
  if (abs >= 1_000_000)     return `${sign}$${(abs / 1_000_000).toLocaleString('es-AR',     { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  return formatCurrency(n);
};

export const formatNumberShort = (value) => {
  const n = toFiniteNumber(value);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
  if (abs >= 1_000_000)     return `${sign}${(abs / 1_000_000).toLocaleString('es-AR',     { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  return formatNumber(n);
};

const arrayFilterKeys = [
  'cod_empresa',
  'tag',
  'punto_de_venta',
  'cod_vendedor',
  'cod_rubro',
  'cod_subrubro',
  'tipo_comprobante',
  'condicion_venta',
  'cod_cliente',
  'cod_articulo',
  'cod_deposito',
  'cod_lista_precios',
];

const appendArrayFilter = (params, key, values) => {
  if (!Array.isArray(values) || values.length === 0) return;
  values.forEach((value) => {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, value);
    }
  });
};

export const buildQueryParams = (user, activeCompany, filtersOrDesde, hastaArg) => {
  const filters = typeof filtersOrDesde === 'object' && filtersOrDesde !== null
    ? filtersOrDesde
    : { desde: filtersOrDesde, hasta: hastaArg };
  const params = new URLSearchParams();

  if (user?.is_admin && activeCompany) {
    params.set('company_id', activeCompany.id);
  }
  if (filters.desde) params.set('desde', filters.desde);
  if (filters.hasta) params.set('hasta', filters.hasta);
  if (filters.comparar_anterior) params.set('comparar_anterior', 'true');
  if (filters.compare_mode && filters.compare_mode !== 'anterior') params.set('compare_mode', filters.compare_mode);
  if (filters.incluir_anuladas) params.set('incluir_anuladas', 'true');

  arrayFilterKeys.forEach((key) => appendArrayFilter(params, key, filters[key]));

  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const appendQueryParams = (queryString = '', params = {}) => {
  const search = new URLSearchParams(queryString.startsWith('?') ? queryString.slice(1) : queryString);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      search.set(key, value);
    }
  });

  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

const flattenRecord = (value, prefix = '') => {
  if (!value || typeof value !== 'object' || value instanceof Date || Array.isArray(value)) {
    return { [prefix || 'valor']: value };
  }

  return Object.entries(value).reduce((acc, [key, item]) => {
    const nextKey = prefix ? `${prefix}_${key}` : key;
    if (item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date)) {
      Object.assign(acc, flattenRecord(item, nextKey));
    } else {
      acc[nextKey] = item;
    }
    return acc;
  }, {});
};

const rowsFromValue = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.series)) return value.series;
  if (Array.isArray(value.ranking)) return value.ranking;
  if (Array.isArray(value.productos)) return value.productos;
  if (Array.isArray(value.vendedores)) return value.vendedores;
  if (Array.isArray(value.clientes)) return value.clientes;
  if (Array.isArray(value.proveedores)) return value.proveedores;
  if (Array.isArray(value.data)) return value.data;
  if (Array.isArray(value.rows)) return value.rows;
  if (typeof value === 'object') return [value];
  return [{ valor: value }];
};

export const buildExportData = (sheets) => (
  Object.entries(sheets).reduce((acc, [name, value]) => {
    const rows = rowsFromValue(value).map((row) => flattenRecord(row));
    if (rows.length > 0) acc[name] = rows;
    return acc;
  }, {})
);

// Legacy helper kept for backwards compatibility
export const withCompanyParam = (user, activeCompany) => (
  user?.is_admin && activeCompany ? `?company_id=${activeCompany.id}` : ''
);
