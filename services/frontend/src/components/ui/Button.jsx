import { cn } from './utils';

const variants = {
  primary: 'border-transparent bg-indigo-600 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0))] text-white shadow-[inset_0_-1px_0_rgba(15,23,42,0.12),0_1px_1px_rgba(15,23,42,0.08)] hover:bg-indigo-700',
  secondary: 'border-slate-200 bg-white text-slate-700 shadow-[inset_0_1px_0_#fff,0_1px_1px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900',
  ghost: 'border-transparent bg-transparent text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 shadow-none',
  danger: 'border-transparent bg-red-600 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0))] text-white shadow-[inset_0_-1px_0_rgba(15,23,42,0.12),0_1px_1px_rgba(15,23,42,0.08)] hover:bg-red-700',
  success: 'border-transparent bg-emerald-600 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0))] text-white shadow-[inset_0_-1px_0_rgba(15,23,42,0.12),0_1px_1px_rgba(15,23,42,0.08)] hover:bg-emerald-700',
};

const sizes = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-9 px-3.5 text-[13px] rounded-lg',
  lg: 'h-11 px-5 text-sm rounded-[10px]',
  icon: 'h-9 w-9 p-0',
};

const Button = ({ as: Comp = 'button', variant = 'primary', size = 'md', loading = false, className, children, ...props }) => (
  <Comp
    className={cn(
      'relative inline-flex select-none items-center justify-center gap-2 border font-medium leading-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-55 ui-focus',
      variants[variant],
      sizes[size],
      className
    )}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" />}
    {children}
  </Comp>
);

export default Button;
