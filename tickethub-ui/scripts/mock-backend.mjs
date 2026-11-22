// A tiny stand-in for the Spring API so the UI can be developed without MySQL, SMTP or Razorpay.
// Run with `npm run mock` (port 8080). Sign in with admin@tickethub.test, owner@tickethub.test or
// user@tickethub.test, any password, OTP 123456. Data lives in memory and resets on restart.
import http from 'node:http';

const PORT = Number(process.env.PORT || 8080);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = new Date();
const day = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };

const films = [
  ['Mock Harbour', 'Drama', -30, 7.8, 910_000_000], ['Mock Monsoon', 'Action', -22, 7.1, 640_000_000], ['Mock Kingdoms', 'Animation', -41, 8.2, 520_000_000],
  ['Mock Skies', 'Romance', -15, 7.4, 210_000_000], ['Mock Frequency', 'Thriller', -9, 6.9, 130_000_000], ['Mock Orchard', 'Science Fiction', -4, 7.3, 64_000_000],
  ['Mock Embers', 'Adventure', 9, 0, 0], ['Mock Machines', 'Mystery', 16, 0, 0],
].map(([title, category, off, vote_average, revenue], i) => ({
  id: i + 1, movieId: null, title, overview: `${title} is sample data served by the local mock backend.`, vote_average, vote_count: vote_average ? 1200 + i * 90 : 0,
  release_date: day(off), backdrop_path: null, poster_path: null, status: off > 0 ? 'Post Production' : 'Released', category, tagline: 'Sample tagline', revenue, runtime: 110 + i * 4,
  type: off > 0 ? 'Upcoming' : i < 5 ? 'NowPlaying' : 'Trending',
}));
const theaters = [{ id: 1, name: 'Aurora Cinemas', location: 'Mumbai' }, { id: 2, name: 'Grand Orchid 4K', location: 'Pune' }, { id: 3, name: 'Metro Plaza', location: 'Mumbai' }];
let nextShow = 1;
const showtimes = [];
films.filter((f) => f.type !== 'Upcoming').forEach((f) => {
  for (let d = 0; d < 9; d += 1) theaters.forEach((t, ti) => ['10:30:00', '14:15:00', '18:45:00', '21:30:00'].slice(0, 2 + ((d + ti) % 3)).forEach((time, k) => {
    showtimes.push({ id: nextShow++, date: day(d), time, availableSeats: 112, amount: 220 + ti * 40 + k * 20, movie: f, theater: t });
  }));
});
const booked = new Map(); // showtimeId -> Set of seats
showtimes.forEach((s) => booked.set(s.id, new Set(['D5', 'D6', 'E7', 'F3', 'G9', 'G10'].filter((_, i) => (s.id + i) % 2 === 0))));
const bookings = [];
let nextPaymentOrder = 1;
const users = [
  { id: 1, name: 'Asha Verma', email: 'user@tickethub.test', phone: '9000000001', gender: 'FEMALE', maritalStatus: 'UNMARRIED', dob: '1996-04-12', role: 'USER' },
  { id: 2, name: 'Ravi Kulkarni', email: 'ravi@tickethub.test', phone: '9000000002', gender: 'MALE', maritalStatus: 'MARRIED', dob: '1990-01-02', role: 'USER' },
];
const owners = [{ id: 1, name: 'Neha Shah', email: 'owner@tickethub.test', role: 'THEATER_OWNER', theaters: [theaters[0], theaters[1]] }];
const admin = { id: 1, name: 'Site Admin', email: 'admin@tickethub.test', role: 'ADMIN' };

