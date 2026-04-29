import { apiRequest } from "./api";

export async function getDashboardData() {
  const [kpis, series, products, customers, sales] = await Promise.all([
    apiRequest("/api/demo/kpis"),
    apiRequest("/api/demo/ventas/serie?days=30"),
    apiRequest("/api/demo/productos/top?limit=5"),
    apiRequest("/api/demo/clientes/top?limit=5"),
    apiRequest("/api/demo/ventas?limit=12"),
  ]);

  return { kpis, series, products, customers, sales };
}
