import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_WIDGETS = [
  { id: 'default-1', type: 'ventas-mes' },
  { id: 'default-2', type: 'clientes-activos' },
  { id: 'default-3', type: 'transacciones' },
  { id: 'default-4', type: 'variacion-mensual' },
  { id: 'default-5', type: 'ventas-mensuales' },
  { id: 'default-6', type: 'top-clientes' },
  { id: 'default-7', type: 'ventas-por-vendedor' },
  { id: 'default-8', type: 'top-productos' },
  { id: 'default-9', type: 'tendencia-ventas' },
  { id: 'default-10', type: 'stock-alertas' },
  { id: 'default-11', type: 'ventas-por-empresa' },
];

const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'default-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-3', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-4', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-5', x: 0, y: 2, w: 8, h: 4, minW: 4, minH: 3 },
    { i: 'default-6', x: 8, y: 2, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'default-7', x: 0, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'default-8', x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'default-9', x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'default-10', x: 0, y: 10, w: 12, h: 4, minW: 4, minH: 3 },
    { i: 'default-11', x: 0, y: 14, w: 6, h: 4, minW: 3, minH: 3 },
  ],
  md: [
    { i: 'default-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-3', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-4', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-5', x: 0, y: 2, w: 7, h: 4, minW: 4, minH: 3 },
    { i: 'default-6', x: 7, y: 2, w: 5, h: 4, minW: 3, minH: 3 },
    { i: 'default-7', x: 0, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'default-8', x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'default-9', x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
    { i: 'default-10', x: 0, y: 10, w: 12, h: 4, minW: 4, minH: 3 },
    { i: 'default-11', x: 0, y: 14, w: 6, h: 4, minW: 3, minH: 3 },
  ],
  sm: [
    { i: 'default-1', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-2', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-3', x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-4', x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
    { i: 'default-5', x: 0, y: 4, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'default-6', x: 0, y: 8, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'default-7', x: 0, y: 12, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'default-8', x: 0, y: 16, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'default-9', x: 0, y: 20, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'default-10', x: 0, y: 24, w: 6, h: 4, minW: 3, minH: 3 },
    { i: 'default-11', x: 0, y: 28, w: 6, h: 4, minW: 3, minH: 3 },
  ],
};

let widgetCounter = 100;

const useDashboardStore = create(
  persist(
    (set, get) => ({
      widgets: DEFAULT_WIDGETS,
      layouts: DEFAULT_LAYOUTS,
      editing: false,

      toggleEditing: () => set(s => ({ editing: !s.editing })),

      updateLayouts: (layouts) => set({ layouts }),

      addWidget: (type, defaultSize = {}) => {
        const id = `widget-${++widgetCounter}-${Date.now()}`;
        const layoutItem = {
          i: id,
          x: 0,
          y: Infinity,
          w: defaultSize.w ?? 4,
          h: defaultSize.h ?? 3,
          minW: defaultSize.minW ?? 2,
          minH: defaultSize.minH ?? 2,
        };
        set(s => ({
          widgets: [...s.widgets, { id, type }],
          layouts: Object.fromEntries(
            Object.entries(s.layouts).map(([bp, items]) => [
              bp,
              [...items, { ...layoutItem }],
            ])
          ),
        }));
      },

      removeWidget: (id) =>
        set(s => ({
          widgets: s.widgets.filter(w => w.id !== id),
          layouts: Object.fromEntries(
            Object.entries(s.layouts).map(([bp, items]) => [
              bp,
              items.filter(l => l.i !== id),
            ])
          ),
        })),

      resetToDefault: () =>
        set({ widgets: DEFAULT_WIDGETS, layouts: DEFAULT_LAYOUTS }),
    }),
    { name: 'bi-dashboard-layout', version: 1 }
  )
);

export default useDashboardStore;
