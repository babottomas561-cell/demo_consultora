import { apiRequest } from "./api";

export async function getDashboardData(days = 30) {
  const [kpis, series, products, customers, sales] = await Promise.all([
    apiRequest("/bi/kpis"),
    apiRequest(`/bi/ventas/serie?days=${days}`),
    apiRequest(`/bi/productos/top?limit=5&days=${days}`),
    apiRequest(`/bi/clientes/top?limit=5&days=${days}`),
    apiRequest(`/bi/ventas?limit=12&days=${days}`),
  ]);

  return { kpis, series, products, customers, sales };
}
