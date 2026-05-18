import { useEffect, useState } from 'react';
import { X, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '../../ui/utils';

const DrillModal = ({
  open, onClose, title, subtitle, breadcrumb,
  tabs, defaultTab, headerExtra, children, size = 'xl', onBack,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs?.[0]?.key);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const sizeClass = {
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-[95vw]',
  }[size] || 'max-w-6xl';

  const activeContent = tabs?.find((t) => t.key === activeTab)?.render?.() ?? children;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 backdrop-blur-sm p-4">
      <div className={cn('relative my-8 w-full rounded-xl bg-white shadow-2xl flex flex-col max-h-[92vh]', sizeClass)}>
        <div className="border-b border-slate-100 px-5 py-3 flex items-start justify-between gap-2 shrink-0">
          <div className="min-w-0 flex-1">
            {breadcrumb && breadcrumb.length > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-1">
                {onBack && (
                  <button onClick={onBack} className="mr-1 rounded p-0.5 hover:bg-slate-100" title="Volver">
                    <ArrowLeft size={11} />
                  </button>
                )}
                {breadcrumb.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight size={10} className="text-slate-400" />}
                    {crumb.onClick ? (
                      <button onClick={crumb.onClick} className="hover:text-indigo-600 hover:underline">
                        {crumb.label}
                      </button>
                    ) : (
                      <span className={cn(i === breadcrumb.length - 1 && 'text-slate-700 font-medium')}>{crumb.label}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
            <h2 className="text-base font-semibold text-slate-900 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerExtra}
            <button onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={16} />
            </button>
          </div>
        </div>

        {tabs && tabs.length > 0 && (
          <div className="flex items-center border-b border-slate-100 px-3 shrink-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                  activeTab === tab.key
                    ? 'border-indigo-500 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {tab.icon && <tab.icon size={12} />}
                {tab.label}
                {tab.badge != null && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto p-5">
          {activeContent}
        </div>
      </div>
    </div>
  );
};

export default DrillModal;
