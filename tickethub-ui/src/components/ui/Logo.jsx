import { Link } from 'react-router-dom';
import { cn } from '../../lib/format';

export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        d="M10 20a6 6 0 0 1 6-6h32a6 6 0 0 1 6 6v5a7 7 0 0 0 0 14v5a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6v-5a7 7 0 0 0 0-14z"
        fill="#E11D48"
      />
      <path d="M26 24l15 8-15 8z" fill="#FAFAFA" />
    </svg>
  );
}

export default function Logo({ className, to = '/' }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5', className)} aria-label="TicketHub home">
      <LogoMark />
      <span className="text-[19px] font-extrabold tracking-tight">TicketHub</span>
    </Link>
  );
}
