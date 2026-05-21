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
  const [resultadoKpis, setResultadoKpis] = useState(null);
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
  const [heatmap, setHeatmap] = useState(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [yoy, setYoy] = useState(null);
  const [loadingYoy, setLoadingYoy] = useState(false);
  const [descuentos, setDescuentos] = useState(null);
  const [loadingDescuentos, setLoadingDescuentos] = useState(false);
  const [aging, setAging] = useState(null);
  const [loadingAging, setLoadingAging] = useState(false);
  const [ticketDist, setTicketDist] = useState(null);
  const [loadingTicketDist, setLoadingTicketDist] = useState(false);
  const [cohort, setCohort] = useState(null);
  const [loadingCohort, setLoadingCohort] = useState(false);
  const [clientesRiesgo, setClientesRiesgo] = useState(null);
  const [loadingClientesRiesgo, setLoadingClientesRiesgo] = useState(false);
  const [diaSemana, setDiaSemana] = useState(null);
  const [loadingDiaSemana, setLoadingDiaSemana] = useState(false);
  const [nuevosRecurrentes, setNuevosRecurrentes] = useState(null);
  const [loadingNuevosRecurrentes, setLoadingNuevosRecurrentes] = useState(false);
  // D2/D3/D5/D6 — nuevos endpoints InfoManager
  const [semaforoCartera, setSemaforoCartera] = useState(null);
  const [semaforoCarteraLoading, setSemaforoCarteraLoading] = useState(false);
  const [mediosPago, setMediosPago] = useState(null);
  const [mediosPagoLoading, setMediosPagoLoading] = useState(false);
  const [conversion, setConversion] = useState(null);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [ivaDiscriminado, setIvaDiscriminado] = useState(null);
  const [ivaDiscriminadoLoading, setIvaDiscriminadoLoading] = useState(false);
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
    setDescuentos(null);
    setAging(null);
    setTicketDist(null);
    setCohort(null);
    setClientesRiesgo(null);
    setDiaSemana(null);
    setNuevosRecurrentes(null);
    // Reset nuevos datos InfoManager
    setSemaforoCartera(null);
    setMediosPago(null);
    setConversion(null);
    setIvaDiscriminado(null);
    setTxPage(1);

    setLoadingKpis(true); setLoadingTemporal(true);
    setLoadingProductos(true); setLoadingVendedores(true);
    setError(null);
    try {
      const [kR, tR, pR, vR, rR] = await Promise.all([
        apiClient.get(`/analytics/ventas/kpis${qs}`),
        apiClient.get(`/analytics/ventas/temporal${appendQueryParams(qs, { granularidad })}`),
        apiClient.get(`/analytics/ventas/productos${qs}`),
        apiClient.get(`/analytics/ventas/por-vendedor${qs}`),
        apiClient.get(`/analytics/resultado/kpis${qs}`).catch(() => ({ data: null })),
      ]);
      setKpis(kR.data);
      setTemporal(tR.data);
      setProductos(pR.data);
      setVendedores(vR.data);
      setResultadoKpis(rR.data);
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

  const fetchHeatmap = useCallback(async () => {
    if (!canFetch || heatmap) return;
    setLoadingHeatmap(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/temporal${appendQueryParams(qs, { granularidad: 'dia' })}`);
      setHeatmap(r.data);
    } catch (e) { console.error(e); } finally { setLoadingHeatmap(false); }
  }, [qs, canFetch, heatmap]);

  const fetchDescuentos = useCallback(async () => {
    if (!canFetch) return;
    setLoadingDescuentos(true);
    try {
      const r = await apiClient.get(`/analytics/resultado/descuentos${qs}`);
      setDescuentos(r.data);
    } catch (e) { console.error(e); } finally { setLoadingDescuentos(false); }
  }, [qs, canFetch]);

  const fetchAging = useCallback(async () => {
    if (!canFetch) return;
    setLoadingAging(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/aging${qs}`);
      setAging(r.data);
    } catch (e) { console.error(e); } finally { setLoadingAging(false); }
  }, [qs, canFetch]);

  const fetchTicketDist = useCallback(async () => {
    if (!canFetch) return;
    setLoadingTicketDist(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/ticket-dist${qs}`);
      setTicketDist(r.data);
    } catch (e) { console.error(e); } finally { setLoadingTicketDist(false); }
  }, [qs, canFetch]);

  const fetchCohort = useCallback(async () => {
    if (!canFetch) return;
    setLoadingCohort(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/cohort${qs}`);
      setCohort(r.data);
    } catch (e) { console.error(e); } finally { setLoadingCohort(false); }
  }, [qs, canFetch]);

  const fetchClientesRiesgo = useCallback(async () => {
    if (!canFetch) return;
    setLoadingClientesRiesgo(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/clientes-riesgo${qs}`);
      setClientesRiesgo(r.data);
    } catch (e) { console.error(e); } finally { setLoadingClientesRiesgo(false); }
  }, [qs, canFetch]);

  const fetchDiaSemana = useCallback(async () => {
    if (!canFetch) return;
    setLoadingDiaSemana(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/dia-semana${qs}`);
      setDiaSemana(r.data);
    } catch (e) { console.error(e); } finally { setLoadingDiaSemana(false); }
  }, [qs, canFetch]);

  const fetchNuevosRecurrentes = useCallback(async () => {
    if (!canFetch) return;
    setLoadingNuevosRecurrentes(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/nuevos-recurrentes${appendQueryParams(qs, { granularidad })}`);
      setNuevosRecurrentes(r.data);
    } catch (e) { console.error(e); } finally { setLoadingNuevosRecurrentes(false); }
  }, [qs, granularidad, canFetch]);

  const fetchYoy = useCallback(async () => {
    if (!canFetch || yoy) return;
    setLoadingYoy(true);
    try {
      const currentYear = new Date().getFullYear();
      const results = await Promise.all(
        [2, 1, 0].map(async (yearsBack) => {
          const year = currentYear - yearsBack;
          const yoyFilters = {
            ...filters,
            desde: `${year}-01-01`,
            hasta: yearsBack === 0 ? new Date().toISOString().substring(0, 10) : `${year}-12-31`,
            comparar_anterior: false,
          };
          const yoyQs = buildQueryParams(user, activeCompany, yoyFilters);
          const r = await apiClient.get(`/analytics/ventas/temporal${appendQueryParams(yoyQs, { granularidad: 'mes' })}`);
          return { year, series: r.data.series ?? [] };
        })
      );
      setYoy(results);
    } catch (e) { console.error(e); } finally { setLoadingYoy(false); }
  }, [qs, canFetch, yoy, filters, user, activeCompany]);

  // D2 — Semáforo de cartera (lazy)
  const fetchSemaforoCartera = useCallback(async () => {
    if (!canFetch) return;
    setSemaforoCarteraLoading(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/semaforo-cartera${qs}`);
      setSemaforoCartera(r.data);
    } catch (e) { console.error(e); } finally { setSemaforoCarteraLoading(false); }
  }, [qs, canFetch]);

  // D3 — Medios de pago (lazy)
  const fetchMediosPago = useCallback(async () => {
    if (!canFetch) return;
    setMediosPagoLoading(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/medios-pago${qs}`);
      setMediosPago(r.data);
    } catch (e) { console.error(e); } finally { setMediosPagoLoading(false); }
  }, [qs, canFetch]);

  // D5 — Conversión presupuestos (lazy)
  const fetchConversion = useCallback(async () => {
    if (!canFetch) return;
    setConversionLoading(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/conversion-presupuestos${qs}`);
      setConversion(r.data);
    } catch (e) { console.error(e); } finally { setConversionLoading(false); }
  }, [qs, canFetch]);

  // D6 — IVA discriminado (lazy)
  const fetchIvaDiscriminado = useCallback(async () => {
    if (!canFetch) return;
    setIvaDiscriminadoLoading(true);
    try {
      const r = await apiClient.get(`/analytics/ventas/iva-discriminado${qs}`);
      setIvaDiscriminado(r.data);
    } catch (e) { console.error(e); } finally { setIvaDiscriminadoLoading(false); }
  }, [qs, canFetch]);

  useEffect(() => { fetchPrimary(); }, [fetchPrimary]);
  useEffect(() => { if (temporal) fetchTemporal(); }, [granularidad]);

  const value = useMemo(() => ({
    kpis, resultadoKpis, temporal, productos, vendedores, clientes, comprobantes, transacciones,
    heatmap, yoy, descuentos, aging, ticketDist, cohort,
    clientesRiesgo, diaSemana, nuevosRecurrentes,
    // D2/D3/D5/D6
    semaforoCartera, semaforoCarteraLoading,
    mediosPago, mediosPagoLoading,
    conversion, conversionLoading,
    ivaDiscriminado, ivaDiscriminadoLoading,
    granularidad, setGranularidad, comparar,
    loadingKpis, loadingTemporal, loadingProductos, loadingVendedores,
    loadingClientes, loadingComprobantes, loadingTransacciones, loadingHeatmap, loadingYoy,
    loadingDescuentos, loadingAging, loadingTicketDist, loadingCohort,
    loadingClientesRiesgo, loadingDiaSemana, loadingNuevosRecurrentes,
    txPage, error,
    fetchClientes, fetchComprobantes, fetchTransacciones, fetchHeatmap, fetchYoy,
    fetchDescuentos, fetchAging, fetchTicketDist, fetchCohort,
    fetchClientesRiesgo, fetchDiaSemana, fetchNuevosRecurrentes,
    fetchSemaforoCartera, fetchMediosPago, fetchConversion, fetchIvaDiscriminado,
    refetch: fetchPrimary,
    user, activeCompany,
  }), [
    kpis, resultadoKpis, temporal, productos, vendedores, clientes, comprobantes, transacciones,
    heatmap, yoy, descuentos, aging, ticketDist, cohort,
    clientesRiesgo, diaSemana, nuevosRecurrentes,
    semaforoCartera, semaforoCarteraLoading,
    mediosPago, mediosPagoLoading,
    conversion, conversionLoading,
    ivaDiscriminado, ivaDiscriminadoLoading,
    granularidad, comparar,
    loadingKpis, loadingTemporal, loadingProductos, loadingVendedores,
    loadingClientes, loadingComprobantes, loadingTransacciones, loadingHeatmap, loadingYoy,
    loadingDescuentos, loadingAging, loadingTicketDist, loadingCohort,
    loadingClientesRiesgo, loadingDiaSemana, loadingNuevosRecurrentes,
    txPage, error, fetchPrimary, fetchClientes, fetchComprobantes, fetchTransacciones,
    fetchHeatmap, fetchYoy, fetchDescuentos, fetchAging, fetchTicketDist, fetchCohort,
    fetchClientesRiesgo, fetchDiaSemana, fetchNuevosRecurrentes,
    fetchSemaforoCartera, fetchMediosPago, fetchConversion, fetchIvaDiscriminado,
    user, activeCompany,
  ]);

  return (
    <VentasDataContext.Provider value={value}>
      {children}
    </VentasDataContext.Provider>
  );
}
