import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const getDefaultDates = () => {
  const hasta = new Date();
  const desde = new Date();
  desde.setFullYear(desde.getFullYear() - 1);
  return {
    desde: desde.toISOString().split('T')[0],
    hasta: hasta.toISOString().split('T')[0],
  };
};

export const useFilterStore = create(
  persist(
    (set) => ({
      periodo: 'anio',
      desde: getDefaultDates().desde,
      hasta: getDefaultDates().hasta,

      setPeriodo: (periodo) => {
        const hoy = new Date();
        const hasta = hoy.toISOString().split('T')[0];
        let desde = hasta;

        if (periodo === 'hoy') {
          desde = hasta;
        } else if (periodo === 'semana') {
          const d = new Date(hoy);
          d.setDate(d.getDate() - 7);
          desde = d.toISOString().split('T')[0];
        } else if (periodo === 'mes') {
          const d = new Date(hoy);
          d.setMonth(d.getMonth() - 1);
          desde = d.toISOString().split('T')[0];
        } else if (periodo === 'trimestre') {
          const d = new Date(hoy);
          d.setMonth(d.getMonth() - 3);
          desde = d.toISOString().split('T')[0];
        } else if (periodo === 'anio') {
          const d = new Date(hoy);
          d.setFullYear(d.getFullYear() - 1);
          desde = d.toISOString().split('T')[0];
        }

        set({ periodo, desde, hasta });
      },

      setCustomRange: (desde, hasta) => {
        set({ periodo: 'custom', desde, hasta });
      },

      reset: () => {
        const dates = getDefaultDates();
        set({ periodo: 'anio', ...dates });
      },
    }),
    {
      name: 'bi-filters',
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          const dates = getDefaultDates();
          return { ...persistedState, periodo: 'anio', ...dates };
        }
        return persistedState;
      },
    }
  )
);
