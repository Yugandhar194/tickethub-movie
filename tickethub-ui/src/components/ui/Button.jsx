import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/format';

const variants = {
  primary: 'bg-crimson text-white shadow-crimson hover:bg-[#f43f5e] active:bg-crimson-deep disabled:shadow-none',
  amber: 'bg-gold text-obsidian hover:bg-gold-soft',
  secondary: 'bg-white/[0.08] text-ink hover:bg-white/[0.14] border border-white/10',
  ghost: 'text-mute hover:text-ink hover:bg-white/[0.06]',
  danger: 'bg-transparent text-crimson-soft border border-crimson/40 hover:bg-crimson/10',
};
const sizes = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-7 text-base gap-2 rounded-xl',
};

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', to, href, loading, className, children, disabled, type = 'button', ...rest },
  ref
) {
  const cls = cn(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45',
    variants[variant],
    sizes[size],
    className
  );
  if (to) return <Link ref={ref} to={to} className={cls} {...rest}>{children}</Link>;
  if (href) return <a ref={ref} href={href} className={cls} {...rest}>{children}</a>;
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
export default Button;
