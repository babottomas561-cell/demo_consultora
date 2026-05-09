import { useState } from 'react';
import { Bookmark, BookmarkCheck, Trash2, Share2, ChevronDown, Plus } from 'lucide-react';
import { cn } from '../../ui/utils';
import { useSavedViews } from '../../../hooks/useSavedViews';

const SavedViews = ({ className }) => {
  const { views, activeViewId, save, load, remove } = useSavedViews();
  const [newName, setNewName] = useState('');
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    save(trimmed);
    setNewName('');
  };

  const handleShare = (view) => {
    const params = new URLSearchParams();
    Object.entries(view.filters).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach((val) => params.append(k, val));
      else if (v != null && v !== false) params.set(k, v);
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard?.writeText(url);
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm"
      >
        <Bookmark size={13} className={views.length ? 'text-indigo-600' : 'text-slate-400'} />
        Vistas guardadas
        {views.length > 0 && (
          <span className="rounded-full bg-indigo-100 px-1.5 text-[10px] font-bold text-indigo-700">{views.length}</span>
        )}
        <ChevronDown size={11} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-3 py-2.5">
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre de la nueva vista..."
                className="flex-1 rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button
                onClick={handleSave}
                disabled={!newName.trim()}
                className="rounded bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                <Plus size={13} />
              </button>
            </div>
          </div>

          {views.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-slate-400">No hay vistas guardadas</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {views.map((view) => (
                <li key={view.id} className="flex items-center gap-1 px-2 py-1 hover:bg-slate-50">
                  <button
                    onClick={() => { load(view.id); setOpen(false); }}
                    className={cn(
                      'flex flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-xs',
                      activeViewId === view.id ? 'text-indigo-700 font-semibold' : 'text-slate-700'
                    )}
                  >
                    {activeViewId === view.id
                      ? <BookmarkCheck size={13} className="text-indigo-600 shrink-0" />
                      : <Bookmark size={13} className="text-slate-300 shrink-0" />
                    }
                    <span className="truncate">{view.name}</span>
                  </button>
                  <button
                    onClick={() => handleShare(view)}
                    title="Compartir (copia URL)"
                    className="rounded p-1 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50"
                  >
                    <Share2 size={12} />
                  </button>
                  <button
                    onClick={() => remove(view.id)}
                    className="rounded p-1 text-slate-300 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedViews;
