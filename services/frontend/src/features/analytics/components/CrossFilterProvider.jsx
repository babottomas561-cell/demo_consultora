import { createContext, useContext, useMemo, useState } from 'react';

const CrossFilterContext = createContext(null);

export const CrossFilterProvider = ({ children }) => {
  const [filters, setFilters] = useState({});

  const value = useMemo(() => ({
    filters,
    setFilter: (key, value) => setFilters((current) => ({ ...current, [key]: value })),
    clearFilter: (key) => setFilters((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    }),
    clearAll: () => setFilters({}),
  }), [filters]);

  return <CrossFilterContext.Provider value={value}>{children}</CrossFilterContext.Provider>;
};

export const useCrossFilter = () => {
  const context = useContext(CrossFilterContext);
  if (!context) {
    throw new Error('useCrossFilter must be used within CrossFilterProvider');
  }
  return context;
};
