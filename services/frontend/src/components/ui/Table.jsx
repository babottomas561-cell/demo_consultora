import { cn } from './utils';

export const Table = ({ className, ...props }) => (
  <div className="overflow-x-auto">
    <table className={cn('min-w-full divide-y divide-slate-200 text-sm', className)} {...props} />
  </div>
);

export const THead = ({ className, ...props }) => (
  <thead className={cn('bg-slate-50', className)} {...props} />
);

export const TBody = ({ className, ...props }) => (
  <tbody className={cn('divide-y divide-slate-100', className)} {...props} />
);

export const TH = ({ className, ...props }) => (
  <th className={cn('px-5 py-3 text-left font-semibold text-slate-600', className)} {...props} />
);

export const TD = ({ className, ...props }) => (
  <td className={cn('px-5 py-3 text-slate-700', className)} {...props} />
);

export const TR = ({ className, ...props }) => (
  <tr className={cn('hover:bg-slate-50', className)} {...props} />
);
