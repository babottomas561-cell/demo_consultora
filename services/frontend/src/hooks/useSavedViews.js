import { useFilterStore } from '../store/filterStore';

export const useSavedViews = () => {
  const { savedViews, activeViewId, saveView, loadView, deleteView } = useFilterStore();

  const save = (name) => saveView(name);
  const load = (id) => loadView(id);
  const remove = (id) => deleteView(id);

  const activeView = savedViews.find((v) => v.id === activeViewId) || null;

  return {
    views: savedViews,
    activeView,
    activeViewId,
    save,
    load,
    remove,
  };
};
