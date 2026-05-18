import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const PERIODOS = ['hoy', 'semana', 'mes', 'trimestre', 'anio', 'custom'];

const dateToISO = (date) => date.toISOString().split('T')[0];

const getDefaultDates = (periodo = 'anio') => {
  const hoy = new Date();
  const hasta = dateToISO(hoy);
  const desde = new Date(hoy);

  if (periodo === 'hoy') {
    return { desde: hasta, hasta };
  }
  if (periodo === 'semana') {
    desde.setDate(desde.getDate() - 7);
  } else if (periodo === 'mes') {
    desde.setMonth(desde.getMonth() - 1);
  } else if (periodo === 'trimestre') {
    desde.setMonth(desde.getMonth() - 3);
  } else {
    desde.setFullYear(desde.getFullYear() - 1);
  }

  return { desde: dateToISO(desde), hasta };
};

const arrayFilters = [
  'cod_empresa',
  'tag',
  'punto_de_venta',
  'cod_vendedor',
  'cod_rubro',
  'cod_subrubro',
  'tipo_comprobante',
  'condicion_venta',
  'cod_cliente',
  'cod_articulo',
  'cod_deposito',
  'cod_lista_precios',
];

const emptyAdvancedFilters = {
  comparar_anterior: false,
  compare_mode: 'none',
  cod_empresa: [],
  tag: [],
  punto_de_venta: [],
  cod_vendedor: [],
  cod_rubro: [],
  cod_subrubro: [],
  tipo_comprobante: [],
  condicion_venta: [],
  cod_cliente: [],
  cod_articulo: [],
  cod_deposito: [],
  cod_lista_precios: [],
  incluir_anuladas: false,
};

const createDefaultState = () => ({
  periodo: 'anio',
  ...getDefaultDates('anio'),
  ...emptyAdvancedFilters,
  savedViews: [],
  activeViewId: null,
});

const normalizeArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const createViewId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `view_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const pickFilterState = (state) => ({
  periodo: state.periodo,
  desde: state.desde,
  hasta: state.hasta,
  comparar_anterior: state.comparar_anterior,
  cod_empresa: state.cod_empresa,
  tag: state.tag,
  punto_de_venta: state.punto_de_venta,
  cod_vendedor: state.cod_vendedor,
  cod_rubro: state.cod_rubro,
  cod_subrubro: state.cod_subrubro,
  tipo_comprobante: state.tipo_comprobante,
  condicion_venta: state.condicion_venta,
  cod_cliente: state.cod_cliente,
  cod_articulo: state.cod_articulo,
  cod_deposito: state.cod_deposito,
  cod_lista_precios: state.cod_lista_precios,
  incluir_anuladas: state.incluir_anuladas,
});

export const useFilterStore = create(
  persist(
    (set, get) => ({
      ...createDefaultState(),

      setPeriodo: (periodo) => {
        if (periodo === 'custom') {
          set({ periodo, activeViewId: null });
          return;
        }
        set({ periodo, ...getDefaultDates(periodo), activeViewId: null });
      },

      setCustomRange: (desde, hasta) => {
        set({ periodo: 'custom', desde, hasta, activeViewId: null });
      },

      setCompareMode: (mode) => {
        set({ compare_mode: mode, comparar_anterior: mode !== 'none', activeViewId: null });
      },

      setFilter: (name, value) => {
        set({ [name]: arrayFilters.includes(name) ? normalizeArray(value) : value, activeViewId: null });
      },

      setFilters: (filters) => {
        const next = { ...filters, activeViewId: null };
        for (const key of arrayFilters) {
          if (key in next) next[key] = normalizeArray(next[key]);
        }
        set(next);
      },

      clearFilter: (name) => {
        const fallback = arrayFilters.includes(name) ? [] : emptyAdvancedFilters[name];
        set({ [name]: fallback, activeViewId: null });
      },

      toggleArrayValue: (name, value) => {
        const current = normalizeArray(get()[name]);
        const exists = current.includes(value);
        set({
          [name]: exists ? current.filter((item) => item !== value) : [...current, value],
          activeViewId: null,
        });
      },

      resetAdvancedFilters: () => {
        set({ ...emptyAdvancedFilters, activeViewId: null });
      },

      reset: () => {
        set(createDefaultState());
      },

      getApiFilters: () => pickFilterState(get()),

      saveView: (name) => {
        const trimmedName = name?.trim();
        if (!trimmedName) return null;

        const view = {
          id: createViewId(),
          name: trimmedName,
          filters: pickFilterState(get()),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          savedViews: [view, ...state.savedViews.filter((item) => item.name !== trimmedName)],
          activeViewId: view.id,
        }));
        return view.id;
      },

      loadView: (id) => {
        const view = get().savedViews.find((item) => item.id === id);
        if (!view) return false;
        set({ ...createDefaultState(), ...view.filters, activeViewId: id, savedViews: get().savedViews });
        return true;
      },

      deleteView: (id) => {
        set((state) => ({
          savedViews: state.savedViews.filter((item) => item.id !== id),
          activeViewId: state.activeViewId === id ? null : state.activeViewId,
        }));
      },
    }),
    {
      name: 'bi-filters',
      version: 4,
      // Refresh dates on load so preset periods (anio, mes, etc.) always reflect today
      onRehydrateStorage: () => (state) => {
        if (state && state.periodo && state.periodo !== 'custom') {
          const fresh = getDefaultDates(state.periodo);
          state.desde = fresh.desde;
          state.hasta = fresh.hasta;
        }
      },
      partialize: (state) => ({
        ...pickFilterState(state),
        savedViews: state.savedViews,
        activeViewId: state.activeViewId,
      }),
      migrate: (persistedState) => ({
        ...createDefaultState(),
        ...Object.fromEntries(arrayFilters.map((key) => [key, normalizeArray(persistedState?.[key])])),
        comparar_anterior: persistedState?.comparar_anterior ?? false,
        incluir_anuladas: persistedState?.incluir_anuladas ?? false,
        savedViews: persistedState?.savedViews || [],
        activeViewId: persistedState?.activeViewId || null,
      }),
    }
  )
);
