import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../../../api/client';
import useAuthStore from '../../../store/authStore';
import { useFilterStore } from '../../../store/filterStore';
import { buildQueryParams } from '../analyticsUtils';

const ComprasDataContext = createContext(null);

export function useComprasData() {
  const ctx = useContext(ComprasDataContext);
  if (!ctx) throw new Error('useComprasData must be used within ComprasDataProvider');
  return ctx;
}

export default function ComprasDataProvider({ children }) {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore = useFilterStore();
  const comparar = filterStore.comparar_anterior;

  const filters = useMemo(
    () => filterStore.getApiFilters(),
    [
      filterStore.periodo, filterStore.desde, filterStore.hasta,
      filterStore.comparar_anterior, filterStore.cod_empresa,
    ]
  );

  const qs = buildQueryParams(user, activeCompany, filters);
  const canFetch = user?.company_id || (user?.is_admin && activeCompany);

  const [kpis, setKpis] = useState(null);
  const [temporal, setTemporal] = useState(null);
  const [productos, setProductos] = useState(null);
  const [proveedores, setProveedores] = useState(null);
  const [vencimientos, setVencimientos] = useState(null);
  const [precios, setPrecios] = useState(null);
  const [transacciones, setTransacciones] = useState(null);
  const [granularidad, setGranularidad] = useState('mes');

  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTemporal, setLoadingTemporal] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [loadingVencimientos, setLoadingVencimientos] = useState(false);
  const [loadingPrecios, setLoadingPrecios] = useState(false);
  const [loadingTransacciones, setLoadingTransacciones] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrimary = useCallback(async () => {
    if (!canFetch) {
      setLoadingKpis(false); setLoadingTemporal(false);
      setLoadingProductos(false); setLoadingProveedores(false);
      return;
    }
    setLoadingKpis(true); setLoadingTemporal(true);
    setLoadingProductos(true); setLoadingProveedores(true);
    setError(null);
    try {
      const sep = qs ? '&' : '?';
      const [kR, tR, pR, vR] = await Promise.all([
        apiClient.get(`/analytics/compras/kpis${qs}`),
        apiClient.get(`/analytics/compras/temporal${qs}${sep}granularidad=${granularidad}`),
        apiClient.get(`/analytics/compras/por-producto${qs}`),
        apiClient.get(`/analytics/compras/por-proveedor${qs}`),
      ]);
      setKpis(kR.data);
      setTemporal(tR.data);
      setProductos(pR.data);
      setProveedores(vR.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de compras.');
    } finally {
      setLoadingKpis(false); setLoadingTemporal(false);
      setLoadingProductos(false); setLoadingProveedores(false);
    }
  }, [qs, granularidad, canFetch]);

  const fetchTemporal = useCallback(async () => {
    if (!canFetch) return;
    const sep = qs ? '&' : '?';
    setLoadingTemporal(true);
    try {
      const r = await apiClient.get(`/analytics/compras/temporal${qs}${sep}granularidad=${granularidad}`);
      setTemporal(r.data);
    } catch (e) { console.error(e); } finally { setLoadingTemporal(false); }
  }, [qs, granularidad, canFetch]);

  const fetchVencimientos = useCallback(async () => {
    if (!canFetch || vencimientos) return;
    setLoadingVencimientos(true);
    try {
      const r = await apiClient.get(`/analytics/compras/calendario-pagos${qs}`);
      setVencimientos(r.data?.vencimientos ?? []);
    } catch (e) { console.error(e); } finally { setLoadingVencimientos(false); }
  }, [qs, canFetch, vencimientos]);

  const fetchPrecios = useCallback(async () => {
    if (!canFetch || precios) return;
    setLoadingPrecios(true);
    try {
      const r = await apiClient.get(`/analytics/compras/variacion-precios${qs}`);
      setPrecios(r.data?.productos ?? []);
    } catch (e) { console.error(e); } finally { setLoadingPrecios(false); }
  }, [qs, canFetch, precios]);

  const fetchTransacciones = useCallback(async (page = 1) => {
    if (!canFetch) return;
    const sep = qs ? '&' : '?';
    setLoadingTransacciones(true);
    try {
      const r = await apiClient.get(`/analytics/compras/transacciones${qs}${sep}page=${page}&limit=50`);
      setTransacciones(r.data);
    } catch (e) { console.error(e); } finally { setLoadingTransacciones(false); }
  }, [qs, canFetch]);

  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);
  useEffect(() => { if (temporal) fetchTemporal(); }, [granularidad]);

  const value = useMemo(() => ({
    kpis, temporal, productos, proveedores, vencimientos, precios, transacciones,
    granularidad, setGranularidad, comparar,
    loadingKpis, loadingTemporal, loadingProductos, loadingProveedores,
    loadingVencimientos, loadingPrecios, loadingTransacciones,
    error,
    fetchVencimientos, fetchPrecios, fetchTransacciones,
    refetch: fetchPrimary,
    user, activeCompany,
  }), [
    kpis, temporal, productos, proveedores, vencimientos, precios, transacciones,
    granularidad, comparar,
    loadingKpis, loadingTemporal, loadingProductos, loadingProveedores,
    loadingVencimientos, loadingPrecios, loadingTransacciones,
    error, fetchPrimary, fetchVencimientos, fetchPrecios, fetchTransacciones,
    user, activeCompany,
  ]);

  return (
    <ComprasDataContext.Provider value={value}>
      {children}
    </ComprasDataContext.Provider>
  );
}
