import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import useAuthStore from '../../../store/authStore';
import { useFilterStore } from '../../../store/filterStore';
import { buildQueryParams } from '../analyticsUtils';

const ResultadoDataContext = createContext(null);

export function useResultadoData() {
  const ctx = useContext(ResultadoDataContext);
  if (!ctx) throw new Error('useResultadoData must be used inside ResultadoDataProvider');
  return ctx;
}

export default function ResultadoDataProvider({ children }) {
  const user          = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore   = useFilterStore();

  const filters = {
    periodo:           filterStore.periodo,
    desde:             filterStore.desde,
    hasta:             filterStore.hasta,
    comparar_anterior: filterStore.comparar_anterior,
    cod_empresa:       filterStore.cod_empresa,
    tag:               filterStore.tag,
    punto_de_venta:    filterStore.punto_de_venta,
    cod_vendedor:      filterStore.cod_vendedor,
    cod_rubro:         filterStore.cod_rubro,
    cod_subrubro:      filterStore.cod_subrubro,
    tipo_comprobante:  filterStore.tipo_comprobante,
    condicion_venta:   filterStore.condicion_venta,
    cod_cliente:       filterStore.cod_cliente,
    cod_articulo:      filterStore.cod_articulo,
    cod_deposito:      filterStore.cod_deposito,
    incluir_anuladas:  filterStore.incluir_anuladas,
  };

  const qs = buildQueryParams(user, activeCompany, filters);
  const canFetch = Boolean(user?.company_id || (user?.is_admin && activeCompany));

  // ── Granularidad (affects temporal URL) ───────────────────────────────────
  const [granularidad, setGranularidad] = useState('mes');

  // ── Primary data (loaded eagerly) ────────────────────────────────────────
  const [kpis,     setKpis]     = useState(null);
  const [temporal, setTemporal] = useState(null);
  const [productos, setProductos] = useState(null);
  const [loadingKpis,     setLoadingKpis]     = useState(true);
  const [loadingTemporal, setLoadingTemporal] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [error, setError] = useState(null);

  // ── Lazy data ─────────────────────────────────────────────────────────────
  const [vendedores,        setVendedores]        = useState(null);
  const [clientes,          setClientes]          = useState(null);
  const [descuentos,        setDescuentos]        = useState(null);
  const [loadingVendedores, setLoadingVendedores] = useState(false);
  const [loadingClientes,   setLoadingClientes]   = useState(false);
  const [loadingDescuentos, setLoadingDescuentos] = useState(false);

  // Reset lazy data on filter/granularidad change
  useEffect(() => {
    setVendedores(null);
    setClientes(null);
    setDescuentos(null);
  }, [qs]);

  // ── Primary fetch ─────────────────────────────────────────────────────────
  const fetchPrimary = useCallback(async () => {
    if (!canFetch) {
      setLoadingKpis(false); setLoadingTemporal(false); setLoadingProductos(false);
      return;
    }
    setLoadingKpis(true); setLoadingTemporal(true); setLoadingProductos(true);
    setError(null);
    try {
      const [kR, tR, pR] = await Promise.all([
        apiClient.get(`/analytics/resultado/kpis${qs}`),
        apiClient.get(`/analytics/resultado/temporal${qs}&granularidad=${granularidad}`),
        apiClient.get(`/analytics/resultado/por-producto${qs}`),
      ]);
      setKpis(kR.data);
      setTemporal(tR.data);
      setProductos(pR.data);
    } catch (e) {
      console.error(e);
      setError('No se pudo cargar el panel de resultado.');
    } finally {
      setLoadingKpis(false); setLoadingTemporal(false); setLoadingProductos(false);
    }
  }, [qs, granularidad, canFetch]);

  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);

  // ── Lazy fetchers ─────────────────────────────────────────────────────────
  const fetchVendedores = useCallback(async () => {
    if (!canFetch || vendedores) return;
    setLoadingVendedores(true);
    try {
      const r = await apiClient.get(`/analytics/resultado/por-vendedor${qs}`);
      setVendedores(r.data);
    } catch (e) { console.error(e); } finally { setLoadingVendedores(false); }
  }, [qs, canFetch, vendedores]);

  const fetchClientes = useCallback(async () => {
    if (!canFetch || clientes) return;
    setLoadingClientes(true);
    try {
      const r = await apiClient.get(`/analytics/resultado/por-cliente${qs}`);
      setClientes(r.data);
    } catch (e) { console.error(e); } finally { setLoadingClientes(false); }
  }, [qs, canFetch, clientes]);

  const fetchDescuentos = useCallback(async () => {
    if (!canFetch || descuentos) return;
    setLoadingDescuentos(true);
    try {
      const r = await apiClient.get(`/analytics/resultado/descuentos${qs}`);
      setDescuentos(r.data);
    } catch (e) { console.error(e); } finally { setLoadingDescuentos(false); }
  }, [qs, canFetch, descuentos]);

  const value = {
    qs,
    kpis, temporal, productos, vendedores, clientes, descuentos,
    granularidad, setGranularidad,
    loadingKpis, loadingTemporal, loadingProductos,
    loadingVendedores, loadingClientes, loadingDescuentos,
    error,
    fetchVendedores, fetchClientes, fetchDescuentos,
    refetch: fetchPrimary,
  };

  return (
    <ResultadoDataContext.Provider value={value}>
      {children}
    </ResultadoDataContext.Provider>
  );
}
