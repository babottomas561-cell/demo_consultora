import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../../../api/client';
import useAuthStore from '../../../store/authStore';
import { useFilterStore } from '../../../store/filterStore';
import { appendQueryParams, buildQueryParams } from '../analyticsUtils';

const VentasDataContext = createContext(null);

export function useVentasData() {
  const ctx = useContext(VentasDataContext);
  if (!ctx) throw new Error('useVentasData must be used within VentasDataProvider');
  return ctx;
}

export default function VentasDataProvider({ children }) {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useAuthStore((s) => s.activeCompany);
  const filterStore = useFilterStore();
  const comparar = filterStore.comparar_anterior;

  const filters = useMemo(
    () => filterStore.getApiFilters(),
    [
      filterStore.periodo, filterStore.desde, filterStore.hasta,
      filterStore.comparar_anterior, filterStore.cod_empresa, filterStore.tag,
      filterStore.punto_de_venta, filterStore.cod_vendedor, filterStore.cod_rubro,
      filterStore.cod_subrubro, filterStore.tipo_comprobante, filterStore.condicion_venta,
      filterStore.cod_cliente, filterStore.cod_articulo, filterStore.cod_deposito,
      filterStore.cod_lista_precios, filterStore.incluir_anuladas,
    ]
  );

  const qs = buildQueryParams(user, activeCompany, filters);
  const canFetch = user?.company_id || (user?.is_admin && activeCompany);

  const [kpis, setKpis] = useState(null);
  const [temporal, setTemporal] = useState(null);
  const [productos, setProductos] = useState(null);
  const [vendedores, setVendedores] = useState(null);
  const [clientes, setClientes] = useState(null);
  const [comprobantes, setComprobantes] = useState(null);
  const [transacciones, setTransacciones] = useState(null);
  const [granularidad, setGranularidad] = useState('mes');

  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTemporal, setLoadingTemporal] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [loadingVendedores, setLoadingVendedores] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingComprobantes, setLoadingComprobantes] = useState(false);
  const [loadingTransacciones, setLoadingTransacciones] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [error, setError] = useState(null);

  const fetchPrimary = useCallback(async () => {
    if (!canFetch) {
      setLoadingKpis(false); setLoadingTemporal(false);
      setLoadingProductos(false); setLoadingVendedores(false);
      return;
    }
    // Reset secondary/lazy data so widgets re-fetch with the new filters
    setClientes(null);
    setComprobantes(null);
    setTransacciones(null);
    setTxPage(1);

    setLoadingKpis(true); setLoadingTemporal(true);
    setLoadingProductos(true); setLoadingVendedores(true);
    setError(null);
    try {
      const [kR, tR, pR, vR] = await Promise.all([
        apiClient.get(`/analytics/ventas/kpis${qs}`),
        apiClient.get(`/analytics/ventas/temporal${appendQueryParams(qs, { granularidad })}`),
        apiClient.get(`/analytics/ventas/productos${qs}`),
        apiClient.get(`/analytics/ventas/por-vendedor${qs}`),
      ]);
      setKpis(kR.data);
      setTemporal(tR.data);
      setProductos(pR.data);
      setVendedores(vR.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el panel de ventas.');
    } finally {
      setLoadingKpis(false); setLoadingTemporal(false);
      setLoadingProductos(false); setLoadingVendedores(false);
    }
  }, [qs, granularidad, canFetch]);

  const fetchTemporal = useCallback(async () => {
    if (!canFetch) return;
    setLoadingTemporal(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/temporal${appendQueryParams(qs, { granularidad })}`);
      setTemporal(r.data);
    } catch (e) { console.error(e); } finally { setLoadingTemporal(false); }
  }, [qs, granularidad, canFetch]);

  // Lazy fetches — no guard on existing data (reset happens in fetchPrimary)
  const fetchClientes = useCallback(async () => {
    if (!canFetch) return;
    setLoadingClientes(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/por-cliente${qs}`);
      setClientes(r.data);
    } catch (e) { console.error(e); } finally { setLoadingClientes(false); }
  }, [qs, canFetch]);

  const fetchComprobantes = useCallback(async () => {
    if (!canFetch) return;
    setLoadingComprobantes(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/por-comprobante${qs}`);
      setComprobantes(r.data);
    } catch (e) { console.error(e); } finally { setLoadingComprobantes(false); }
  }, [qs, canFetch]);

  const fetchTransacciones = useCallback(async (page = 1) => {
    if (!canFetch) return;
    setLoadingTransacciones(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/transacciones${appendQueryParams(qs, { page, limit: 50 })}`);
      setTransacciones(r.data);
      setTxPage(page);
    } catch (e) { console.error(e); } finally { setLoadingTransacciones(false); }
  }, [qs, canFetch]);

  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);
  useEffect(() => { if (temporal) fetchTemporal(); }, [granularidad]);

  const value = useMemo(() => ({
    kpis, temporal, productos, vendedores, clientes, comprobantes, transacciones,
    granularidad, setGranularidad, comparar,
    loadingKpis, loadingTemporal, loadingProductos, loadingVendedores,
    loadingClientes, loadingComprobantes, loadingTransacciones,
    txPage, error,
    fetchClientes, fetchComprobantes, fetchTransacciones,
    refetch: fetchPrimary,
    user, activeCompany,
  }), [
    kpis, temporal, productos, vendedores, clientes, comprobantes, transacciones,
    granularidad, comparar,
    loadingKpis, loadingTemporal, loadingProductos, loadingVendedores,
    loadingClientes, loadingComprobantes, loadingTransacciones,
    txPage, error, fetchPrimary, fetchClientes, fetchComprobantes, fetchTransacciones,
    user, activeCompany,
  ]);

  return (
    <VentasDataContext.Provider value={value}>
      {children}
    </VentasDataContext.Provider>
  );
}
