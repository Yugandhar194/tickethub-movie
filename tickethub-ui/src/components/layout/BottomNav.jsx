import { NavLink } from 'react-router-dom';
import { Clapperboard, Home, Search, Ticket, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/format';

export default function BottomNav() {
  const { user } = useAuth();
  const staff = user && (user.role === 'ADMIN' || user.role === 'THEATER_OWNER');
  const items = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/movies', label: 'Movies', icon: Clapperboard },
    { to: '/search', label: 'Search', icon: Search },
    { to: user ? (staff ? '/admin' : '/my-bookings') : '/login', label: staff ? 'Dashboard' : 'Tickets', icon: Ticket },
    { to: user && !staff ? '/account' : '/login', label: user ? 'Account' : 'Sign in', icon: User },
  ];
  return (
    <nav aria-label="Mobile" className="glass no-print fixed bottom-0 left-0 z-50 w-screen min-w-0 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto grid min-h-16 max-w-md grid-cols-5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={label}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn('flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold transition', isActive ? 'text-crimson-soft' : 'text-faint')
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
