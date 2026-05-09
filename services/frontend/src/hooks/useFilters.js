import { useFilterStore } from '../store/filterStore';

export const useFilters = () => {
  const store = useFilterStore();
  return {
    filters: store.getApiFilters(),
    periodo: store.periodo,
    desde: store.desde,
    hasta: store.hasta,
    comparar_anterior: store.comparar_anterior,
    setPeriodo: store.setPeriodo,
    setCustomRange: store.setCustomRange,
    setFilter: store.setFilter,
    setFilters: store.setFilters,
    clearFilter: store.clearFilter,
    toggleArrayValue: store.toggleArrayValue,
    resetAdvancedFilters: store.resetAdvancedFilters,
    reset: store.reset,
  };
};
