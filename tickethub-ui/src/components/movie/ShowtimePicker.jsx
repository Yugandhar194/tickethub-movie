import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarX, MapPin, ServerOff } from 'lucide-react';
import { fetchBookedSeats } from '../../api/backend';
import { getLocalIndex } from '../../api/catalog';
import { AUTH_API_BASE_URL } from '../../config/env';
import { TOTAL_SEATS } from '../../config/seatTiers';
import { useAsync, useLocalStorage } from '../../hooks/useAsync';
import { addDays, cn, formatCurrency, formatDate, formatTime, showStart, toISODate } from '../../lib/format';
import { rememberShowtime } from '../../lib/bookingStore';
import { fetchShowtimes } from '../../api/backend';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';

const status = (free, total = TOTAL_SEATS) => {
  if (free <= 0) return 'sold';
  if (free / total <= 0.25) return 'fast';
  return 'open';
};
const pillTone = {
  open: 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10',
  fast: 'border-gold/50 text-gold-soft hover:bg-gold/10',
  sold: 'border-white/10 text-faint line-through cursor-not-allowed',
  started: 'border-white/10 text-faint cursor-not-allowed',
};

export function useShowtimes(movie) {
  return useAsync(async () => {
    if (!movie) return { shows: [], online: true };
    if (AUTH_API_BASE_URL) {
      const shows = await fetchShowtimes(movie.title, movie.title);
      return { shows, online: true };
    }
    if (!movie?.localId) {
      const idx = await getLocalIndex().catch(() => ({ online: false }));
      return { shows: [], online: idx.online };
    }
    const shows = await fetchShowtimes(movie.localId);
    return { shows, online: true };
  }, [movie?.localId, movie?.id, movie?.title]);
}

