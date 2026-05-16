import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../../../api/client';
import useAuthStore from '../../../store/authStore';
import { useFilterStore } from '../../../store/filterStore';
import { buildQueryParams } from '../analyticsUtils';

const StockDataContext = createContext(null);

export function useStockData() {
  const ctx = useContext(StockDataContext);
  if (!ctx) throw new Error('useStockData must be used within StockDataProvider');
  return ctx;
}

export default function StockDataProvider({ children }) {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore = useFilterStore();

  const filters = useMemo(
    () => filterStore.getApiFilters(),
    [filterStore.periodo, filterStore.desde, filterStore.hasta,
     filterStore.cod_empresa, filterStore.cod_deposito, filterStore.cod_rubro]
  );

  const qs = buildQueryParams(user, activeCompany, filters);
  const canFetch = user?.company_id || (user?.is_admin && activeCompany);

  const [kpis, setKpis] = useState(null);
  const [inventario, setInventario] = useState(null);
  const [movimientos, setMovimientos] = useState(null);
  const [rotacion, setRotacion] = useState(null);
  const [alertas, setAlertas] = useState(null);
  const [reposicion, setReposicion] = useState(null);

  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingInventario, setLoadingInventario] = useState(true);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [loadingRotacion, setLoadingRotacion] = useState(false);
  const [loadingAlertas, setLoadingAlertas] = useState(false);
  const [loadingReposicion, setLoadingReposicion] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrimary = useCallback(async () => {
    if (!canFetch) { setLoadingKpis(false); setLoadingInventario(false); return; }
    setLoadingKpis(true); setLoadingInventario(true);
    setError(null);
    try {
      const [kR, iR] = await Promise.all([
        apiClient.get(`/analytics/stock/kpis${qs}`),
        apiClient.get(`/analytics/stock/por-producto${qs}`),
      ]);
      setKpis(kR.data);
      setInventario(iR.data);
    } catch (e) {
      console.error(e);
      setError('No se pudo cargar el panel de stock.');
    } finally {
      setLoadingKpis(false); setLoadingInventario(false);
    }
  }, [qs, canFetch]);

  const fetchMovimientos = useCallback(async () => {
    if (!canFetch || movimientos) return;
    setLoadingMovimientos(true);
    try { const r = await apiClient.get(`/analytics/stock/movimientos-series${qs}`); setMovimientos(r.data); }
    catch (e) { console.error(e); } finally { setLoadingMovimientos(false); }
  }, [qs, canFetch, movimientos]);

  const fetchRotacion = useCallback(async () => {
    if (!canFetch || rotacion) return;
    setLoadingRotacion(true);
    try { const r = await apiClient.get(`/analytics/stock/rotacion${qs}`); setRotacion(r.data); }
    catch (e) { console.error(e); } finally { setLoadingRotacion(false); }
  }, [qs, canFetch, rotacion]);

  const fetchAlertas = useCallback(async () => {
    if (!canFetch || alertas) return;
    setLoadingAlertas(true);
    try { const r = await apiClient.get(`/analytics/stock/alertas${qs}`); setAlertas(r.data); }
    catch (e) { console.error(e); } finally { setLoadingAlertas(false); }
  }, [qs, canFetch, alertas]);

  const fetchReposicion = useCallback(async () => {
    if (!canFetch || reposicion) return;
    setLoadingReposicion(true);
    try { const r = await apiClient.get(`/analytics/stock/reposicion${qs}`); setReposicion(r.data); }
    catch (e) { console.error(e); } finally { setLoadingReposicion(false); }
  }, [qs, canFetch, reposicion]);

  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);
  // Reset lazy data when filters change
  useEffect(() => {
    setMovimientos(null); setRotacion(null); setAlertas(null); setReposicion(null);
  }, [qs]);

  const value = useMemo(() => ({
    kpis, inventario, movimientos, rotacion, alertas, reposicion,
    loadingKpis, loadingInventario, loadingMovimientos, loadingRotacion,
    loadingAlertas, loadingReposicion,
    error,
    fetchMovimientos, fetchRotacion, fetchAlertas, fetchReposicion,
    refetch: fetchPrimary,
    user, activeCompany,
  }), [
    kpis, inventario, movimientos, rotacion, alertas, reposicion,
    loadingKpis, loadingInventario, loadingMovimientos, loadingRotacion,
    loadingAlertas, loadingReposicion,
    error, fetchPrimary, fetchMovimientos, fetchRotacion, fetchAlertas, fetchReposicion,
    user, activeCompany,
  ]);

  return (
    <StockDataContext.Provider value={value}>
      {children}
    </StockDataContext.Provider>
  );
}
