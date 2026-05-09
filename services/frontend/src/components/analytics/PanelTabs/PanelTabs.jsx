import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../../ui/utils';

const PanelTabs = ({
  tabs,
  paramKey = 'tab',
  variant = 'underline',
  className,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = searchParams.get(paramKey) ?? tabs[0]?.key;

  const setTab = (key) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(paramKey, key);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (!searchParams.has(paramKey) && tabs[0]) {
      setTab(tabs[0].key);
    }
  }, []);

  if (variant === 'pills') {
    return (
      <div className={cn('inline-flex rounded-[9px] bg-slate-100 p-[3px] shadow-[inset_0_0_0_1px_var(--slate-200)] overflow-x-auto', className)}>
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              active === key
                ? 'bg-white text-slate-900 shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_0_0_1px_rgba(15,23,42,0.04)]'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {Icon && <Icon size={13} />}
            {label}
            {count != null && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', active === key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600')}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-0 border-b border-slate-200 overflow-x-auto', className)}>
      {tabs.map(({ key, label, icon: Icon, count }) => (
        <button
          key={key}
          onClick={() => setTab(key)}
          className={cn(
            'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            active === key
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          )}
        >
          {Icon && <Icon size={14} />}
          {label}
          {count != null && (
            <span className={cn('rounded-full px-1.5 text-[10px] font-bold', active === key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500')}>
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export { PanelTabs };
export default PanelTabs;