export default function ShowtimePicker({ movie, state }) {
  const nav = useNavigate();
  const { data, loading, error } = state;
  const cineholdMode = Boolean(AUTH_API_BASE_URL);
  const today = useMemo(() => new Date(), []);
  const todayISO = toISODate(today);
  const shows = useMemo(() => (data?.shows || []).filter((s) => s.date >= todayISO), [data, todayISO]);

  const windowDays = useMemo(() => Array.from({ length: 7 }, (_, i) => toISODate(addDays(today, i))), [today]);
  const later = useMemo(() => [...new Set(shows.map((s) => s.date))].filter((d) => !windowDays.includes(d)).sort().slice(0, 14), [shows, windowDays]);
  const days = [...windowDays, ...later];

  const [date, setDate] = useState(null);
  const [city, setCity] = useLocalStorage('th:city', '');
  const [format, setFormat] = useState('');
  const [free, setFree] = useState({});
  const asked = useRef(new Set());

  useEffect(() => {
    if (!shows.length) return;
    setDate((cur) => (cur && days.includes(cur) ? cur : days.find((d) => shows.some((s) => s.date === d)) || windowDays[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shows.length]);

  const cities = useMemo(() => [...new Set(shows.map((s) => (s.theater?.location || '').trim()).filter(Boolean))].sort(), [shows]);
  const formats = useMemo(() => [...new Set(shows.map((s) => s.format).filter(Boolean))].sort(), [shows]);
  const activeCity = cities.includes(city) ? city : '';

  const visible = useMemo(
    () =>
      shows
        .filter((s) => s.date === date)
        .filter((s) => !activeCity || (s.theater?.location || '').trim() === activeCity)
        .filter((s) => !format || s.format === format)
        .sort((a, b) => String(a.time).localeCompare(String(b.time))),
    [shows, date, activeCity, format]
  );

  // Seat availability is read from the booked-seat list of each visible show; the stored availableSeats value is not kept in sync by the backend.
  useEffect(() => {
    visible.forEach((s) => {
      if (asked.current.has(s.id)) return;
      asked.current.add(s.id);
      fetchBookedSeats(s.id)
        .then((rows) => setFree((f) => ({ ...f, [s.id]: (s.totalSeats || TOTAL_SEATS) - rows.length })))
        .catch(() => setFree((f) => ({ ...f, [s.id]: s.availableSeats > 0 ? s.availableSeats : (s.totalSeats || TOTAL_SEATS) })));
    });
  }, [visible]);

  const byTheater = useMemo(() => {
    const map = new Map();
    visible.forEach((s) => {
      const k = s.theater?.id ?? s.theater?.name ?? 'theater';
      if (!map.has(k)) map.set(k, { theater: s.theater || {}, shows: [] });
      map.get(k).shows.push(s);
    });
    return [...map.values()];
  }, [visible]);

  const open = (s) => {
    rememberShowtime({
      id: s.id,
      date: s.date,
      time: s.time,
      amount: s.amount,
      currency: s.currency || 'INR',
      format: s.format || '',
      theater: s.theater,
      seatMap: s.seatMap || null,
      totalSeats: s.totalSeats || TOTAL_SEATS,
      movie: {
        id: movie.id,
        title: movie.title,
        poster: movie.poster || s.movie?.poster_path,
        poster_path: movie.poster_path || s.movie?.poster_path || movie.poster,
        backdrop: movie.backdrop,
        runtime: movie.runtime || s.movie?.runtime,
      },
    });
    nav(`/book/${s.id}`);
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-32 w-full rounded-panel" />
      </div>
    );
  }

  if (error || data?.online === false) {
    return (
      <EmptyState icon={ServerOff} title="Showtimes are unavailable right now">
        {cineholdMode
          ? <>Sign in first, and confirm the Cinehold API and its database are running. We could not load its schedules.</>
          : <>We could not reach the TicketHub server. Check that the backend is running and try again.</>}
        {cineholdMode && <Link to="/login" className="ml-1 font-semibold text-ink underline underline-offset-4">Sign in</Link>}
      </EmptyState>
    );
  }

  if (!movie.localId && !cineholdMode) {
    const upcoming = movie.releaseDate && movie.releaseDate > todayISO;
    return (
      <EmptyState icon={CalendarX} title={upcoming ? `Tickets open closer to ${movie.releaseDate.slice(0, 4) === String(today.getFullYear()) ? 'release' : 'the release date'}` : 'Not scheduled at a TicketHub theater yet'}>
        {upcoming
          ? 'Showtimes appear here as soon as theaters add this film to their schedule.'
          : 'This film is playing elsewhere, but none of our theaters has scheduled it. An admin can add it from the dashboard.'}
      </EmptyState>
    );
  }

  if (!shows.length) {
    return (
      <EmptyState icon={CalendarX} title="No upcoming shows">
        Theaters have not scheduled this film for the coming days. Check back soon.
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0" role="tablist" aria-label="Choose a date">
        {days.map((d, i) => {
          const dt = new Date(`${d}T00:00:00`);
          const has = shows.some((s) => s.date === d);
          const active = d === date;
          return (
            <button
              key={d}
              role="tab"
              aria-selected={active}
              onClick={() => setDate(d)}
              className={cn(
                'relative flex w-[68px] shrink-0 flex-col items-center rounded-2xl border px-2 py-3 transition',
                active ? 'border-crimson bg-crimson text-white shadow-crimson' : 'hairline bg-white/[0.04] hover:bg-white/[0.09]',
                !has && !active && 'opacity-45'
              )}
            >
              <span className={cn('text-xs font-semibold', active ? 'text-white/85' : 'text-mute')}>{i === 0 ? 'Today' : dt.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
              <span className="num mt-1 text-xl font-extrabold">{dt.getDate()}</span>
              <span className={cn('text-xs', active ? 'text-white/85' : 'text-mute')}>{dt.toLocaleDateString('en-IN', { month: 'short' })}</span>
              {has && !active && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-400" aria-label="Shows available" />}
            </button>
          );
        })}
      </div>

      {(cities.length > 1 || formats.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {cities.length > 1 && (
            <>
              <Chip active={!activeCity} onClick={() => setCity('')}>All cities</Chip>
              {cities.map((c) => <Chip key={c} active={activeCity === c} onClick={() => setCity(c)}>{c}</Chip>)}
            </>
          )}
          {formats.length > 0 && (
            <>
              <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
              <Chip active={!format} onClick={() => setFormat('')}>All formats</Chip>
              {formats.map((f) => <Chip key={f} active={format === f} onClick={() => setFormat(f)}>{f}</Chip>)}
            </>
          )}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {byTheater.length === 0 ? (
          <p className="rounded-panel border hairline bg-white/[0.03] px-6 py-10 text-center text-mute">No shows on this day{activeCity ? ` in ${activeCity}` : ''}. Pick another date.</p>
        ) : (
          byTheater.map(({ theater, shows: list }) => (
            <div key={theater.id ?? theater.name} className="rounded-panel border hairline bg-white/[0.03] p-5 sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.07] text-gold"><MapPin className="h-4 w-4" aria-hidden /></span>
                <div>
                  <h3 className="font-bold">{theater.name}</h3>
                  {theater.location && <p className="text-sm text-mute">{theater.location}</p>}
                </div>
              </div>
              <ul className="flex flex-wrap gap-3">
                {list.map((s) => {
                  const f = free[s.id];
                  const totalSeats = s.totalSeats || TOTAL_SEATS;
                  const started = (showStart(s.date, s.time) || 0) < new Date();
                  const st = started ? 'started' : f === undefined ? 'open' : status(f, totalSeats);
                  const disabled = st === 'sold' || st === 'started';
                  const label = { open: 'Available', fast: 'Filling fast', sold: 'Sold out', started: 'Started' }[st];
                  return (
                    <li key={s.id}>
                      <button
                        disabled={disabled}
                        onClick={() => open(s)}
                        aria-label={`${formatTime(s.time)}, ${formatCurrency(s.amount, s.currency)}, ${label}`}
                        className={cn('min-w-[104px] rounded-xl border px-4 py-2.5 text-left transition', pillTone[st])}
                      >
                        <span className="num block text-[15px] font-extrabold">{formatTime(s.time)}</span>
                        <span className="num block text-xs opacity-80">{formatCurrency(s.amount, s.currency)}{s.format ? ` · ${s.format}` : ''}</span>
                        <span className="mt-1 block text-[11px] font-semibold opacity-90">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={cn('rounded-full border px-3.5 py-1.5 text-sm font-semibold transition', active ? 'border-gold/60 bg-gold/15 text-gold-soft' : 'hairline text-mute hover:text-ink')}>
      {children}
    </button>
  );
}
