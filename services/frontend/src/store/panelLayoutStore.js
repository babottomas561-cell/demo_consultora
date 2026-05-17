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
          return;
        }
        const currentWidgetIds = new Set(current.widgets.map((widget) => widget.id));
        const missingWidgets = defaults.widgets.filter((widget) => !currentWidgetIds.has(widget.id));
        if (!missingWidgets.length) return;

        set((s) => {
          const panel = s.panels[panelId] || current;
          const nextLayouts = Object.fromEntries(
            Object.entries(defaults.layouts || {}).map(([bp, defaultItems]) => {
              const currentItems = panel.layouts?.[bp] || [];
              const currentItemIds = new Set(currentItems.map((item) => item.i));
              return [
                bp,
                [
                  ...currentItems,
                  ...defaultItems
                    .filter((item) => !currentItemIds.has(item.i))
                    .map((item) => ({ ...item, y: Infinity })),
                ],
              ];
            })
          );

          return {
            panels: {
              ...s.panels,
              [panelId]: {
                widgets: [...panel.widgets, ...missingWidgets],
                layouts: {
                  ...(panel.layouts || {}),
                  ...nextLayouts,
                },
              },
            },
          };
        });
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

      addWidget: (panelId, type, defaultSize = {}) => {
        const id = `${panelId}-${++widgetCounter}-${Date.now()}`;
        const layoutItem = {
          i: id,
          x: 0,
          y: Infinity,
          w: defaultSize.w ?? 4,
          h: defaultSize.h ?? 3,
          minW: defaultSize.minW ?? 2,
          minH: defaultSize.minH ?? 2,
        };
        const mobileItem = { ...layoutItem, w: 2, minW: 1 };
        set((s) => {
          const panel = s.panels[panelId] || PANEL_DEFAULTS[panelId] || { widgets: [], layouts: {} };
          const existing = panel.layouts || {};
          // Ensure new widget appears in all breakpoints, including xs/xxs added for mobile
          const ALL_BPS = ['lg', 'md', 'sm', 'xs', 'xxs'];
          const bps = ALL_BPS.filter((bp) => bp in existing).length > 0
            ? ALL_BPS
            : Object.keys(existing);
          const updatedLayouts = {};
          for (const bp of bps) {
            const item = bp === 'xs' || bp === 'xxs' ? mobileItem : layoutItem;
            updatedLayouts[bp] = [...(existing[bp] || []), { ...item }];
          }
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
