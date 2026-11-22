import { Router } from 'express';
import { ApiError, showStart, wrap } from '../util.js';

export default function bookingRoutes({ db, cfg, svc, auth }) {
  const r = Router();
  const live = `('PENDING','CONFIRMED')`;

  // May this person see this booking? Its owner, an admin, or the owner of the theater showing it.
  function canSee(user, b) {
    if (user.role === 'ADMIN' || (user.role === 'USER' && b.user_id === user.id)) return true;
    if (user.role === 'THEATER_OWNER') {
      return Boolean(db.prepare('SELECT 1 FROM showtimes s JOIN theaters t ON t.id = s.theater_id WHERE s.id = ? AND t.owner_id = ?').get(b.showtime_id, user.id));
    }
    return false;
  }
  function load(req, id) {
    svc.releaseExpired();
    const b = svc.q.booking.get(id);
    if (!b || !canSee(req.user, b)) throw new ApiError(404, 'Booking not found.');
    return b;
  }

  r.post('/bookings/create', auth.requireRole('USER'), wrap((req, res) => {
    const { showtime, seatNumbers } = req.body || {};
    if (!Number.isInteger(Number(showtime)) || !Array.isArray(seatNumbers)) throw new ApiError(400, 'A showtime and a list of seats are required.');
    res.json(svc.createBooking(req.user.id, Number(showtime), seatNumbers.map(String)));
  }));

  r.get('/bookings/user/:id', auth.requireAuth, wrap((req, res) => {
    const id = Number(req.params.id);
    if (req.user.role !== 'ADMIN' && !(req.user.role === 'USER' && req.user.id === id)) throw new ApiError(403, 'You can only see your own bookings.');
    svc.releaseExpired();
    res.json(db.prepare(`SELECT * FROM bookings WHERE user_id = ? AND status IN ${live} ORDER BY id DESC`).all(id).map(svc.bookingView));
  }));

  r.get('/bookings/getAllUsers', auth.requireRole('ADMIN', 'THEATER_OWNER'), wrap((req, res) => {
    svc.releaseExpired();
    const rows = req.user.role === 'ADMIN'
      ? db.prepare(`SELECT * FROM bookings WHERE status IN ${live} ORDER BY id DESC`).all()
      : db.prepare(`SELECT b.* FROM bookings b JOIN showtimes s ON s.id = b.showtime_id JOIN theaters t ON t.id = s.theater_id WHERE t.owner_id = ? AND b.status IN ${live} ORDER BY b.id DESC`).all(req.user.id);
    res.json(rows.map(svc.bookingView));
  }));

  r.get('/bookings/:id', auth.requireAuth, wrap((req, res) => res.json(svc.bookingView(load(req, req.params.id)))));

  // Cancelling frees the seats. Customers can cancel until the cutoff before the show; admins any time.
  r.delete('/bookings/deleteUser/:id', auth.requireAuth, wrap((req, res) => {
    const b = load(req, req.params.id);
    if (req.user.role === 'THEATER_OWNER') throw new ApiError(403, 'Only the customer or an admin can cancel a booking.');
    if (!['PENDING', 'CONFIRMED'].includes(b.status)) throw new ApiError(400, 'This booking is already closed.');
    if (req.user.role !== 'ADMIN' && b.status === 'CONFIRMED') {
      const s = svc.q.showtime.get(b.showtime_id);
      if (showStart(s.date, s.time).getTime() - Date.now() < cfg.cancelCutoffHours * 3600000) {
        throw new ApiError(400, `Bookings can only be cancelled up to ${cfg.cancelCutoffHours} hours before the show.`);
      }
    }
    svc.cancelBooking(b.id);
    res.json({ message: 'Booking cancelled. Your seats are released.' });
  }));

  return r;
}
