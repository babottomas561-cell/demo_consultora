import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import useAuthStore from '../../../store/authStore';
import { useFilterStore } from '../../../store/filterStore';
import { appendQueryParams, buildQueryParams } from '../analyticsUtils';

const CajaDataContext = createContext(null);

export function useCajaData() {
  const ctx = useContext(CajaDataContext);
  if (!ctx) throw new Error('useCajaData must be used inside CajaDataProvider');
  return ctx;
}

export default function CajaDataProvider({ children }) {
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

  // ── Primary data ──────────────────────────────────────────────────────────
  const [kpis,  setKpis]  = useState(null);
  const [flujo, setFlujo] = useState(null);
  const [loadingKpis,  setLoadingKpis]  = useState(true);
  const [loadingFlujo, setLoadingFlujo] = useState(true);
  const [error, setError] = useState(null);

  // ── Lazy data ─────────────────────────────────────────────────────────────
  const [porTipo,      setPorTipo]      = useState(null);
  const [movimientos,  setMovimientos]  = useState(null);
  const [loadingPorTipo, setLoadingPorTipo] = useState(false);
  const [loadingMovs,    setLoadingMovs]    = useState(false);
  const [movsPage, setMovsPage] = useState(1);

  useEffect(() => {
    setPorTipo(null);
    setMovimientos(null);
    setMovsPage(1);
  }, [qs]);

  // ── Primary fetch ─────────────────────────────────────────────────────────
  const fetchPrimary = useCallback(async () => {
    if (!canFetch) { setLoadingKpis(false); setLoadingFlujo(false); return; }
    setLoadingKpis(true); setLoadingFlujo(true);
    setError(null);
    try {
      const [kR, fR] = await Promise.all([
        apiClient.get(`/analytics/caja/kpis${qs}`),
        apiClient.get(`/analytics/caja/flujo${qs}`),
      ]);
      setKpis(kR.data);
      setFlujo(fR.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de caja.');
    } finally {
      setLoadingKpis(false); setLoadingFlujo(false);
    }
  }, [qs, canFetch]);

  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);

  // ── Lazy fetchers ─────────────────────────────────────────────────────────
  const fetchPorTipo = useCallback(async () => {
    if (!canFetch || porTipo) return;
    setLoadingPorTipo(true);
    try {
      const r = await apiClient.get(`/analytics/caja/por-tipo${qs}`);
      setPorTipo(r.data);
    } catch (e) { console.error(e); } finally { setLoadingPorTipo(false); }
  }, [qs, canFetch, porTipo]);

  const fetchMovimientos = useCallback(async (page = 1) => {
    if (!canFetch) return;
    setLoadingMovs(true);
    try {
      const r = await apiClient.get(`/analytics/caja/movimientos${appendQueryParams(qs, { page, limit: 50 })}`);
      setMovimientos(r.data);
      setMovsPage(page);
    } catch (e) { console.error(e); } finally { setLoadingMovs(false); }
  }, [qs, canFetch]);

  const value = {
    qs,
    kpis, flujo, porTipo, movimientos, movsPage,
    loadingKpis, loadingFlujo, loadingPorTipo, loadingMovs,
    error,
    fetchPorTipo, fetchMovimientos,
    refetch: fetchPrimary,
  };

  return (
    <CajaDataContext.Provider value={value}>
      {children}
    </CajaDataContext.Provider>
  );
}
