import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const PANEL_DEFAULTS = {};

let widgetCounter = 200;

const usePanelLayoutStore = create(
  persist(
    (set, get) => ({
      panels: {},
      editing: {},

      registerDefaults: (panelId, defaults) => {
        PANEL_DEFAULTS[panelId] = defaults;
        const current = get().panels[panelId];
        if (!current) {
          set((s) => ({
            panels: { ...s.panels, [panelId]: defaults },
          }));
        }
      },

      getPanel: (panelId) =>
        get().panels[panelId] || PANEL_DEFAULTS[panelId] || { widgets: [], layouts: {} },

      isEditing: (panelId) => !!get().editing[panelId],

      toggleEditing: (panelId) =>
        set((s) => ({
          editing: { ...s.editing, [panelId]: !s.editing[panelId] },
        })),

      updateLayouts: (panelId, layouts) =>
        set((s) => ({
          panels: {
            ...s.panels,
            [panelId]: { ...s.panels[panelId], layouts },
          },
        })),

      addWidget: (panelId, type) => {
        const id = `${panelId}-${++widgetCounter}-${Date.now()}`;
        set((s) => {
          const panel = s.panels[panelId] || PANEL_DEFAULTS[panelId] || { widgets: [], layouts: {} };
          const existingLayouts =
            panel.layouts && typeof panel.layouts === 'object' ? panel.layouts : {};
          const newItem = { i: id, x: 0, y: Infinity, w: 4, h: 3, minW: 2, minH: 2 };
          const breakpoints = ['lg', 'md', 'sm'];
          const updatedLayouts = Object.fromEntries(
            breakpoints.map((bp) => [
              bp,
              [...(Array.isArray(existingLayouts[bp]) ? existingLayouts[bp] : []), newItem],
            ])
          );
          return {
            panels: {
              ...s.panels,
              [panelId]: {
                widgets: [...panel.widgets, { id, type }],
                layouts: updatedLayouts,
              },
            },
          };
        });
      },

      removeWidget: (panelId, widgetId) =>
        set((s) => {
          const panel = s.panels[panelId];
          if (!panel) return s;
          return {
            panels: {
              ...s.panels,
              [panelId]: {
                widgets: panel.widgets.filter((w) => w.id !== widgetId),
                layouts: Object.fromEntries(
                  Object.entries(panel.layouts).map(([bp, items]) => [
                    bp,
                    items.filter((l) => l.i !== widgetId),
                  ])
                ),
              },
            },
          };
        }),

      resetToDefault: (panelId) =>
        set((s) => ({
          panels: {
            ...s.panels,
            [panelId]: PANEL_DEFAULTS[panelId] || { widgets: [], layouts: {} },
          },
        })),
    }),
    { name: 'bi-panel-layouts', version: 1 }
  )
);

export default usePanelLayoutStore;
