import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Clock, Minus, Plus, ShieldCheck, TriangleAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import { confirmPayment, createPaymentOrder, errorMessage, fetchBooking } from '../api/backend';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { AUTH_API_BASE_URL, RAZORPAY_KEY_ID } from '../config/env';
import { FOOD_ITEMS } from '../config/food';
import { loadBookingMeta, saveBookingMeta } from '../lib/bookingStore';
import { computeTotals } from '../lib/pricing';
import { bookingCode, cn, formatCurrency, formatDate, formatTime } from '../lib/format';
import { img } from '../lib/posters';
import SmartImage from '../components/ui/SmartImage';
import Skeleton from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Checkout() {
  const { bookingId } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { data: booking, loading, error } = useAsync(() => fetchBooking(bookingId), [bookingId]);
  const meta = useMemo(() => loadBookingMeta(bookingId), [bookingId]);
  const [qty, setQty] = useState({});
  const [paying, setPaying] = useState(false);

  const show = booking?.showtime;
  const currency = show?.currency || 'INR';
  const canOrderFood = !AUTH_API_BASE_URL || currency === 'INR';
  const seats = booking?.seatNumbers?.length ? booking.seatNumbers : meta?.seats || [];
  const [now, setNow] = useState(Date.now());
  const remaining = booking?.status === 'PENDING' && booking.expiresAt ? Math.max(0, booking.expiresAt - now) : null;
  const expired = remaining === 0 || booking?.status === 'EXPIRED';
  const base = Number(show?.amount) || 0;
  const foodTotal = FOOD_ITEMS.reduce((sum, f) => sum + f.price * (qty[f.id] || 0), 0);
  const totals = computeTotals({ seats: seats.length ? seats : Array.from({ length: booking?.noOfSeat || 0 }, (_, i) => `A${i + 1}`), basePrice: base, fnb: foodTotal });

  useEffect(() => {
    if (remaining === null) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [remaining === null]);

  useEffect(() => {
    if (booking && meta) saveBookingMeta(bookingId, { ...meta, food: FOOD_ITEMS.filter((f) => qty[f.id]).map((f) => ({ name: f.name, qty: qty[f.id], price: f.price })) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty]);

  const step = (id, d) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(10, (q[id] || 0) + d)) }));

  const pay = async () => {
    setPaying(true);
    try {
      const foodItems = FOOD_ITEMS.filter((f) => qty[f.id]).map((f) => ({ id: f.id, quantity: qty[f.id] }));
      const order = await createPaymentOrder(bookingId, totals.total, foodItems);
      if (order.mock) {
        await confirmPayment(order.id, 'demo_payment');
        toast.success('Demo payment confirmed. No real charge was made.');
        nav(`/tickets/${bookingId}`, { replace: true, state: { paid: true } });
        return;
      }
      if (!(await loadRazorpay())) throw new Error('The payment window could not load. Check your connection and try again.');
      const rzp = new window.Razorpay({
        key: order.key_id || RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'TicketHub',
        description: `Booking ${bookingCode(bookingId)}`,
        order_id: order.id,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#E11D48' },
        modal: { ondismiss: () => setPaying(false) },
        handler: async (response) => {
          try {
            // The API finds the pending booking through its persisted gateway order ID.
            await confirmPayment(order.id, response.razorpay_payment_id, response.razorpay_signature);
          } catch (verificationError) {
            toast.error(errorMessage(verificationError, 'Payment could not be verified. Do not retry until you check your booking status.'));
            toast.warn('Payment went through, but we could not record it. Keep this booking ID and contact support.');
            setPaying(false);
            return;
          }
          toast.success('Payment received.');
          nav(`/tickets/${bookingId}`, { replace: true, state: { paid: true } });
        },
      });
      rzp.on?.('payment.failed', (r) => {
        toast.error(r?.error?.description || 'The payment failed. You have not been charged.');
        setPaying(false);
      });
      rzp.open();
    } catch (e) {
      toast.error(errorMessage(e, 'We could not start the payment.'));
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] space-y-4 px-4 py-10 sm:px-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full rounded-panel" />
      </div>
    );
  }
  if (error || !booking) {
    return <EmptyState icon={TriangleAlert} title="We could not load this booking" className="pt-28" action={<Button to="/my-bookings" variant="secondary">My bookings</Button>}>It may have been cancelled, or the link is wrong.</EmptyState>;
  }
  if (booking.status === 'CONFIRMED') {
    return <EmptyState icon={ShieldCheck} title="This booking is already paid" className="pt-28" action={<Button to={`/tickets/${bookingId}`}>View ticket</Button>}>Your seats are confirmed.</EmptyState>;
  }
  if (booking.status === 'PAYMENT_ISSUE') {
    return <EmptyState icon={TriangleAlert} title="Payment needs support" className="pt-28" action={<Button to="/contact" variant="secondary">Contact support</Button>}>Payment was received, but the seat hold could not be confirmed. Do not retry payment.</EmptyState>;
  }
  if (expired || booking.status === 'CANCELLED') {
    return <EmptyState icon={Clock} title="Your seat hold ended" className="pt-28" action={<Button to="/movies">Choose seats again</Button>}>Seats are held for a few minutes while you pay. Yours were released so others can book them.</EmptyState>;
  }
  if (booking.user?.id && user?.id && booking.user.id !== user.id) {
    return <EmptyState icon={TriangleAlert} title="This booking belongs to another account" className="pt-28" action={<Button to="/">Go home</Button>}>Sign in with the account that made the booking to pay for it.</EmptyState>;
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-8">
      <h1 className="text-3xl font-extrabold">Checkout</h1>
      <p className="mt-1 text-mute">Booking <span className="num font-semibold text-ink">{bookingCode(bookingId)}</span>. Add snacks, then pay to confirm your seats.</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="fnb">
          <h2 id="fnb" className="mb-4 text-xl font-extrabold">Food and drinks</h2>
          {!canOrderFood && <p className="mb-4 rounded-xl border hairline bg-white/[0.03] p-4 text-sm text-mute">Food prices are not configured for {currency}; you can continue with tickets only.</p>}
          {canOrderFood && <ul className="grid gap-4 sm:grid-cols-2">
            {FOOD_ITEMS.map((f) => {
              const n = qty[f.id] || 0;
              return (
                <li key={f.id} className={cn('flex items-center gap-4 rounded-2xl border p-3 transition', n ? 'border-gold/40 bg-gold/[0.06]' : 'hairline bg-white/[0.03]')}>
                  <img src={f.image} alt="" loading="lazy" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold">{f.name}</h3>
                    <p className="num text-sm text-mute">{formatCurrency(f.price, currency)}</p>
                  </div>
                  {n === 0 ? (
                    <Button size="sm" variant="secondary" onClick={() => step(f.id, 1)} aria-label={`Add ${f.name}`}>Add</Button>
                  ) : (
                    <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1" role="group" aria-label={`${f.name} quantity`}>
                      <button onClick={() => step(f.id, -1)} aria-label={`Remove one ${f.name}`} className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/10"><Minus className="h-4 w-4" /></button>
                      <span className="num w-5 text-center text-sm font-bold" aria-live="polite">{n}</span>
                      <button onClick={() => step(f.id, 1)} aria-label={`Add one more ${f.name}`} className="grid h-8 w-8 place-items-center rounded-md hover:bg-white/10"><Plus className="h-4 w-4" /></button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>}
        </section>

        <aside className="glass h-fit rounded-panel p-6 lg:sticky lg:top-24" aria-label="Order summary">
          <div className="flex gap-4">
            <SmartImage src={img(show?.movie?.poster_path, 'w154')} title={show?.movie?.title} className="h-24 w-16 shrink-0 rounded-lg" />
            <div className="min-w-0">
              <h2 className="font-extrabold leading-snug">{show?.movie?.title}</h2>
              <p className="mt-1 text-sm text-mute">{show?.theater?.name}</p>
              <p className="num text-sm text-mute">{formatDate(show?.date, { weekday: 'short', day: 'numeric', month: 'short' })}, {formatTime(show?.time)}</p>
            </div>
          </div>
          {seats.length > 0 && <p className="num mt-4 text-sm"><span className="text-mute">Seats </span><span className="font-bold">{seats.join(', ')}</span></p>}
          <dl className="num mt-5 space-y-2 border-t hairline pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-mute">Tickets ({booking.noOfSeat})</dt><dd>{formatCurrency(totals.tickets, currency)}</dd></div>
            {totals.food > 0 && <div className="flex justify-between"><dt className="text-mute">Food and drinks</dt><dd>{formatCurrency(totals.food, currency)}</dd></div>}
            {totals.fee > 0 && <div className="flex justify-between"><dt className="text-mute">Convenience fee</dt><dd>{formatCurrency(totals.fee, currency)}</dd></div>}
            {totals.tax > 0 && <div className="flex justify-between"><dt className="text-mute">Taxes</dt><dd>{formatCurrency(totals.tax, currency)}</dd></div>}
            <div className="flex justify-between border-t hairline pt-3 text-xl font-extrabold"><dt>Total</dt><dd>{formatCurrency(totals.total, currency)}</dd></div>
          </dl>
          {remaining !== null && (
            <p className="num mt-5 flex items-center justify-between rounded-xl bg-white/[0.05] px-4 py-2.5 text-sm" role="timer">
              <span className="inline-flex items-center gap-2 text-mute"><Clock className="h-4 w-4" aria-hidden />Seats held for</span>
              <span className={remaining < 60000 ? 'font-bold text-crimson-soft' : 'font-bold'}>{String(Math.floor(remaining / 60000)).padStart(2, '0')}:{String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}</span>
            </p>
          )}
          <Button size="lg" className="mt-6 w-full" loading={paying} onClick={pay}>Pay {formatCurrency(totals.total, currency)}</Button>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-faint"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{AUTH_API_BASE_URL ? 'Your seat hold is checked and confirmed by Cinehold after payment verification.' : 'Payments are handled by Razorpay. Your seats are reserved for this booking.'}</p>
          <p className="mt-3 text-center text-xs text-faint">Changed your mind? <Link to="/my-bookings" className="font-semibold text-mute underline underline-offset-4">Manage this booking</Link></p>
        </aside>
      </div>
    </div>
  );
}