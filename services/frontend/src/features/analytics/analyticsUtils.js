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

export const withCompanyParam = (user, activeCompany) => (
  user?.is_admin && activeCompany ? `?company_id=${activeCompany.id}` : ''
);
