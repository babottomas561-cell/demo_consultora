import { cn } from './utils';

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-red-600',
};

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
  icon: 'h-9 w-9 p-0',
};

const Button = ({ as: Comp = 'button', variant = 'primary', size = 'md', className, children, ...props }) => (
  <Comp
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-ui border font-medium shadow-ui transition-colors disabled:pointer-events-none disabled:opacity-50 ui-focus',
      variants[variant],
      sizes[size],
      className
    )}
    {...props}
  >
    {children}
  </Comp>
);

export default Button;
