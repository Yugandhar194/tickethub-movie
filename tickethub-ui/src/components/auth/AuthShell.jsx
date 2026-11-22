import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import Logo from '../ui/Logo';
import SmartImage from '../ui/SmartImage';
import { getNowPlaying } from '../../api/catalog';
import { img } from '../../lib/posters';

// Split screen: a tilted poster wall on the left, the form on the right.
export default function AuthShell({ title, subtitle, children, footer }) {
  const [posters, setPosters] = useState([]);
  useEffect(() => {
    let live = true;
    getNowPlaying().then((r) => live && setPosters(r.items.slice(0, 12))).catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const wall = posters.length ? posters : Array.from({ length: 12 }, (_, i) => ({ id: i, title: 'TicketHub', poster: null }));
  const cols = [0, 1, 2].map((c) => wall.filter((_, i) => i % 3 === c));

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-raised lg:block" aria-hidden>
        <div className="absolute inset-[-10%] flex gap-5" style={{ transform: 'rotate(-8deg) scale(1.1)' }}>
          {cols.map((col, c) => (
            <div key={c} className="flex flex-1 flex-col gap-5" style={{ marginTop: c === 1 ? '-60px' : c === 2 ? '40px' : 0 }}>
              {col.map((m) => (
                <SmartImage key={m.id} src={img(m.poster, 'w342')} title={m.title} className="aspect-[2/3] w-full rounded-poster shadow-lift ring-1 ring-white/10" />
              ))}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-obsidian/20 to-obsidian" />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-obsidian/60" />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="max-w-md text-3xl font-extrabold leading-tight">The seat you want, the show you love.</p>
        </div>
      </aside>
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between gap-3">
          <Logo className="shrink-0" />
          <Link to="/" className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border hairline px-3 text-sm font-semibold text-mute transition hover:bg-white/[0.06] hover:text-ink">
            <Home className="h-4 w-4" aria-hidden />
            Home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <div className="glass rounded-panel p-7 shadow-lift sm:p-9">
            <h1 className="text-2xl font-extrabold">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-mute">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
          {footer && <p className="mt-6 text-center text-sm text-mute">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
