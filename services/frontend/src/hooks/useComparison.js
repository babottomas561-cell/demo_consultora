import { useFilterStore } from '../store/filterStore';

const getComparisonRange = (periodo, desde, hasta) => {
  const start = new Date(desde);
  const end = new Date(hasta);
  const diffMs = end - start;

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd - diffMs);

  const fmt = (d) => d.toISOString().split('T')[0];
  return { desde: fmt(prevStart), hasta: fmt(prevEnd) };
};

const getYearAgoRange = (desde, hasta) => {
  const fmt = (d) => d.toISOString().split('T')[0];
  const s = new Date(desde);
  const e = new Date(hasta);
  s.setFullYear(s.getFullYear() - 1);
  e.setFullYear(e.getFullYear() - 1);
  return { desde: fmt(s), hasta: fmt(e) };
};

export const useComparison = () => {
  const { comparar_anterior, periodo, desde, hasta, setFilter } = useFilterStore();

  const toggleComparison = () => setFilter('comparar_anterior', !comparar_anterior);

  const comparisonRange = comparar_anterior
    ? getComparisonRange(periodo, desde, hasta)
    : null;

  const yearAgoRange = getYearAgoRange(desde, hasta);

  return {
    isActive: comparar_anterior,
    toggle: toggleComparison,
    comparisonRange,
    yearAgoRange,
    currentRange: { desde, hasta },
  };
};
