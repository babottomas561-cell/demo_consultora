import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultsByWidget = (widgetId) => ({
  widgetId,
  title: null,
  chartType: null,
  granularity: null,
  compareMode: 'none',
  columnVisibility: {},
  columnOrder: [],
  columnPinning: { left: [], right: [] },
  sorting: [],
  pageSize: 25,
  density: 'normal',
  thresholds: {},
  showSparkline: true,
  showLegend: true,
  yAxisScale: 'linear',
  showGrid: true,
  showValues: false,
});

export const useWidgetSettings = create(
  persist(
    (set, get) => ({
      settings: {},

      get: (widgetId) => {
        const stored = get().settings[widgetId];
        return { ...defaultsByWidget(widgetId), ...(stored || {}) };
      },

      update: (widgetId, patch) => {
        set((state) => ({
          settings: {
            ...state.settings,
            [widgetId]: { ...defaultsByWidget(widgetId), ...(state.settings[widgetId] || {}), ...patch },
          },
        }));
      },

      reset: (widgetId) => {
        set((state) => {
          const { [widgetId]: _, ...rest } = state.settings;
          return { settings: rest };
        });
      },

      resetAll: () => set({ settings: {} }),

      export: (widgetId) => JSON.stringify(get().get(widgetId), null, 2),

      import: (widgetId, json) => {
        try {
          const parsed = typeof json === 'string' ? JSON.parse(json) : json;
          get().update(widgetId, parsed);
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'widget-settings',
      version: 1,
    }
  )
);

export const useWidgetSetting = (widgetId) => {
  const settings = useWidgetSettings((s) => s.settings[widgetId]);
  return { ...defaultsByWidget(widgetId), ...(settings || {}) };
};
