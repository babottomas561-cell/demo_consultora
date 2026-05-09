export const formatCurrency = (value) => (
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0)
);

export const formatNumber = (value) => (
  new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(value || 0)
);

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
  if (filters.incluir_anuladas) params.set('incluir_anuladas', 'true');

  arrayFilterKeys.forEach((key) => appendArrayFilter(params, key, filters[key]));

  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

// Legacy helper kept for backwards compatibility
export const withCompanyParam = (user, activeCompany) => (
  user?.is_admin && activeCompany ? `?company_id=${activeCompany.id}` : ''
);
