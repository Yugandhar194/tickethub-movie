import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Search, Ticket, User } from 'lucide-react';
import { toast } from 'react-toastify';
import Logo from '../ui/Logo';
import Button from '../ui/Button';
import { homeFor, initials, useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/format';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/movies', label: 'Movies' },
  { to: '/contact', label: 'Contact' },
];

function UserMenu() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const staff = user.role === 'ADMIN' || user.role === 'THEATER_OWNER';
  const item = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-mute transition hover:bg-white/[0.06] hover:text-ink';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-crimson to-gold text-sm font-extrabold text-white ring-2 ring-white/10 transition hover:ring-white/30"
      >
        {initials(user.name)}
      </button>
      {open && (
        <div role="menu" className="glass absolute right-0 top-12 z-50 w-64 rounded-2xl p-2 shadow-lift">
          <div className="px-3 pb-2 pt-2">
            <p className="truncate font-bold">{user.name}</p>
            <p className="truncate text-xs text-mute">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-white/10" />
          {staff ? (
            <Link to={homeFor(user)} onClick={() => setOpen(false)} className={item} role="menuitem">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
          ) : (
            <>
              <Link to="/my-bookings" onClick={() => setOpen(false)} className={item} role="menuitem">
                <Ticket className="h-4 w-4" /> My bookings
              </Link>
              <Link to="/account" onClick={() => setOpen(false)} className={item} role="menuitem">
                <User className="h-4 w-4" /> Account details
              </Link>
            </>
          )}
          <button
            role="menuitem"
            className={cn(item, 'text-crimson-soft hover:text-crimson-soft')}
            onClick={() => {
              logout();
              setOpen(false);
              toast.success('You are signed out.');
              nav('/');
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar({ overlay }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { pathname, search } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (pathname === '/search') setQ(new URLSearchParams(search).get('q') || '');
  }, [pathname, search]);

  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const solid = scrolled || !overlay;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
        solid ? 'glass border-x-0 border-t-0' : 'border-b border-transparent bg-gradient-to-b from-black/70 to-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-3 sm:gap-6 sm:px-8">
        <Logo className="shrink-0 gap-2" />
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn('rounded-lg px-3 py-2 text-sm font-semibold transition', isActive ? 'bg-white/10 text-ink' : 'text-mute hover:text-ink')
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <form onSubmit={submit} role="search" className="relative ml-auto hidden w-full max-w-sm md:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            aria-label="Search movies"
            placeholder="Search movies"
            className="h-10 w-full rounded-full border border-white/10 bg-white/[0.06] pl-10 pr-4 text-sm placeholder:text-faint focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3 md:ml-0">
          <Link to="/search" aria-label="Search" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-mute hover:bg-white/10 hover:text-ink md:hidden">
            <Search className="h-5 w-5" />
          </Link>
          {user ? (
            <UserMenu />
          ) : (
            <Button to="/login" size="sm" className="h-9 max-[359px]:px-2 max-[359px]:text-xs">
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
