import { ApiError, SEAT_RE, isoDate, showStart } from './util.js';
import { movieView, theaterView, userView } from './views.js';

export function createServices(db, cfg) {
  const total = cfg.seats.rows.length * cfg.seats.cols;
  const q = {
    movie: db.prepare('SELECT * FROM movies WHERE id = ?'),
    theater: db.prepare('SELECT * FROM theaters WHERE id = ?'),
    showtime: db.prepare('SELECT * FROM showtimes WHERE id = ?'),
    user: db.prepare('SELECT * FROM users WHERE id = ?'),
    seatsOfShow: db.prepare(`SELECT bs.id, bs.seat_no, b.status FROM booked_seats bs JOIN bookings b ON b.id = bs.booking_id WHERE bs.showtime_id = ? ORDER BY bs.id`),
    seatsOfBooking: db.prepare('SELECT seat_no FROM booked_seats WHERE booking_id = ? ORDER BY id'),
    seatCount: db.prepare('SELECT COUNT(*) AS c FROM booked_seats WHERE showtime_id = ?'),
    booking: db.prepare('SELECT * FROM bookings WHERE id = ?'),
    expire: db.prepare(`UPDATE bookings SET status = 'EXPIRED' WHERE status = 'PENDING' AND expires_at IS NOT NULL AND expires_at < ?`),
    freeExpired: db.prepare(`DELETE FROM booked_seats WHERE booking_id IN (SELECT id FROM bookings WHERE status IN ('EXPIRED','CANCELLED'))`),
  };

  // Seats held by an unpaid booking are released once the hold runs out.
  const releaseExpired = db.transaction((now = Date.now()) => {
    const r = q.expire.run(now);
    if (r.changes) q.freeExpired.run();
    return r.changes;
  });

  function showtimeView(s) {
    if (!s) return null;
    const movie = movieView(q.movie.get(s.movie_id));
    const theater = theaterView(q.theater.get(s.theater_id));
    const booked = q.seatCount.get(s.id).c;
    return { id: s.id, date: s.date, time: s.time, amount: s.amount, format: s.format || undefined, availableSeats: Math.max(0, total - booked), movie, theater };
  }

  function bookingView(b) {
    if (!b) return null;
    return {
      id: b.id, bookingDate: b.booking_date, noOfSeat: b.no_of_seat, status: b.status, totalAmount: b.amount_total,
      expiresAt: b.status === 'PENDING' ? b.expires_at : null, paymentStatus: b.status === 'CONFIRMED' ? 'PAID' : 'UNPAID',
      user: userView(q.user.get(b.user_id)), showtime: showtimeView(q.showtime.get(b.showtime_id)),
      seatNumbers: q.seatsOfBooking.all(b.id).map((r) => r.seat_no),
    };
  }

  const createBooking = db.transaction((userId, showtimeId, seats) => {
    releaseExpired();
    const show = q.showtime.get(showtimeId);
    if (!show) throw new ApiError(404, 'Showtime not found.');
    if (showStart(show.date, show.time) <= new Date()) throw new ApiError(400, 'This show has already started.');
    const unique = [...new Set(seats)];
    if (!unique.length || unique.length !== seats.length) throw new ApiError(400, 'Choose at least one seat, and each seat only once.');
    if (unique.length > cfg.seats.max) throw new ApiError(400, `You can book up to ${cfg.seats.max} seats at a time.`);
    const bad = unique.find((s) => !SEAT_RE.test(s));
    if (bad) throw new ApiError(400, `${bad} is not a valid seat.`);

    const now = Date.now();
    const amount = Math.round(unique.length * show.amount * 100) / 100; // price is computed here, never taken from the client
    const id = db.prepare(`INSERT INTO bookings (user_id, showtime_id, no_of_seat, booking_date, status, expires_at, amount_total, created_at, seats_json)
      VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)`).run(userId, showtimeId, unique.length, isoDate(), now + cfg.holdMinutes * 60000, amount, now, JSON.stringify(unique)).lastInsertRowid;
    const ins = db.prepare('INSERT INTO booked_seats (booking_id, showtime_id, seat_no) VALUES (?, ?, ?)');
    for (const seat of unique) {
      try {
        ins.run(id, showtimeId, seat);
      } catch (e) {
        if (String(e.code).startsWith('SQLITE_CONSTRAINT')) throw new ApiError(409, `Seat ${seat} was just taken. Pick another seat.`);
        throw e;
      }
    }
    return Number(id);
  });

  const cancelBooking = db.transaction((id) => {
    db.prepare(`UPDATE bookings SET status = 'CANCELLED', expires_at = NULL WHERE id = ?`).run(id);
    db.prepare('DELETE FROM booked_seats WHERE booking_id = ?').run(id);
  });

  const confirmBooking = db.transaction((b, paymentId) => {
    if (b.status === 'EXPIRED') {
      // The customer paid after the hold ran out: take the seats back if nobody else did.
      const ins = db.prepare('INSERT INTO booked_seats (booking_id, showtime_id, seat_no) VALUES (?, ?, ?)');
      try {
        for (const seat of JSON.parse(b.seats_json || '[]')) ins.run(b.id, b.showtime_id, seat);
      } catch {
        throw new ApiError(409, 'Your hold expired and a seat was taken meanwhile. Contact support for a refund.');
      }
    }
    db.prepare(`UPDATE bookings SET status = 'CONFIRMED', expires_at = NULL, payment_id = ?, paid_at = datetime('now') WHERE id = ?`).run(paymentId, b.id);
  });

  return { q, total, releaseExpired, showtimeView, bookingView, createBooking, cancelBooking, confirmBooking };
}