const send = (res, code, body, type = 'application/json') => {
  res.writeHead(code, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};
const readBody = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { r(JSON.parse(b || '{}')); } catch { r({}); } }); });
const view = (b) => ({ id: b.id, bookingDate: b.bookingDate, noOfSeat: b.noOfSeat, user: users.find((u) => u.id === b.user), showtime: showtimes.find((s) => s.id === b.showtime) });

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname.replace(/\/$/, '');
  const m = (re) => re.exec(p);
  if (req.method === 'OPTIONS') return send(res, 204, '');
  let x;
  if ((x = m(/^\/movie\/(\w+)\/type$/)) && req.method === 'GET') return send(res, 200, films.filter((f) => f.type === x[1] || (x[1] === 'Popular' && f.vote_average > 7)));
  if (m(/^\/movie\/search$/)) return send(res, 200, films.filter((f) => f.title.toLowerCase().includes((url.searchParams.get('title') || '').toLowerCase())));
  if ((x = m(/^\/movie\/(\d+)\/cast$/))) return send(res, 200, { director: 'Sample Director', writer: 'Sample Writer', casts: ['Mira Halden', 'Dev Malhotra', 'Tessa Orwell'].map((name, i) => ({ castId: i, name, profile_path: null })) });
  if ((x = m(/^\/movie\/(\d+)$/))) return send(res, 200, films.find((f) => f.id === Number(x[1])) || null);
  if (p === '/movies') return send(res, 200, 'Movies fetched and saved successfully!', 'text/plain');
  if ((x = m(/^\/showtimes\/movie\/(\d+)$/))) return send(res, 200, showtimes.filter((s) => s.movie.id === Number(x[1])));
  if ((x = m(/^\/booked-seats\/showtime\/(\d+)$/))) return send(res, 200, [...(booked.get(Number(x[1])) || [])].map((seatNo, i) => ({ id: i, seatNo })));
  if (p === '/bookings/create') { const b = await readBody(req); const id = bookings.length + 101; const set = booked.get(b.showtime); b.seatNumbers.forEach((s) => set.add(s)); bookings.push({ ...b, id }); return send(res, 200, id); }
  if (p === '/bookings/getAllUsers') return send(res, bookings.length ? 200 : 204, bookings.map(view));
  if ((x = m(/^\/bookings\/user\/(\d+)$/))) return send(res, 200, bookings.filter((b) => b.user === Number(x[1])).map(view));
  if ((x = m(/^\/bookings\/deleteUser\/(\d+)$/))) { const i = bookings.findIndex((b) => b.id === Number(x[1])); if (i >= 0) { const b = bookings[i]; b.seatNumbers.forEach((s) => booked.get(b.showtime)?.delete(s)); bookings.splice(i, 1); } return send(res, 200, { message: 'Deleted' }); }
  if ((x = m(/^\/bookings\/(\d+)$/))) { const b = bookings.find((q) => q.id === Number(x[1])); return send(res, b ? 200 : 404, b ? view(b) : { message: 'Not found' }); }
  if (p === '/signin') { const { email = '' } = await readBody(req); const k = email.startsWith('admin') ? ['admin', admin] : email.startsWith('owner') ? ['theaterOwner', owners[0]] : ['user', users.find((u) => u.email === email) || users[0]]; return send(res, 200, { message: 'OTP sent to your email. (mock: 123456)', [k[0]]: k[1] }); }
  if (p === '/user/verifyOTP') { const { otp } = await readBody(req); return otp === '123456' ? send(res, 200, { message: 'Login Successful' }) : send(res, 400, { message: 'Invalid OTP or OTP expired' }); }
  if (p === '/user/signup') { const u = await readBody(req); users.push({ ...u, id: users.length + 1, role: 'USER' }); return send(res, 201, { message: 'User registered successfully' }); }
  if (p === '/user/validateEmail') return users.some((u) => u.email === url.searchParams.get('email')) ? send(res, 400, 'Email is already in use.') : send(res, 200, 'Email is available.');
  if (p === '/user/validatePhone') return send(res, 200, { message: 'Phone number is available' });
  if (p === '/user/getAllUsers') return send(res, 200, users);
  if ((x = m(/^\/user\/(updateUser|deleteUser)\/(\d+)$/))) return send(res, 200, { message: 'Done' });
  if (p === '/theaterowner/getAllUsers') return send(res, 200, owners);
  if ((x = m(/^\/theaterowner\/(\d+)$/))) return send(res, 200, owners[0]);
  if (p === '/api/payments/create') {
    const amount = Number(url.searchParams.get('amount'));
    if (!Number.isFinite(amount) || amount <= 0) return send(res, 400, { message: 'A valid payment amount is required.' });
    return send(res, 200, { id: `order_demo_${nextPaymentOrder++}`, amount: Math.round(amount * 100), currency: 'INR', mock: true });
  }
  if (p === '/api/payments/success') return send(res, 200, '');
  if ((x = m(/^\/tickets\/download\/(\d+)$/))) return send(res, 200, '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF', 'application/pdf');
  if (p === '/contact/send') return send(res, 200, 'Email sent successfully!', 'text/plain');
  return send(res, 404, { message: `No mock route for ${req.method} ${p}` });
}).listen(PORT, () => console.log(`Mock TicketHub API on http://localhost:${PORT}`));
