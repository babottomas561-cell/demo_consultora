import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../../api/client';
import useAuthStore from '../../store/authStore';

let cachedKpis = null;
let cachedTopClientes = null;
let lastFetchTime = 0;
const CACHE_TTL = 30_000;

export function useDashboardData() {
  const user = useAuthStore(s => s.user);
  const activeCompany = useAuthStore(s => s.activeCompany);
  const [kpis, setKpis] = useState(cachedKpis);
  const [topClientes, setTopClientes] = useState(cachedTopClientes || []);
  const [loading, setLoading] = useState(!cachedKpis);

  const queryParam = (user?.is_admin && activeCompany) ? `?company_id=${activeCompany.id}` : '';

  const fetchData = useCallback(async () => {
    if (Date.now() - lastFetchTime < CACHE_TTL && cachedKpis) {
      setKpis(cachedKpis);
      setTopClientes(cachedTopClientes || []);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [kpiRes, topRes] = await Promise.all([
        apiClient.get(`/dashboard/kpis${queryParam}`),
        apiClient.get(`/dashboard/top-clientes${queryParam}`),
      ]);
      cachedKpis = kpiRes.data;
      cachedTopClientes = topRes.data;
      lastFetchTime = Date.now();
      setKpis(kpiRes.data);
      setTopClientes(topRes.data);
    } catch (e) {
      console.error('Dashboard data fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [queryParam]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { kpis, topClientes, loading, refetch: fetchData };
}

export function useAnalyticsData(endpoint) {
  const user = useAuthStore(s => s.user);
  const activeCompany = useAuthStore(s => s.activeCompany);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const companyParam = (user?.is_admin && activeCompany) ? `&company_id=${activeCompany.id}` : '';
    const now = new Date();
    const desde = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);
    const hasta = now.toISOString().slice(0, 10);
    const url = `/analytics${endpoint}${endpoint.includes('?') ? '&' : '?'}desde=${desde}&hasta=${hasta}${companyParam}`;

    apiClient.get(url)
      .then(res => setData(res.data))
      .catch(e => console.error(`Analytics fetch error: ${endpoint}`, e))
      .finally(() => setLoading(false));
  }, [endpoint, user, activeCompany]);

  return { data, loading };
}
