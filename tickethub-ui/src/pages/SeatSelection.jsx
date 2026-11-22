import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronUp, Clock, TriangleAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import { createBooking, errorMessage, fetchBookedSeats } from '../api/backend';
import { useAuth } from '../context/AuthContext';
import { SEAT_HOLD_MINUTES } from '../config/env';
import { saveBookingMeta, recallShowtime } from '../lib/bookingStore';
import { computeTotals, seatPrice } from '../lib/pricing';
import { cn, formatDate, formatINR, formatTime, toISODate } from '../lib/format';
import { img } from '../lib/posters';
import SmartImage from '../components/ui/SmartImage';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ScreenCurve from '../components/seats/ScreenCurve';
import SeatMap, { SeatLegend } from '../components/seats/SeatMap';

const MAX_SEATS = 8;
const fmtClock = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

function Summary({ show, selected, totals, remaining, onContinue, busy, compact }) {
  const holdMs = SEAT_HOLD_MINUTES * 60000;
  return (
    <div className={cn('space-y-5', compact && 'space-y-4')}>
      {!compact && (
        <div className="flex gap-4">
          <SmartImage src={img(show.movie?.poster, 'w154')} title={show.movie?.title} className="h-24 w-16 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <h2 className="line-clamp-2 font-extrabold leading-snug">{show.movie?.title}</h2>
            <p className="mt-1 text-sm text-mute">{show.theater?.name}</p>
            <p className="num text-sm text-mute">{formatDate(show.date, { weekday: 'short', day: 'numeric', month: 'short' })}, {formatTime(show.time)}</p>
          </div>
        </div>
      )}
      <div>
        <p className="mb-2 text-xs text-mute">Your seats</p>
        {selected.length ? (
          <ul className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <li key={s} className="num rounded-lg bg-crimson/15 px-2.5 py-1.5 text-sm font-bold text-crimson-soft">{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-faint">Tap a seat to add it. You can pick up to {MAX_SEATS}.</p>
        )}
      </div>
      <dl className="num space-y-2 border-t hairline pt-4 text-sm">
        <div className="flex justify-between"><dt className="text-mute">Tickets ({selected.length})</dt><dd>{formatINR(totals.tickets)}</dd></div>
        {totals.fee > 0 && <div className="flex justify-between"><dt className="text-mute">Convenience fee</dt><dd>{formatINR(totals.fee)}</dd></div>}
        {totals.tax > 0 && <div className="flex justify-between"><dt className="text-mute">Taxes</dt><dd>{formatINR(totals.tax)}</dd></div>}
        <div className="flex justify-between border-t hairline pt-3 text-lg font-extrabold"><dt>Total</dt><dd>{formatINR(totals.total)}</dd></div>
      </dl>
      {remaining !== null && selected.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-mute"><Clock className="h-3.5 w-3.5" aria-hidden />Selection held for</span>
            <span className={cn('num font-bold', remaining < 60000 ? 'text-crimson-soft' : 'text-ink')} role="timer">{fmtClock(remaining)}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
            <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', remaining < 60000 ? 'bg-crimson' : 'bg-gold')} style={{ width: `${(remaining / holdMs) * 100}%` }} />
          </div>
        </div>
      )}
      <Button size="lg" className="w-full" disabled={!selected.length} loading={busy} onClick={onContinue}>
        {selected.length ? `Continue with ${selected.length} ${selected.length === 1 ? 'seat' : 'seats'}` : 'Select seats'}
      </Button>
    </div>
  );
}

