import { Router } from 'express';
import { ApiError, EMAIL_RE, wrap } from '../util.js';
import { hashPassword } from '../auth.js';
import { ensureSchedule } from '../seed.js';

export default function adminRoutes({ db, svc, auth }) {
  const r = Router();
  r.use('/admin', auth.requireRole('ADMIN'));

  r.get('/admin/theaters', wrap((_req, res) => {
    res.json(db.prepare('SELECT t.*, o.name AS owner_name FROM theaters t JOIN theater_owners o ON o.id = t.owner_id ORDER BY t.id').all()
      .map((t) => ({ id: t.id, name: t.name, location: t.location, format: t.format, ownerId: t.owner_id, ownerName: t.owner_name })));
  }));

  r.post('/admin/theater-owners', wrap((req, res) => {
    const { name, email, password } = req.body || {};
    if (!name?.trim() || !EMAIL_RE.test(email || '') || String(password || '').length < 8) throw new ApiError(400, 'A name, a valid email and a password of 8+ characters are required.');
    if (auth.findAccount(email)) throw new ApiError(400, 'That email is already in use.');
    const id = db.prepare('INSERT INTO theater_owners (name, email, password_hash) VALUES (?, ?, ?)').run(name.trim(), email.trim(), hashPassword(password)).lastInsertRowid;
    res.status(201).json({ id: Number(id) });
  }));

  r.post('/admin/theaters', wrap((req, res) => {
    const { name, location, ownerId, format } = req.body || {};
    if (!name?.trim() || !db.prepare('SELECT 1 FROM theater_owners WHERE id = ?').get(ownerId)) throw new ApiError(400, 'A name and an existing owner id are required.');
    if (db.prepare('SELECT 1 FROM theaters WHERE name = ?').get(name.trim())) throw new ApiError(400, 'A theater with that name already exists.');
    const id = db.prepare('INSERT INTO theaters (name, location, owner_id, format) VALUES (?, ?, ?, ?)').run(name.trim(), location || null, ownerId, format || null).lastInsertRowid;
    res.status(201).json({ id: Number(id) });
  }));

  r.post('/admin/showtimes', wrap((req, res) => {
    const { movieId, theaterId, date, time, amount, format } = req.body || {};
    if (!db.prepare('SELECT 1 FROM movies WHERE id = ?').get(movieId) || !db.prepare('SELECT 1 FROM theaters WHERE id = ?').get(theaterId)) throw new ApiError(400, 'Choose an existing movie and theater.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}(:\d{2})?$/.test(time || '') || !(Number(amount) > 0)) throw new ApiError(400, 'A date (YYYY-MM-DD), a time (HH:MM) and a price above zero are required.');
    try {
      const id = db.prepare('INSERT INTO showtimes (date, time, amount, format, movie_id, theater_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(date, time.length === 5 ? `${time}:00` : time, Number(amount), format || null, movieId, theaterId).lastInsertRowid;
      res.status(201).json({ id: Number(id) });
    } catch (e) {
      if (String(e.code).startsWith('SQLITE_CONSTRAINT')) throw new ApiError(400, 'That theater already has this film at this time.');
      throw e;
    }
  }));

  r.delete('/admin/showtimes/:id', wrap((req, res) => {
    const live = db.prepare(`SELECT 1 FROM bookings WHERE showtime_id = ? AND status IN ('PENDING','CONFIRMED')`).get(req.params.id);
    if (live) throw new ApiError(400, 'This showtime has bookings. Cancel them first.');
    if (!db.prepare('DELETE FROM showtimes WHERE id = ?').run(req.params.id).changes) throw new ApiError(404, 'Showtime not found.');
    res.json({ message: 'Showtime deleted' });
  }));

  r.post('/admin/schedule', wrap((_req, res) => res.json({ added: ensureSchedule(db) })));
  return r;
}
