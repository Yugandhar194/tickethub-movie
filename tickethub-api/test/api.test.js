import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { SEED_ACCOUNTS, ensureSchedule, seedAccounts, seedSampleMovies } from '../src/seed.js';
import { addDays, isoDate } from '../src/util.js';

async function boot(overrides = {}) {
  const cfg = loadConfig({ dbFile: ':memory:', otpMode: 'console', signinLimit: 1000, ...overrides });
  const db = openDb(':memory:');
  seedAccounts(db);
  seedSampleMovies(db);
  ensureSchedule(db);
  const { app, svc } = createApp(db, cfg);
  const server = await new Promise((res) => { const s = app.listen(0, () => res(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const api = async (method, path, { token, body, raw } = {}) => {
    const r = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (raw) return r;
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: r.status, data };
  };
  const login = async ({ email, password }) => {
    const s = await api('POST', '/signin', { body: { email, password } });
    assert.equal(s.status, 200, JSON.stringify(s.data));
    const v = await api('POST', '/user/verifyOTP', { body: { email, otp: s.data.devOtp } });
    assert.equal(v.status, 200);
    return { token: v.data.token, profile: s.data.user || s.data.theaterOwner || s.data.admin };
  };
  return { cfg, db, svc, server, api, login, close: () => server.close() };
}

// A showtime tomorrow, so it has not started and is outside the cancellation cutoff.
async function tomorrowShow(api) {
  const films = (await api('GET', '/movie/NowPlaying/type')).data;
  const tomorrow = isoDate(addDays(new Date(), 1));
  for (const f of films) {
    const shows = (await api('GET', `/showtimes/movie/${f.id}`)).data;
    const s = shows.find((x) => x.date === tomorrow);
    if (s) return s;
  }
  throw new Error('no showtime tomorrow');
}

let t;
before(async () => { t = await boot(); });
after(() => t.close());

test('catalogue and showtimes are seeded and shaped for the UI', async () => {
  assert.deepEqual((await t.api('GET', '/health')).data.ok, true);
  const films = (await t.api('GET', '/movie/NowPlaying/type')).data;
  assert.ok(films.length >= 4);
  assert.ok('poster_path' in films[0] && 'vote_average' in films[0] && 'movieId' in films[0]);
  assert.equal((await t.api('GET', '/movie/Nope/type')).status, 400);
  assert.equal((await t.api('GET', `/movie/${films[0].id}/cast`)).data.casts.length > 0, true);
  assert.ok((await t.api('GET', '/movie/search?title=lighthouse')).data.length >= 1);
  const s = await tomorrowShow(t.api);
  assert.ok(s.theater.name && s.amount > 0 && s.availableSeats === 112 && s.format);
});

test('sign-in needs a password and a valid one-time code', async () => {
  assert.equal((await t.api('POST', '/signin', { body: { email: SEED_ACCOUNTS.user.email, password: 'wrong' } })).status, 401);
  const s = await t.api('POST', '/signin', { body: SEED_ACCOUNTS.user });
  assert.equal(s.data.user.email, SEED_ACCOUNTS.user.email);
  assert.equal(s.data.user.password, undefined);
  assert.equal((await t.api('POST', '/user/verifyOTP', { body: { email: SEED_ACCOUNTS.user.email, otp: '000000' } })).status, 400);
  const ok = await t.api('POST', '/user/verifyOTP', { body: { email: SEED_ACCOUNTS.user.email, otp: s.data.devOtp } });
  assert.ok(ok.data.token);
  assert.equal((await t.api('POST', '/user/verifyOTP', { body: { email: SEED_ACCOUNTS.user.email, otp: s.data.devOtp } })).status, 400, 'a code works once');
});

test('booking: seats are locked, double booking is refused, and a failed booking leaves nothing behind', async () => {
  const a = await t.login(SEED_ACCOUNTS.user);
  const sign = await t.api('POST', '/user/signup', { body: { name: 'Second', email: 'second@example.com', phone: '9111111111', gender: 'MALE', maritalStatus: 'MARRIED', dob: '1990-01-01', password: 'Second@123' } });
  assert.equal(sign.status, 201);
  const b = await t.login({ email: 'second@example.com', password: 'Second@123' });
  const show = await tomorrowShow(t.api);

  assert.equal((await t.api('POST', '/bookings/create', { body: { showtime: show.id, seatNumbers: ['B1'] } })).status, 401);
  const id = (await t.api('POST', '/bookings/create', { token: a.token, body: { showtime: show.id, seatNumbers: ['B1', 'B2'] } })).data;
  assert.equal(typeof id, 'number');
  const seats = (await t.api('GET', `/booked-seats/showtime/${show.id}`)).data;
  assert.deepEqual(seats.map((x) => [x.seatNo, x.status]), [['B1', 'LOCKED'], ['B2', 'LOCKED']]);

  const clash = await t.api('POST', '/bookings/create', { token: b.token, body: { showtime: show.id, seatNumbers: ['B3', 'B2'] } });
  assert.equal(clash.status, 409);
  const after = (await t.api('GET', `/booked-seats/showtime/${show.id}`)).data.map((x) => x.seatNo);
  assert.deepEqual(after, ['B1', 'B2'], 'B3 must not be left locked by the failed booking');

  for (const bad of [[], ['Z9'], ['A1', 'A1'], ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9']]) {
    assert.equal((await t.api('POST', '/bookings/create', { token: b.token, body: { showtime: show.id, seatNumbers: bad } })).status, 400);
  }
  const view = (await t.api('GET', `/bookings/${id}`, { token: a.token })).data;
  assert.deepEqual(view.seatNumbers, ['B1', 'B2']);
  assert.equal(view.totalAmount, show.amount * 2);
  assert.equal(view.status, 'PENDING');
  assert.equal((await t.api('GET', `/bookings/${id}`, { token: b.token })).status, 404, 'another customer cannot read it');
});

test('payment: price is enforced on the server, then the ticket PDF is available', async () => {
  const a = await t.login(SEED_ACCOUNTS.user);
  const show = await tomorrowShow(t.api);
  const id = (await t.api('POST', '/bookings/create', { token: a.token, body: { showtime: show.id, seatNumbers: ['C1', 'C2', 'C3'] } })).data;
  const total = show.amount * 3;

  assert.equal((await t.api('POST', `/api/payments/create?bookingId=${id}`, { token: a.token, body: { foodItems: [{ id: 999, quantity: 1 }] } })).status, 400, 'unknown food IDs are rejected');
  assert.equal((await t.api('POST', `/api/payments/create?bookingId=${id}`, { token: a.token, body: { foodItems: [{ id: 1, quantity: 99 }] } })).status, 400, 'food quantities are bounded');
  assert.equal((await t.api('POST', `/api/payments/create?bookingId=${id}`, { body: { foodItems: [] } })).status, 401);
  assert.equal((await t.api('GET', `/tickets/download/${id}`, { token: a.token })).status, 402, 'no ticket before payment');

  // The server derives the snack price from its catalogue; a forged client amount is ignored.
  const order = (await t.api('POST', `/api/payments/create?bookingId=${id}`, { token: a.token, body: { amount: 1, foodItems: [{ id: 9, quantity: 4 }] } })).data;
  assert.equal(order.amount, (total + 300) * 100);
  assert.equal(order.breakdown.food, 300);
  assert.equal(order.currency, 'INR');
  assert.equal((await t.api('POST', `/api/payments/success?orderId=order_fake&transactionId=x`, { token: a.token })).status, 404);
  assert.equal((await t.api('POST', `/api/payments/success?orderId=${order.id}&transactionId=pay_1`, { token: a.token })).status, 200);

  const view = (await t.api('GET', `/bookings/${id}`, { token: a.token })).data;
  assert.equal(view.status, 'CONFIRMED');
  assert.equal(view.paymentStatus, 'PAID');
  assert.equal(view.expiresAt, null);
  assert.ok((await t.api('GET', `/booked-seats/showtime/${show.id}`)).data.some((s) => s.seatNo === 'C1' && s.status === 'BOOKED'));

  const pdf = await t.api('GET', `/tickets/download/${id}`, { token: a.token, raw: true });
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
});

test('cancelling frees the seats, and only the owner of the booking can do it', async () => {
  const a = await t.login(SEED_ACCOUNTS.user);
  const other = await t.login({ email: 'second@example.com', password: 'Second@123' });
  const show = await tomorrowShow(t.api);
  const id = (await t.api('POST', '/bookings/create', { token: a.token, body: { showtime: show.id, seatNumbers: ['D1'] } })).data;
  assert.equal((await t.api('DELETE', `/bookings/deleteUser/${id}`, { token: other.token })).status, 404);
  assert.equal((await t.api('DELETE', `/bookings/deleteUser/${id}`, { token: a.token })).status, 200);
  assert.ok(!(await t.api('GET', `/booked-seats/showtime/${show.id}`)).data.some((s) => s.seatNo === 'D1'));
  const mine = (await t.api('GET', `/bookings/user/${a.profile.id}`, { token: a.token })).data;
  assert.ok(!mine.some((x) => x.id === id));
  assert.equal((await t.api('GET', `/bookings/user/${a.profile.id}`, { token: other.token })).status, 403);
});

test('a confirmed booking cannot be cancelled inside the cutoff window', async () => {
  const a = await t.login(SEED_ACCOUNTS.user);
  const show = await tomorrowShow(t.api);
  const id = (await t.api('POST', '/bookings/create', { token: a.token, body: { showtime: show.id, seatNumbers: ['E1'] } })).data;
  const order = (await t.api('POST', `/api/payments/create?bookingId=${id}&amount=${show.amount}`, { token: a.token })).data;
  await t.api('POST', `/api/payments/success?orderId=${order.id}&transactionId=p`, { token: a.token });
  // Move the show to 30 minutes from now.
  const soon = new Date(Date.now() + 30 * 60000);
  t.db.prepare('UPDATE showtimes SET date = ?, time = ? WHERE id = ?').run(isoDate(soon), `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}:00`, show.id);
  const r = await t.api('DELETE', `/bookings/deleteUser/${id}`, { token: a.token });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /2 hours/);
  const admin = await t.login(SEED_ACCOUNTS.admin);
  assert.equal((await t.api('DELETE', `/bookings/deleteUser/${id}`, { token: admin.token })).status, 200, 'admins can still cancel');
});

test('role guards: customers, owners and admins see only what they should', async () => {
  const u = await t.login(SEED_ACCOUNTS.user);
  const o = await t.login(SEED_ACCOUNTS.owner);
  const ad = await t.login(SEED_ACCOUNTS.admin);
  for (const p of ['/user/getAllUsers', '/theaterowner/getAllUsers', '/bookings/getAllUsers', '/movies', '/admin/theaters']) {
    assert.equal((await t.api('GET', p)).status, 401, p);
    assert.equal((await t.api('GET', p, { token: u.token })).status, 403, p);
  }
  assert.equal((await t.api('GET', '/user/getAllUsers', { token: ad.token })).data.length >= 2, true);
  assert.equal((await t.api('GET', '/user/getAllUsers', { token: ad.token })).data[0].password, undefined);
  assert.equal((await t.api('GET', '/user/getAllUsers', { token: o.token })).status, 403);
  assert.equal((await t.api('GET', `/theaterowner/${o.profile.id}`, { token: o.token })).data.theaters.length, 3);
  assert.equal((await t.api('GET', `/theaterowner/${o.profile.id}`, { token: u.token })).status, 403);
  const ownerSees = (await t.api('GET', '/bookings/getAllUsers', { token: o.token })).data;
  const adminSees = (await t.api('GET', '/bookings/getAllUsers', { token: ad.token })).data;
  assert.ok(adminSees.length >= ownerSees.length && ownerSees.length > 0);
  assert.equal((await t.api('GET', '/bookings/getAllUsers', { token: 'garbage' })).status, 401);
});

test('profile edits never touch the password', async () => {
  const u = await t.login(SEED_ACCOUNTS.user);
  const r = await t.api('PUT', `/user/updateUser/${u.profile.id}`, { token: u.token, body: { name: 'Asha V', password: 'hacked', role: 'ADMIN' } });
  assert.equal(r.status, 200);
  const again = await t.login(SEED_ACCOUNTS.user);
  assert.equal(again.profile.name, 'Asha V');
  assert.equal(again.profile.role, 'USER');
  assert.equal((await t.api('PUT', `/user/updateUser/${u.profile.id + 1}`, { token: u.token, body: { name: 'x' } })).status, 403);
});

test('Google sign-in stays disabled until a server OAuth client ID is configured', async () => {
  const x = await boot({ googleClientId: '' });
  try {
    const result = await x.api('POST', '/auth/google', { body: { credential: 'not-a-real-token' } });
    assert.equal(result.status, 503);
  } finally { x.close(); }
});

test('sign-up validation and duplicate checks', async () => {
  assert.equal((await t.api('GET', `/user/validateEmail?email=${SEED_ACCOUNTS.user.email}`)).status, 400);
  assert.equal((await t.api('GET', '/user/validateEmail?email=new@example.com')).status, 200);
  assert.equal((await t.api('GET', '/user/validatePhone?phone=9000000001')).status, 400);
  assert.equal((await t.api('POST', '/user/signup', { body: { name: 'A', email: 'bad', phone: '1', password: 'longenough' } })).status, 400);
  assert.equal((await t.api('POST', '/user/signup', { body: { name: 'A', email: 'ok@example.com', phone: '9222222222', password: 'short' } })).status, 400);
  assert.equal((await t.api('POST', '/user/signup', { body: { name: 'A', email: SEED_ACCOUNTS.admin.email, phone: '9333333333', password: 'longenough' } })).status, 400, 'staff emails are taken too');
});

test('admin can add a showtime, duplicates are refused, and booked ones cannot be deleted', async () => {
  const ad = await t.login(SEED_ACCOUNTS.admin);
  const film = (await t.api('GET', '/movie/NowPlaying/type')).data[0];
  const theater = (await t.api('GET', '/admin/theaters', { token: ad.token })).data[0];
  const body = { movieId: film.id, theaterId: theater.id, date: isoDate(addDays(new Date(), 20)), time: '12:00', amount: 250, format: 'IMAX 3D' };
  const made = await t.api('POST', '/admin/showtimes', { token: ad.token, body });
  assert.equal(made.status, 201);
  assert.equal((await t.api('POST', '/admin/showtimes', { token: ad.token, body })).status, 400);
  assert.equal((await t.api('POST', '/admin/showtimes', { token: ad.token, body: { ...body, amount: 0 } })).status, 400);
  const u = await t.login(SEED_ACCOUNTS.user);
  await t.api('POST', '/bookings/create', { token: u.token, body: { showtime: made.data.id, seatNumbers: ['A1'] } });
  assert.equal((await t.api('DELETE', `/admin/showtimes/${made.data.id}`, { token: ad.token })).status, 400);
});

test('an unpaid hold expires, frees its seats, and a late payment wins them back if they are still free', async () => {
  const x = await boot({ holdMinutes: 0.0005 }); // 30 ms
  try {
    const a = await x.login(SEED_ACCOUNTS.user);
    const show = await tomorrowShow(x.api);
    const id = (await x.api('POST', '/bookings/create', { token: a.token, body: { showtime: show.id, seatNumbers: ['F1', 'F2'] } })).data;
    const order = (await x.api('POST', `/api/payments/create?bookingId=${id}&amount=${show.amount * 2}`, { token: a.token })).data;
    await new Promise((r) => setTimeout(r, 80));
    assert.deepEqual((await x.api('GET', `/booked-seats/showtime/${show.id}`)).data, [], 'seats are released');
    assert.equal((await x.api('POST', `/api/payments/create?bookingId=${id}&amount=${show.amount * 2}`, { token: a.token })).status, 410);
    const late = await x.api('POST', `/api/payments/success?orderId=${order.id}&transactionId=late`, { token: a.token });
    assert.equal(late.status, 200);
    assert.deepEqual((await x.api('GET', `/booked-seats/showtime/${show.id}`)).data.map((s) => s.seatNo), ['F1', 'F2']);

    // Same story, but somebody else took a seat in between: the late payment must be refused.
    const b = await x.login(SEED_ACCOUNTS.user);
    const id2 = (await x.api('POST', '/bookings/create', { token: b.token, body: { showtime: show.id, seatNumbers: ['G1'] } })).data;
    const order2 = (await x.api('POST', `/api/payments/create?bookingId=${id2}&amount=${show.amount}`, { token: b.token })).data;
    await new Promise((r) => setTimeout(r, 80));
    x.svc.releaseExpired();
    x.db.prepare(`INSERT INTO bookings (user_id, showtime_id, no_of_seat, booking_date, status, amount_total, created_at) VALUES (1, ?, 1, date('now'), 'CONFIRMED', 1, 0)`).run(show.id);
    const bid = x.db.prepare('SELECT MAX(id) AS m FROM bookings').get().m;
    x.db.prepare(`INSERT INTO booked_seats (booking_id, showtime_id, seat_no) VALUES (?, ?, 'G1')`).run(bid, show.id);
    assert.equal((await x.api('POST', `/api/payments/success?orderId=${order2.id}&transactionId=late2`, { token: b.token })).status, 409);
  } finally { x.close(); }
});

test('TMDB import: stores movies with their TMDB id, cast and runtime, and replaces the samples', async () => {
  const stub = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const list = (ids) => ({ results: ids.map((id) => ({ id, title: `Film ${id}`, poster_path: `/p${id}.jpg`, backdrop_path: `/b${id}.jpg`, release_date: isoDate(addDays(new Date(), -10)), vote_average: 7, vote_count: 100, overview: 'o' })) });
    res.setHeader('Content-Type', 'application/json');
    if (u.pathname === '/movie/now_playing') return res.end(JSON.stringify(list(u.searchParams.get('page') === '1' ? [501, 502] : [503])));
    if (u.pathname === '/trending/movie/week') return res.end(JSON.stringify(list([502, 504])));
    if (u.pathname === '/movie/upcoming') return res.end(JSON.stringify({ results: [{ id: 505, title: 'Soon', poster_path: '/s.jpg', release_date: isoDate(addDays(new Date(), 30)) }] }));
    if (u.pathname === '/movie/popular') return res.end(JSON.stringify(list([])));
    const m = /^\/movie\/(\d+)$/.exec(u.pathname);
    if (m) return res.end(JSON.stringify({ id: +m[1], title: `Film ${m[1]}`, poster_path: `/p${m[1]}.jpg`, release_date: isoDate(addDays(new Date(), -10)), runtime: 120, revenue: 5000000, tagline: 'tag', genres: [{ name: 'Science Fiction' }], credits: { cast: [{ id: 1, name: 'Actor One', profile_path: '/a.jpg' }], crew: [{ job: 'Director', name: 'Dir One' }] } }));
    res.statusCode = 404; res.end('{}');
  });
  await new Promise((r) => stub.listen(0, r));
  const x = await boot({ tmdb: { key: 'testkey', base: `http://127.0.0.1:${stub.address().port}`, region: 'IN' } });
  try {
    const ad = await x.login(SEED_ACCOUNTS.admin);
    const r = await x.api('GET', '/movies', { token: ad.token });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.match(r.data, /Imported 5/);
    const now = (await x.api('GET', '/movie/NowPlaying/type')).data;
    assert.deepEqual(now.map((m) => m.movieId).sort(), [501, 502, 503]);
    assert.equal(now[0].runtime, 120);
    assert.equal(now[0].revenue, 5000000);
    assert.equal((await x.api('GET', '/movie/Upcoming/type')).data[0].movieId, 505);
    assert.equal((await x.api('GET', '/movie/Trending/type')).data[0].movieId, 504);
    assert.equal((await x.api('GET', `/movie/${now[0].id}/cast`)).data.director, 'Dir One');
    assert.equal(x.db.prepare('SELECT COUNT(*) AS c FROM movies WHERE is_demo = 1').get().c, 0, 'sample films replaced');
    assert.ok((await x.api('GET', `/showtimes/movie/${now[0].id}`)).data.length > 0, 'imported films get showtimes');
  } finally { x.close(); stub.close(); }
});

test('TMDB import reports a clear error when the key is missing or wrong', async () => {
  const ad = await t.login(SEED_ACCOUNTS.admin);
  const r = await t.api('GET', '/movies', { token: ad.token });
  assert.equal(r.status, 502);
  assert.match(r.data.message, /TMDB_API_KEY/);
});

test('contact form stores the message and validates input', async () => {
  assert.equal((await t.api('POST', '/contact/send', { body: { name: 'A', email: 'nope', message: 'hi' } })).status, 400);
  assert.equal((await t.api('POST', '/contact/send', { body: { name: 'A', email: 'a@example.com', phone: '1', message: 'hello' } })).status, 200);
  assert.equal(t.db.prepare('SELECT COUNT(*) AS c FROM contact_requests').get().c, 1);
});
