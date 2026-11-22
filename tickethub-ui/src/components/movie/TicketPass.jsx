import { QRCodeSVG } from 'qrcode.react';
import SmartImage from '../ui/SmartImage';
import { bookingCode, formatDate, formatINR, formatTime } from '../../lib/format';
import { img } from '../../lib/posters';

// Wallet-style pass: details above a perforated tear line, scannable code below.
export default function TicketPass({ booking, seats = [] }) {
  const show = booking.showtime || {};
  const movie = show.movie || {};
  const code = bookingCode(booking.id);
  const count = booking.noOfSeat || seats.length;
  const url = `${window.location.origin}/tickets/${booking.id}`;

  return (
    <div className="print-pass relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[28px] bg-[#141418] shadow-lift ring-1 ring-white/10" style={{ '--notch': '#09090b' }}>
      <div className="relative overflow-hidden px-6 pb-6 pt-6">
        <div className="absolute inset-0" aria-hidden>
          <SmartImage src={img(movie.poster_path, 'w500')} title={movie.title} alt="" className="h-full w-full" imgClassName="scale-125 opacity-30 blur-2xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-crimson/35 via-[#141418]/70 to-[#141418]" />
        <div className="relative">
          <div className="flex gap-4">
            <SmartImage src={img(movie.poster_path, 'w342')} title={movie.title} alt="" className="h-28 w-[74px] shrink-0 rounded-xl shadow-lift ring-1 ring-white/20" />
            <div className="min-w-0 self-end">
              <p className="text-xs font-semibold text-white/70">Admit {count}</p>
              <h2 className="mt-1 text-xl font-extrabold leading-tight">{movie.title}</h2>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
            <div><dt className="text-xs text-white/60">Date</dt><dd className="num mt-1 font-bold">{formatDate(show.date, { weekday: 'short', day: 'numeric', month: 'short' })}</dd></div>
            <div><dt className="text-xs text-white/60">Time</dt><dd className="num mt-1 font-bold">{formatTime(show.time)}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-white/60">Theater</dt><dd className="mt-1 font-bold">{show.theater?.name}{show.theater?.location ? `, ${show.theater.location}` : ''}</dd></div>
            <div className="col-span-2">
              <dt className="text-xs text-white/60">Seats</dt>
              <dd className="mt-1.5 flex flex-wrap gap-2">
                {seats.length ? seats.map((s) => <span key={s} className="num rounded-lg bg-white/15 px-2.5 py-1 text-sm font-extrabold">{s}</span>) : <span className="num font-bold">{count} {count === 1 ? 'seat' : 'seats'}</span>}
              </dd>
            </div>
            {show.amount > 0 && <div><dt className="text-xs text-white/60">Ticket price</dt><dd className="num mt-1 font-bold">{formatINR(show.amount)}</dd></div>}
          </dl>
        </div>
      </div>

      <div className="relative">
        <span className="absolute -left-3.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full" style={{ background: 'var(--notch)' }} aria-hidden />
        <span className="absolute -right-3.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full" style={{ background: 'var(--notch)' }} aria-hidden />
        <div className="perforation mx-6" aria-hidden />
      </div>

      <div className="flex flex-col items-center px-6 pb-7 pt-6">
        <div className="rounded-2xl bg-white p-3.5">
          <QRCodeSVG value={url} size={152} level="M" bgColor="#ffffff" fgColor="#09090b" title={`QR code for booking ${code}`} />
        </div>
        <p className="num mt-4 text-lg font-extrabold">{code}</p>
        <p className="mt-0.5 text-xs text-white/55">Show this code at the entrance</p>
      </div>
    </div>
  );
}
