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

export const buildQueryParams = (user, activeCompany, desde, hasta) => {
  const params = new URLSearchParams();
  if (user?.is_admin && activeCompany) {
    params.set('company_id', activeCompany.id);
  }
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

// Legacy helper kept for backwards compatibility
export const withCompanyParam = (user, activeCompany) => (
  user?.is_admin && activeCompany ? `?company_id=${activeCompany.id}` : ''
);
