import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { ApiError } from './util.js';

export const hashPassword = (pw) => bcrypt.hashSync(pw, 10);
export const checkPassword = (pw, hash) => bcrypt.compareSync(String(pw || ''), hash);

export function createAuth(db, cfg) {
  const sign = (acc) => jwt.sign({ sub: acc.id, role: acc.role, email: acc.email, name: acc.name }, cfg.jwtSecret, { expiresIn: '12h' });

  // Reads "Authorization: Bearer <token>" when present. Routes decide whether a user is required.
  const attach = (req, _res, next) => {
    const h = req.headers.authorization || '';
    if (h.startsWith('Bearer ')) {
      try {
        const p = jwt.verify(h.slice(7), cfg.jwtSecret);
        req.user = { id: p.sub, role: p.role, email: p.email, name: p.name };
      } catch {
        /* an invalid or expired token is treated as signed out */
      }
    }
    next();
  };
  const requireAuth = (req, _res, next) => (req.user ? next() : next(new ApiError(401, 'Please sign in to continue.')));
  const requireRole = (...roles) => (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Please sign in to continue.'));
    return roles.includes(req.user.role) ? next() : next(new ApiError(403, 'You do not have access to this.'));
  };

  function findAccount(email) {
    const e = String(email || '').trim();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(e);
    if (user) return { kind: 'user', row: user };
    const owner = db.prepare('SELECT * FROM theater_owners WHERE email = ?').get(e);
    if (owner) return { kind: 'owner', row: owner };
    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(e);
    if (admin) return { kind: 'admin', row: admin };
    return null;
  }

  // ── One-time codes (kept in memory; they live for 5 minutes) ──
  const otps = new Map();
  const attempts = new Map();
  const tooMany = (key, limit, windowMs) => {
    const now = Date.now();
    const list = (attempts.get(key) || []).filter((t) => now - t < windowMs);
    attempts.set(key, list);
    return list.length >= limit;
  };
  const note = (key) => attempts.set(key, [...(attempts.get(key) || []), Date.now()]);

  const transporter = cfg.otpMode === 'smtp' ? nodemailer.createTransport({ host: cfg.smtp.host, port: cfg.smtp.port, secure: cfg.smtp.port === 465, auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined }) : null;

  async function sendMail(to, subject, text) {
    if (!transporter) return false;
    await transporter.sendMail({ from: cfg.smtp.from, to, subject, text });
    return true;
  }

  async function issueOtp(email) {
    const key = `signin:${String(email).toLowerCase()}`;
    if (tooMany(key, cfg.signinLimit, 15 * 60000)) throw new ApiError(429, 'Too many attempts. Try again in a few minutes.');
    note(key);
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    otps.set(String(email).toLowerCase(), { code, expires: Date.now() + 5 * 60000, tries: 0 });
    if (cfg.otpMode === 'smtp') {
      await sendMail(email, 'Your TicketHub sign-in code', `Your one-time code is ${code}. It expires in 5 minutes.`);
      return { message: 'We sent a one-time code to your email.' };
    }
    console.log(`[otp] ${email} -> ${code}`);
    return { message: `Development mode: your one-time code is ${code}.`, devOtp: code };
  }

  function checkOtp(email, code) {
    const k = String(email).toLowerCase();
    const rec = otps.get(k);
    if (!rec || rec.expires < Date.now()) throw new ApiError(400, 'That code is wrong or has expired.');
    rec.tries += 1;
    if (rec.tries > 5) {
      otps.delete(k);
      throw new ApiError(400, 'Too many wrong codes. Request a new one.');
    }
    const a = Buffer.from(rec.code);
    const b = Buffer.from(String(code || '').trim());
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new ApiError(400, 'That code is wrong or has expired.');
    otps.delete(k);
  }

  return { sign, attach, requireAuth, requireRole, findAccount, issueOtp, checkOtp, sendMail, tooMany, note };
}
