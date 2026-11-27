import crypto from 'node:crypto';
import { Router } from 'express';
import { ApiError, EMAIL_RE, wrap } from '../util.js';
import { adminView, ownerView, userView } from '../views.js';
import { checkPassword, hashPassword } from '../auth.js';

export default function accountRoutes({ db, cfg, auth }) {
  const r = Router();

  // Google Identity Services sends a signed ID token. Verify it with Google's tokeninfo
  // endpoint and enforce this application's configured OAuth client ID before trusting the email.
  r.post('/auth/google', wrap(async (req, res) => {
    if (!cfg.googleClientId) throw new ApiError(503, 'Google sign-in is not configured on this server.');
    const credential = String(req.body?.credential || '');
    if (!credential || credential.length > 10000) throw new ApiError(400, 'A valid Google credential is required.');
    let claims;
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, { signal: AbortSignal.timeout(10000) });
      claims = await response.json();
      if (!response.ok) throw new Error('Google rejected the credential.');
    } catch {
      throw new ApiError(401, 'Google sign-in could not be verified. Please try again.');
    }
    const issuerOk = ['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss);
    if (!issuerOk || claims.aud !== cfg.googleClientId || claims.email_verified !== 'true' || !claims.email) {
      throw new ApiError(401, 'Google sign-in could not be verified for this application.');
    }
    const email = String(claims.email).trim().toLowerCase();
    let account = auth.findAccount(email);
    if (account && account.kind !== 'user') throw new ApiError(403, 'Use your staff sign-in to access this account.');
    if (!account) {
      const name = String(claims.name || claims.given_name || email.split('@')[0]).trim().slice(0, 100);
      const passwordHash = hashPassword(crypto.randomBytes(48).toString('hex'));
      const id = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run(name, email, passwordHash).lastInsertRowid;
      account = { kind: 'user', row: db.prepare('SELECT * FROM users WHERE id = ?').get(id) };
    }
    res.json({ message: 'Google sign-in successful.', token: auth.sign(account.row), user: userView(account.row) });
  }));

  r.post('/signin', wrap(async (req, res) => {
    const { email, password } = req.body || {};
    const acc = auth.findAccount(email);
    // Same message for an unknown email and a wrong password.
    if (!acc || !checkPassword(password, acc.row.password_hash)) throw new ApiError(401, 'Invalid email or password.');
    const sent = await auth.issueOtp(acc.row.email);
    const body = { message: sent.message, timeStamp: new Date().toISOString() };
    if (acc.kind === 'user') body.user = userView(acc.row);
    if (acc.kind === 'owner') body.theaterOwner = ownerView(db, acc.row);
    if (acc.kind === 'admin') body.admin = adminView(acc.row);
    if (sent.devOtp) body.devOtp = sent.devOtp;
    res.json(body);
  }));

  r.post('/user/verifyOTP', wrap((req, res) => {
    const { email, otp } = req.body || {};
    if (auth.tooMany(`verify:${String(email).toLowerCase()}`, cfg.signinLimit * 2, 15 * 60000)) throw new ApiError(429, 'Too many attempts. Try again in a few minutes.');
    auth.note(`verify:${String(email).toLowerCase()}`);
    auth.checkOtp(email, otp);
    const acc = auth.findAccount(email);
    if (!acc) throw new ApiError(404, 'Account not found.');
    res.json({ message: 'Login Successful', token: auth.sign(acc.row) });
  }));

  r.post('/user/signup', wrap((req, res) => {
    const { name, email, phone, gender, maritalStatus, dob, password } = req.body || {};
    if (!name?.trim()) throw new ApiError(400, 'Enter your name.');
    if (!EMAIL_RE.test(email || '')) throw new ApiError(400, 'Enter a valid email address.');
    if (!phone?.trim()) throw new ApiError(400, 'Enter your phone number.');
    if (!password || String(password).length < 8) throw new ApiError(400, 'Use a password of at least 8 characters.');
    if (auth.findAccount(email)) throw new ApiError(400, 'An account with this email already exists.');
    if (db.prepare('SELECT 1 FROM users WHERE phone = ?').get(phone)) throw new ApiError(400, 'This phone number is already in use.');
    db.prepare('INSERT INTO users (name, email, phone, gender, marital_status, dob, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(name.trim(), email.trim(), phone.trim(), gender || null, maritalStatus || null, dob || null, hashPassword(password));
    res.status(201).json({ message: 'User registered successfully' });
  }));

  r.get('/user/validateEmail', wrap((req, res) => {
    if (auth.findAccount(req.query.email)) throw new ApiError(400, 'Email is already in use.');
    res.json({ message: 'Email is available.' });
  }));
  r.get('/user/validatePhone', wrap((req, res) => {
    if (db.prepare('SELECT 1 FROM users WHERE phone = ?').get(String(req.query.phone || ''))) throw new ApiError(400, 'Phone number is already in use.');
    res.json({ message: 'Phone number is available.' });
  }));

  r.get('/user/getAllUsers', auth.requireRole('ADMIN'), wrap((_req, res) => {
    res.json(db.prepare('SELECT * FROM users ORDER BY id').all().map(userView));
  }));

  // Profile edits touch only these fields. The password is never changed here.
  r.put('/user/updateUser/:id', auth.requireAuth, wrap((req, res) => {
    const id = Number(req.params.id);
    if (req.user.role !== 'ADMIN' && !(req.user.role === 'USER' && req.user.id === id)) throw new ApiError(403, 'You can only edit your own details.');
    const cur = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!cur) throw new ApiError(404, 'User not found.');
    const b = req.body || {};
    if (b.email && b.email !== cur.email) {
      if (!EMAIL_RE.test(b.email)) throw new ApiError(400, 'Enter a valid email address.');
      if (auth.findAccount(b.email)) throw new ApiError(400, 'That email is already in use.');
    }
    if (b.phone && b.phone !== cur.phone && db.prepare('SELECT 1 FROM users WHERE phone = ? AND id != ?').get(b.phone, id)) throw new ApiError(400, 'That phone number is already in use.');
    db.prepare('UPDATE users SET name = ?, email = ?, phone = ?, gender = ?, marital_status = ?, dob = ? WHERE id = ?')
      .run(b.name?.trim() || cur.name, b.email || cur.email, b.phone || cur.phone, b.gender || cur.gender, b.maritalStatus || cur.marital_status, b.dob || cur.dob, id);
    res.json({ message: 'Updated User Details !!!' });
  }));

  r.delete('/user/deleteUser/:id', auth.requireRole('ADMIN'), wrap((req, res) => {
    const n = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id).changes;
    if (!n) throw new ApiError(404, 'User not found.');
    res.json({ message: 'User deleted successfully' });
  }));

  r.get('/theaterowner/getAllUsers', auth.requireRole('ADMIN'), wrap((_req, res) => {
    res.json(db.prepare('SELECT * FROM theater_owners ORDER BY id').all().map((o) => ownerView(db, o)));
  }));
  r.get('/theaterowner/:id', auth.requireAuth, wrap((req, res) => {
    const id = Number(req.params.id);
    if (req.user.role !== 'ADMIN' && !(req.user.role === 'THEATER_OWNER' && req.user.id === id)) throw new ApiError(403, 'You do not have access to this.');
    const o = db.prepare('SELECT * FROM theater_owners WHERE id = ?').get(id);
    if (!o) throw new ApiError(404, 'Theater owner not found.');
    res.json(ownerView(db, o));
  }));
  r.delete('/theaterowner/deleteUser/:id', auth.requireRole('ADMIN'), wrap((req, res) => {
    const n = db.prepare('DELETE FROM theater_owners WHERE id = ?').run(req.params.id).changes;
    if (!n) throw new ApiError(404, 'Theater owner not found.');
    res.json({ message: 'Theater owner deleted successfully' });
  }));

  r.post('/contact/send', wrap(async (req, res) => {
    const { name, email, phone, message } = req.body || {};
    if (!name?.trim() || !EMAIL_RE.test(email || '') || !message?.trim()) throw new ApiError(400, 'Please fill in your name, a valid email and a message.');
    if (auth.tooMany(`contact:${String(email).toLowerCase()}`, 5, 60 * 60000)) throw new ApiError(429, 'Too many messages. Try again later.');
    auth.note(`contact:${String(email).toLowerCase()}`);
    db.prepare('INSERT INTO contact_requests (name, email, phone, message) VALUES (?, ?, ?, ?)').run(name.trim(), email.trim(), phone || null, message.trim());
    if (cfg.otpMode === 'smtp') await auth.sendMail(cfg.smtp.user || cfg.smtp.from, `TicketHub contact from ${name}`, `${message}\n\nFrom: ${name} <${email}> ${phone || ''}`).catch(() => {});
    res.type('text/plain').send('Message received');
  }));

  return r;
}
