import { cn } from '../../ui/utils';
import Card from '../../ui/Card';

const Pulse = ({ className }) => (
  <div className={cn('animate-pulse rounded bg-slate-200', className)} />
);

export const SkeletonKPI = ({ className }) => (
  <Card className={cn('min-h-[118px] border-t-[3px] border-t-slate-200 p-5', className)}>
    <Pulse className="h-3 w-20 mb-3" />
    <Pulse className="h-8 w-28 rounded-lg" />
    <Pulse className="mt-2 h-2.5 w-16" />
  </Card>
);

export const SkeletonChart = ({ variant = 'bar', className }) => (
  <Card className={cn('p-5', className)}>
    <div className="flex items-center justify-between mb-4">
      <Pulse className="h-4 w-32" />
      <Pulse className="h-7 w-20 rounded-lg" />
    </div>
    {variant === 'pie' ? (
      <div className="flex justify-center py-6">
        <Pulse className="h-40 w-40 rounded-full" />
      </div>
    ) : (
      <div className="flex items-end gap-2 h-40">
        {[60, 85, 40, 75, 55, 90, 65, 50, 80, 70].map((h, i) => (
          <Pulse key={i} style={{ height: `${h}%` }} className="flex-1" />
        ))}
      </div>
    )}
  </Card>
);

export const SkeletonTable = ({ rows = 5, cols = 4, className }) => (
  <Card className={cn('overflow-hidden', className)}>
    <div className="p-4 border-b border-slate-100">
      <Pulse className="h-4 w-32" />
    </div>
    <div>
      <div className="flex gap-3 px-4 py-2 border-b border-slate-100">
        {Array.from({ length: cols }).map((_, i) => (
          <Pulse key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 px-4 py-3 border-b border-slate-50">
          {Array.from({ length: cols }).map((_, c) => (
            <Pulse key={c} className={cn('h-3 flex-1', c === 0 && 'w-24 flex-none')} />
          ))}
        </div>
      ))}
    </div>
  </Card>
);

export const SkeletonPage = ({ kpis = 4, className }) => (
  <div className={cn('space-y-6', className)}>
    <div className={cn('grid gap-4', `grid-cols-${kpis}`)}>
      {Array.from({ length: kpis }).map((_, i) => <SkeletonKPI key={i} />)}
    </div>
    <SkeletonChart />
    <div className="grid grid-cols-2 gap-4">
      <SkeletonTable />
      <SkeletonTable />
    </div>
  </div>
);

const SkeletonLoader = ({ variant = 'kpi', ...props }) => {
  if (variant === 'chart') return <SkeletonChart {...props} />;
  if (variant === 'table') return <SkeletonTable {...props} />;
  if (variant === 'page')  return <SkeletonPage {...props} />;
  return <SkeletonKPI {...props} />;
};

export default SkeletonLoader;
