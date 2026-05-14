import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import apiClient from '../../../api/client';
import useAuthStore from '../../../store/authStore';
import { useFilterStore } from '../../../store/filterStore';
import { buildQueryParams } from '../analyticsUtils';

const ProveedoresDataContext = createContext(null);

export function useProveedoresData() {
  const ctx = useContext(ProveedoresDataContext);
  if (!ctx) throw new Error('useProveedoresData must be used inside ProveedoresDataProvider');
  return ctx;
}

export default function ProveedoresDataProvider({ children }) {
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

  const [kpis,    setKpis]    = useState(null);
  const [ranking, setRanking] = useState(null);
  const [loadingKpis,    setLoadingKpis]    = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [error, setError] = useState(null);

  const [temporal,        setTemporal]        = useState(null);
  const [detalle,         setDetalle]         = useState(null);
  const [comprobantes,    setComprobantes]    = useState(null);
  const [loadingTemporal, setLoadingTemporal] = useState(false);
  const [loadingDetalle,  setLoadingDetalle]  = useState(false);
  const [loadingComprobantes, setLoadingComprobantes] = useState(false);

  useEffect(() => {
    setTemporal(null);
    setDetalle(null);
    setComprobantes(null);
  }, [qs]);

  const fetchPrimary = useCallback(async () => {
    if (!canFetch) { setLoadingKpis(false); setLoadingRanking(false); return; }
    setLoadingKpis(true); setLoadingRanking(true);
    setError(null);
    try {
      const [kR, rR] = await Promise.all([
        apiClient.get(`/analytics/proveedores/kpis${qs}`),
        apiClient.get(`/analytics/proveedores/ranking${qs}`),
      ]);
      setKpis(kR.data);
      setRanking(rR.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de proveedores.');
    } finally {
      setLoadingKpis(false); setLoadingRanking(false);
    }
  }, [qs, canFetch]);

  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);

  const fetchTemporal = useCallback(async () => {
    if (!canFetch || temporal) return;
    setLoadingTemporal(true);
    try {
      const r = await apiClient.get(`/analytics/proveedores/temporal${qs}`);
      setTemporal(r.data);
    } catch (e) { console.error(e); } finally { setLoadingTemporal(false); }
  }, [qs, canFetch, temporal]);

  const fetchDetalle = useCallback(async (proveedorId) => {
    if (!canFetch || !proveedorId) return;
    setDetalle(null);
    setLoadingDetalle(true);
    try {
      const r = await apiClient.get(`/analytics/proveedores/detalle/${proveedorId}${qs}`);
      setDetalle(r.data);
    } catch (e) { console.error(e); } finally { setLoadingDetalle(false); }
  }, [qs, canFetch]);

  const fetchComprobantes = useCallback(async (proveedorId) => {
    if (!canFetch || !proveedorId) return;
    setComprobantes(null);
    setLoadingComprobantes(true);
    try {
      const r = await apiClient.get(`/analytics/proveedores/${proveedorId}/comprobantes${qs}`);
      setComprobantes(r.data);
    } catch (e) { console.error(e); } finally { setLoadingComprobantes(false); }
  }, [qs, canFetch]);

  const value = {
    qs,
    kpis, ranking, temporal, detalle, comprobantes,
    loadingKpis, loadingRanking, loadingTemporal, loadingDetalle, loadingComprobantes,
    error,
    fetchTemporal, fetchDetalle, fetchComprobantes,
    refetch: fetchPrimary,
  };

  return (
    <ProveedoresDataContext.Provider value={value}>
      {children}
    </ProveedoresDataContext.Provider>
  );
}
