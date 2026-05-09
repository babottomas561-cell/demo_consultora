import { cn } from './utils';

export const Table = ({ className, ...props }) => (
  <div className="overflow-x-auto">
    <table className={cn('min-w-full border-collapse text-sm', className)} {...props} />
  </div>
);

export const THead = ({ className, ...props }) => (
  <thead className={cn('bg-slate-50', className)} {...props} />
);

export const TBody = ({ className, ...props }) => (
  <tbody className={cn('divide-y divide-slate-100', className)} {...props} />
);

export const TH = ({ className, ...props }) => (
  <th className={cn('border-b border-slate-200 px-5 py-3 text-left text-xs font-semibold text-slate-600', className)} {...props} />
);

export const TD = ({ className, ...props }) => (
  <td className={cn('border-b border-slate-100 px-5 py-3 text-slate-700', className)} {...props} />
);

export const TR = ({ className, ...props }) => (
  <tr className={cn('hover:bg-slate-50', className)} {...props} />
);
