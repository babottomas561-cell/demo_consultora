import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../../../api/client';
import useAuthStore from '../../../store/authStore';
import { useFilterStore } from '../../../store/filterStore';

export function useInfomanagerFetch(endpoint, buildParams) {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore = useFilterStore();
  const canFetch = Boolean(user?.company_id || (user?.is_admin && activeCompany));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const controllerRef = useRef(null);

  const fetch = useCallback(async () => {
    if (!canFetch) return;
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (user?.is_admin && activeCompany) params.set('company_id', activeCompany.id);
      if (buildParams) {
        const extra = buildParams(filterStore);
        Object.entries(extra).forEach(([k, v]) => {
          if (v !== null && v !== undefined && v !== '') params.set(k, v);
        });
      }
      const qs = params.toString();
      const res = await apiClient.get(`/analytics/${endpoint}${qs ? `?${qs}` : ''}`, {
        signal: controller.signal,
      });
      setData(res.data);
    } catch (err) {
      if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
        setError('Error al cargar los datos.');
      }
    } finally {
      setLoading(false);
    }
  }, [canFetch, endpoint, user?.is_admin, activeCompany?.id,
    filterStore.desde, filterStore.hasta,
    filterStore.cod_empresa?.join(','),
    filterStore.cod_deposito?.join(','),
    filterStore.cod_lista_precios?.join(','),
  ]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
