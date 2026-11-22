import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import SmartImage from '../ui/SmartImage';
import Skeleton from '../ui/Skeleton';
import { formatUSDCompact } from '../../lib/format';
import { img } from '../../lib/posters';

export default function BoxOfficeTicker({ data, loading, onRefresh }) {
  const items = data?.items || [];
  const max = Math.max(...items.map((m) => m.revenue || 0), 1);
  const updated = data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';

  let note = '';
  if (data) {
    if (data.source === 'demo') note = 'Sample figures for the offline demo set.';
    else if (data.source === 'local') note = 'Worldwide gross in US dollars, as stored in the TicketHub database.';
    else if (data.ranked) note = `Worldwide gross to date in US dollars, as reported by TMDB. Updated ${updated}.`;
    else note = 'Gross is not reported yet for these releases, so they are ordered by how much people are watching.';
  }

  return (
    <section aria-labelledby="bo-title" className="border-y hairline bg-raised/60">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="bo-title" className="flex items-center gap-2.5 text-lg font-extrabold">
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-crimson opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-crimson" />
              </span>
              Box office
            </h2>
            {note ? (
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-mute sm:text-sm">{note}</p>
            ) : (
              <div className="mt-1 max-w-xl">
                <Skeleton className="h-4 w-80" />
              </div>
            )}
          </div>
          {onRefresh && (
            <button onClick={onRefresh} aria-label="Refresh box office" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-mute transition hover:bg-white/10 hover:text-ink">
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
        <ol className="no-scrollbar -mx-4 flex overflow-x-auto px-4 sm:-mx-8 sm:px-8">
          {loading || !items.length
            ? Array.from({ length: 5 }, (_, i) => (
                <li key={i} className="w-[270px] shrink-0 border-l hairline px-5 first:border-l-0 first:pl-0">
                  <Skeleton className="h-16 w-full" />
                </li>
              ))
            : items.map((m, i) => (
                <li key={m.id} className="w-[270px] shrink-0 border-l hairline px-5 first:border-l-0 first:pl-0">
                  <Link to={`/movies/${m.id}`} className="group flex items-center gap-3.5">
                    <span className="num w-7 text-right text-3xl font-extrabold text-white/25 transition group-hover:text-crimson-soft">{i + 1}</span>
                    <SmartImage src={img(m.poster, 'w154')} title={m.title} alt="" className="h-[60px] w-10 shrink-0 rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{m.title}</span>
                      <span className="num mt-0.5 block text-lg font-extrabold text-gold">{data.ranked ? formatUSDCompact(m.revenue) : '—'}</span>
                      {data.ranked && (
                        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
                          <motion.span
                            className="block h-full rounded-full bg-gradient-to-r from-crimson to-gold"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${Math.max(6, (m.revenue / max) * 100)}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: i * 0.05 }}
                          />
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
        </ol>
      </div>
    </section>
  );
}
