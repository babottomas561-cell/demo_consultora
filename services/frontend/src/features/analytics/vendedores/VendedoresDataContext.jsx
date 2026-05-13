import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import useAuthStore from '../../../store/authStore';
import { useFilterStore } from '../../../store/filterStore';
import { buildQueryParams } from '../analyticsUtils';

const VendedoresDataContext = createContext(null);

export function useVendedoresData() {
  const ctx = useContext(VendedoresDataContext);
  if (!ctx) throw new Error('useVendedoresData must be used inside VendedoresDataProvider');
  return ctx;
}

export default function VendedoresDataProvider({ children }) {
  const user         = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore  = useFilterStore();

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
  const [kpis,    setKpis]    = useState(null);
  const [ranking, setRanking] = useState(null);
  const [loadingKpis,    setLoadingKpis]    = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [error, setError] = useState(null);

  // ── Lazy data ─────────────────────────────────────────────────────────────
  const [temporal,       setTemporal]       = useState(null);
  const [detalle,        setDetalle]        = useState(null);
  const [loadingTemporal, setLoadingTemporal] = useState(false);
  const [loadingDetalle,  setLoadingDetalle]  = useState(false);

  // Reset lazy data when filters change
  useEffect(() => {
    setTemporal(null);
    setDetalle(null);
  }, [qs]);

  // ── Primary fetch ─────────────────────────────────────────────────────────
  const fetchPrimary = useCallback(async () => {
    if (!canFetch) { setLoadingKpis(false); setLoadingRanking(false); return; }
    setLoadingKpis(true); setLoadingRanking(true);
    setError(null);
    try {
      const [kR, rR] = await Promise.all([
        apiClient.get(`/analytics/vendedores/kpis${qs}`),
        apiClient.get(`/analytics/vendedores/ranking${qs}`),
      ]);
      setKpis(kR.data);
      setRanking(rR.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de vendedores.');
    } finally {
      setLoadingKpis(false); setLoadingRanking(false);
    }
  }, [qs, canFetch]);

  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);

  // ── Lazy fetchers ─────────────────────────────────────────────────────────
  const fetchTemporal = useCallback(async () => {
    if (!canFetch || temporal) return;
    setLoadingTemporal(true);
    try {
      const r = await apiClient.get(`/analytics/vendedores/temporal${qs}`);
      setTemporal(r.data);
    } catch (e) { console.error(e); } finally { setLoadingTemporal(false); }
  }, [qs, canFetch, temporal]);

  const fetchDetalle = useCallback(async (codVendedor) => {
    if (!canFetch || !codVendedor) return;
    setDetalle(null);
    setLoadingDetalle(true);
    try {
      const r = await apiClient.get(`/analytics/vendedores/detalle/${codVendedor}${qs}`);
      setDetalle(r.data);
    } catch (e) { console.error(e); } finally { setLoadingDetalle(false); }
  }, [qs, canFetch]);

  const value = {
    qs,
    kpis,    ranking,    temporal,    detalle,
    loadingKpis, loadingRanking, loadingTemporal, loadingDetalle,
    error,
    fetchTemporal, fetchDetalle,
    refetch: fetchPrimary,
  };

  return (
    <VendedoresDataContext.Provider value={value}>
      {children}
    </VendedoresDataContext.Provider>
  );
}