export default function SeatSelection() {
  const { showtimeId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const show = useMemo(() => recallShowtime(showtimeId), [showtimeId]);
  const [taken, setTaken] = useState({});
  const [selected, setSelected] = useState([]);
  const [deadline, setDeadline] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [terms, setTerms] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const loadSeats = useCallback(async () => {
    try {
      const rows = await fetchBookedSeats(showtimeId);
      const map = {};
      rows.forEach((r) => {
        map[r.seatNo] = String(r.status || '').toUpperCase() === 'LOCKED' ? 'held' : 'occupied';
      });
      setTaken(map);
      setLoadError(false);
      const lost = selectedRef.current.filter((s) => map[s]);
      if (lost.length) {
        setSelected((cur) => cur.filter((s) => !map[s]));
        toast.warn(`${lost.join(', ')} ${lost.length > 1 ? 'were' : 'was'} just booked by someone else.`);
      }
      return map;
    } catch {
      setLoadError(true);
      return null;
    }
  }, [showtimeId]);

  useEffect(() => {
    loadSeats();
    const t = setInterval(loadSeats, 20000);
    return () => clearInterval(t);
  }, [loadSeats]);

  // Client-side hold: the backend has no seat-lock call, so this only resets the on-screen selection.
  useEffect(() => {
    if (!selected.length) {
      setDeadline(null);
      return;
    }
    setDeadline((d) => d || Date.now() + SEAT_HOLD_MINUTES * 60000);
  }, [selected.length]);

  useEffect(() => {
    if (!deadline) return undefined;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= deadline) {
        setSelected([]);
        setDeadline(null);
        setTerms(false);
        toast.info('Your seat hold ended. Pick your seats again.');
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadline]);

  const toggle = (id) => {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((s) => s !== id);
      if (cur.length >= MAX_SEATS) {
        toast.info(`You can book up to ${MAX_SEATS} seats at a time.`);
        return cur;
      }
      return [...cur, id].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    });
  };

  const base = Number(show?.amount) || 0;
  const totals = computeTotals({ seats: selected, basePrice: base });
  const remaining = deadline ? Math.max(0, deadline - now) : null;

  const confirm = async () => {
    setBusy(true);
    try {
      // Last check before the booking is written: the backend does not reject a seat that is already taken.
      const fresh = await loadSeats();
      if (fresh && selected.some((s) => fresh[s])) {
        setTerms(false);
        return;
      }
      const res = await createBooking({
        bookingDate: toISODate(new Date()),
        noOfSeat: selected.length,
        showtime: Number(showtimeId),
        user: user.id,
        seatNumbers: selected,
      });
      const bookingId = typeof res === 'object' && res !== null ? res.bookingId ?? res.BookingId : res;
      saveBookingMeta(bookingId, { seats: selected, showtimeId: Number(showtimeId), basePrice: base, show });
      nav(`/checkout/${bookingId}`, { replace: true });
    } catch (e) {
      toast.error(errorMessage(e, 'We could not create your booking. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (!show) {
    return (
      <EmptyState icon={TriangleAlert} title="Choose a showtime first" className="pt-28" action={<Button to="/movies">Browse movies</Button>}>
        Open a film and pick a time. Your seat map opens from there.
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-40 pt-6 sm:px-8 lg:pb-16">
      <div className="mb-6">
        <Link to={`/movies/${show.movie?.id}#showtimes`} className="text-sm font-semibold text-mute hover:text-ink">Back to showtimes</Link>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{show.movie?.title}</h1>
        <p className="num mt-1 text-sm text-mute">{show.theater?.name}{show.theater?.location ? `, ${show.theater.location}` : ''} on {formatDate(show.date, { weekday: 'short', day: 'numeric', month: 'short' })} at {formatTime(show.time)}</p>
      </div>

      {loadError && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-crimson/40 bg-crimson/10 px-4 py-3 text-sm text-crimson-soft">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Taken seats could not be loaded, so the map may be out of date. We will retry in a few seconds.
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        <section aria-label="Seat map" className="min-w-0">
          <ScreenCurve />
          <div className="mt-4 pl-5 pr-0 sm:pl-6 sm:pr-14"><SeatMap seatStates={taken} selected={selected} onToggle={toggle} basePrice={base} /></div>
          <div className="mt-8"><SeatLegend basePrice={base} showHeld={Object.values(taken).includes('held')} /></div>
        </section>

        <aside className="glass hidden h-fit rounded-panel p-6 lg:sticky lg:top-24 lg:block" aria-label="Booking summary">
          <Summary show={show} selected={selected} totals={totals} remaining={remaining} onContinue={() => setTerms(true)} busy={busy} />
        </aside>
      </div>

      {/* Mobile summary bar and sheet */}
      <div className="glass no-print fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <button onClick={() => setSheet((s) => !s)} aria-expanded={sheet} className="flex w-full items-center justify-between px-4 pt-3 text-left">
          <span>
            <span className="block text-xs text-mute">{selected.length ? selected.join(', ') : 'No seats selected'}</span>
            <span className="num text-lg font-extrabold">{formatINR(totals.total)}</span>
          </span>
          <ChevronUp className={cn('h-5 w-5 text-mute transition', sheet && 'rotate-180')} aria-hidden />
        </button>
        {sheet && (
          <div className="px-4 pt-3">
            <dl className="num space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-mute">Tickets ({selected.length})</dt><dd>{formatINR(totals.tickets)}</dd></div>
              {totals.fee > 0 && <div className="flex justify-between"><dt className="text-mute">Convenience fee</dt><dd>{formatINR(totals.fee)}</dd></div>}
              {totals.tax > 0 && <div className="flex justify-between"><dt className="text-mute">Taxes</dt><dd>{formatINR(totals.tax)}</dd></div>}
            </dl>
          </div>
        )}
        <div className="px-4 pb-3 pt-3">
          {remaining !== null && <p className="num mb-2 text-center text-xs text-mute" role="timer">Held for {fmtClock(remaining)}</p>}
          <Button size="lg" className="w-full" disabled={!selected.length} loading={busy} onClick={() => setTerms(true)}>
            {selected.length ? `Continue with ${selected.length} ${selected.length === 1 ? 'seat' : 'seats'}` : 'Select seats'}
          </Button>
        </div>
      </div>

      <Modal open={terms} onClose={() => setTerms(false)} title="Before you pay" size="md">
        <ul className="space-y-3 text-sm leading-relaxed text-zinc-300">
          <li>Food and beverages you pre-book are collected at the counter with your booking ID.</li>
          <li>3D glasses, where a show needs them, are charged on top of the ticket price.</li>
          <li>Cancel at least 2 hours before the show starts. Convenience fees and taxes are not refunded.</li>
        </ul>
        <p className="mt-4 text-sm"><Link to="/terms" target="_blank" className="font-semibold text-gold-soft underline underline-offset-4">Read the full terms</Link></p>
        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 accent-crimson" />
          <span>I have read and agree to the terms and cancellation policy.</span>
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setTerms(false)}>Back</Button>
          <Button disabled={!agree} loading={busy} onClick={confirm}>Continue to payment</Button>
        </div>
      </Modal>
    </div>
  );
}
