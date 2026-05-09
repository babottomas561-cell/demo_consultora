import { createContext, useCallback, useState } from 'react';
import { useFilterStore } from '../../../store/filterStore';

export const CrossFilterContext = createContext(null);

const CrossFilterProvider = ({ children }) => {
  const { setFilter, toggleArrayValue } = useFilterStore();
  const [drillFilters, setDrillFilters] = useState({});

  const applyFilter = useCallback((key, values, shift = false) => {
    setDrillFilters((prev) => {
      const current = prev[key] ?? [];
      let next;
      if (shift) {
        const allSelected = values.every((v) => current.includes(v));
        next = allSelected
          ? current.filter((v) => !values.includes(v))
          : [...new Set([...current, ...values])];
      } else {
        const isSame = current.length === values.length && values.every((v) => current.includes(v));
        next = isSame ? [] : values;
      }
      if (next.length === 0) {
        const { [key]: _, ...rest } = prev;
        setFilter(key, []);
        return rest;
      }
      setFilter(key, next);
      return { ...prev, [key]: next };
    });
  }, [setFilter]);

  const clearFilter = useCallback((key) => {
    setDrillFilters((prev) => {
      const { [key]: _, ...rest } = prev;
      setFilter(key, []);
      return rest;
    });
  }, [setFilter]);

  const clearAll = useCallback(() => {
    Object.keys(drillFilters).forEach((key) => setFilter(key, []));
    setDrillFilters({});
  }, [drillFilters, setFilter]);

  const isActive = useCallback((key, value) => {
    const active = drillFilters[key];
    if (!active?.length) return false;
    return active.includes(value);
  }, [drillFilters]);

  return (
    <CrossFilterContext.Provider value={{ drillFilters, applyFilter, clearFilter, clearAll, isActive }}>
      {children}
    </CrossFilterContext.Provider>
  );
};

export default CrossFilterProvider;
