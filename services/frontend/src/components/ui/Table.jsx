import { cn } from './utils';

export const Table = ({ className, ...props }) => (
  <div
    className="overflow-x-auto"
    style={{
      background: 'linear-gradient(to right, white 30%, rgba(255,255,255,0)), linear-gradient(to right, rgba(255,255,255,0), white 70%) right, radial-gradient(farthest-side at 0 50%, rgba(0,0,0,.08), rgba(0,0,0,0)), radial-gradient(farthest-side at 100% 50%, rgba(0,0,0,.08), rgba(0,0,0,0)) right',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '40px 100%, 40px 100%, 14px 100%, 14px 100%',
      backgroundAttachment: 'local, local, scroll, scroll',
    }}
  >
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
