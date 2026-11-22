import { Router } from 'express';
import { ApiError, wrap } from '../util.js';
import { movieView } from '../views.js';
import { syncFromTmdb } from '../tmdb.js';
import { ensureSchedule } from '../seed.js';

export default function catalogRoutes({ db, cfg, svc, auth }) {
  const r = Router();
  const TYPES = ['NowPlaying', 'Trending', 'Upcoming', 'Popular'];

  r.get('/movie/search', wrap((req, res) => {
    const t = String(req.query.title || '').trim();
    res.json(db.prepare('SELECT * FROM movies WHERE title LIKE ? ORDER BY vote_count DESC LIMIT 40').all(`%${t}%`).map(movieView));
  }));

  r.get('/movie/:type/type', wrap((req, res) => {
    const { type } = req.params;
    if (!TYPES.includes(type)) throw new ApiError(400, `Unknown movie type. Use one of ${TYPES.join(', ')}.`);
    const rows = type === 'Popular'
      ? db.prepare(`SELECT * FROM movies WHERE type = 'Popular' OR vote_average >= 7 ORDER BY vote_count DESC LIMIT 60`).all()
      : db.prepare('SELECT * FROM movies WHERE type = ? ORDER BY release_date DESC').all(type);
    res.json(rows.map(movieView));
  }));

  r.get('/movie/:id/cast', wrap((req, res) => {
    const m = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
    if (!m) throw new ApiError(404, 'Movie not found.');
    res.json({ director: m.director, writer: m.writer, casts: JSON.parse(m.cast_json || '[]') });
  }));

  r.get('/movie/:id', wrap((req, res) => {
    const m = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
    if (!m) throw new ApiError(404, 'Movie not found.');
    res.json(movieView(m));
  }));

  // Admin: pull fresh films from TMDB, then stock showtimes for them.
  r.get('/movies', auth.requireRole('ADMIN'), wrap(async (_req, res) => {
    try {
      const out = await syncFromTmdb(db, cfg);
      const scheduled = cfg.autoSchedule ? ensureSchedule(db) : 0;
      res.type('text/plain').send(`Movies fetched and saved successfully! Imported ${out.imported}${scheduled ? `, added ${scheduled} showtimes` : ''}.`);
    } catch (e) {
      throw new ApiError(502, e.message);
    }
  }));

  r.get('/showtimes/movie/:id', wrap((req, res) => {
    svc.releaseExpired();
    const rows = db.prepare('SELECT * FROM showtimes WHERE movie_id = ? AND date >= date(\'now\', \'-1 day\') ORDER BY date, time').all(req.params.id);
    res.json(rows.map(svc.showtimeView));
  }));

  r.get('/showtimes/:id', wrap((req, res) => {
    const s = svc.q.showtime.get(req.params.id);
    if (!s) throw new ApiError(404, 'Showtime not found.');
    res.json(svc.showtimeView(s));
  }));

  r.get('/booked-seats/showtime/:id', wrap((req, res) => {
    svc.releaseExpired();
    res.json(svc.q.seatsOfShow.all(req.params.id).map((s) => ({ id: s.id, seatNo: s.seat_no, status: s.status === 'PENDING' ? 'LOCKED' : 'BOOKED' })));
  }));

  return r;
}
