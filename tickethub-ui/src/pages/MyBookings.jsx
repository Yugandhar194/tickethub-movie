import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Ticket as TicketIcon, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { cancelBooking, errorMessage, fetchBookingsByUser } from '../api/backend';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { loadBookingMeta } from '../lib/bookingStore';
import { bookingCode, cn, formatDate, formatINR, formatTime, showStart } from '../lib/format';
import { img } from '../lib/posters';
import SmartImage from '../components/ui/SmartImage';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import TicketPass from '../components/movie/TicketPass';

const HOURS = 3600000;

export default function MyBookings() {
  const { user } = useAuth();
  const { data, loading, error, setData, reload } = useAsync(() => fetchBookingsByUser(user.id), [user.id]);
  const [tab, setTab] = useState('upcoming');
  const [pass, setPass] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const rows = (data || []).map((b) => ({ ...b, start: showStart(b.showtime?.date, b.showtime?.time) }));
    return {
      upcoming: rows.filter((b) => !b.start || b.start.getTime() >= now).sort((a, b) => (a.start || 0) - (b.start || 0)),
      past: rows.filter((b) => b.start && b.start.getTime() < now).sort((a, b) => b.start - a.start),
    };
  }, [data]);

  const list = tab === 'upcoming' ? upcoming : past;

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await cancelBooking(cancelling.id);
      setData((data || []).filter((b) => b.id !== cancelling.id));
      toast.success('Booking cancelled. Your seats are released.');
      setCancelling(null);
    } catch (e) {
      toast.error(errorMessage(e, 'We could not cancel this booking.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-extrabold">My bookings</h1>
      <div className="mt-6 inline-flex rounded-full bg-white/[0.06] p-1" role="tablist">
        {[['upcoming', 'Upcoming', upcoming.length], ['past', 'Past', past.length]].map(([id, label, n]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('rounded-full px-5 py-2 text-sm font-semibold transition', tab === id ? 'bg-white text-obsidian' : 'text-mute hover:text-ink')}>
            {label} <span className="num opacity-60">{n}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {loading && !data && [0, 1, 2].map((i) => <Skeleton key={i} className="h-36 w-full rounded-panel" />)}
        {error && !data && (
          <EmptyState icon={TicketIcon} title="We could not load your bookings" action={<Button variant="secondary" onClick={reload}>Try again</Button>}>Check that the TicketHub server is running.</EmptyState>
        )}
        {data && list.length === 0 && (
          <EmptyState icon={TicketIcon} title={tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings yet'} action={tab === 'upcoming' && <Button to="/movies">Find a film</Button>}>
            {tab === 'upcoming' ? 'When you book a show, your pass appears here.' : 'Shows you have watched are listed here.'}
          </EmptyState>
        )}
        {list.map((b) => {
          const s = b.showtime || {};
          const m = s.movie || {};
          const seats = b.seatNumbers?.length ? b.seatNumbers : loadBookingMeta(b.id)?.seats || [];
          const pending = b.status === 'PENDING';
          const canCancel = tab === 'upcoming' && b.start && b.start.getTime() - Date.now() > 2 * HOURS;
          return (
            <article key={b.id} className="flex gap-4 rounded-panel border hairline bg-white/[0.03] p-4 sm:gap-6 sm:p-5">
              <SmartImage src={img(m.poster_path, 'w342')} title={m.title} className="h-32 w-[86px] shrink-0 rounded-xl sm:h-36 sm:w-24" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-extrabold">{m.title}</h2>
                    <p className="truncate text-sm text-mute">{s.theater?.name}{s.theater?.location ? `, ${s.theater.location}` : ''}</p>
                  </div>
                  <span className="num shrink-0 text-xs text-faint">{pending ? 'Awaiting payment' : bookingCode(b.id)}</span>
                </div>
                <p className="num mt-2 text-sm"><span className="font-semibold">{formatDate(s.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>, {formatTime(s.time)}</p>
                <p className="num mt-1 text-sm text-mute">{seats.length ? seats.join(', ') : `${b.noOfSeat} ${b.noOfSeat === 1 ? 'seat' : 'seats'}`}{s.amount ? ` · ${formatINR(s.amount * b.noOfSeat)}` : ''}</p>
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {pending ? (
                    <Button size="sm" to={`/checkout/${b.id}`}>Pay to confirm</Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setPass(b)}><QrCode className="h-4 w-4" aria-hidden />Show pass</Button>
                  )}
                  {canCancel && <Button size="sm" variant="danger" onClick={() => setCancelling(b)}>Cancel booking</Button>}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Modal open={Boolean(pass)} onClose={() => setPass(null)} title="Your pass" size="sm" bare>
        {pass && (
          <div className="relative">
            <button onClick={() => setPass(null)} aria-label="Close" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/50 backdrop-blur hover:bg-black/70"><X className="h-5 w-5" /></button>
            <div className="max-h-[92vh] overflow-y-auto"><TicketPass booking={pass} seats={pass.seatNumbers?.length ? pass.seatNumbers : loadBookingMeta(pass.id)?.seats || []} /></div>
            <div className="mt-3 text-center"><Link to={`/tickets/${pass.id}`} onClick={() => setPass(null)} className="text-sm font-semibold text-ink underline underline-offset-4">Open full ticket page</Link></div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(cancelling)} onClose={() => setCancelling(null)} title="Cancel this booking?" size="sm">
        <p className="text-sm leading-relaxed text-zinc-300">
          <span className="font-semibold text-ink">{cancelling?.showtime?.movie?.title}</span> on {formatDate(cancelling?.showtime?.date)} at {formatTime(cancelling?.showtime?.time)}. Cancelling releases your seats and cannot be undone. See the <Link to="/returns" className="font-semibold text-gold-soft underline underline-offset-4">return policy</Link> for what happens to your payment.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setCancelling(null)}>Keep booking</Button>
          <Button variant="primary" loading={busy} onClick={confirmCancel}>Cancel booking</Button>
        </div>
      </Modal>
    </div>
  );
}
