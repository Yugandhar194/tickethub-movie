import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { createApp } from './app.js';
import { SEED_ACCOUNTS, ensureSchedule, seedAccounts, seedSampleMovies } from './seed.js';
import { syncFromTmdb } from './tmdb.js';

const cfg = loadConfig();

// Refuse unsafe demo defaults in production instead of silently issuing weak tokens or fake payments.
if (process.env.NODE_ENV === 'production') {
  if (cfg.jwtSecret === 'dev-only-secret-change-me' || cfg.jwtSecret.length < 32) {
    throw new Error('Production requires a strong JWT_SECRET (at least 32 characters).');
  }
  if (cfg.paymentMode !== 'razorpay') throw new Error('Production requires both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  if (cfg.otpMode !== 'smtp') throw new Error('Production requires SMTP_HOST so sign-in codes are not exposed in API responses or logs.');
  if (cfg.seedDemo) throw new Error('Set SEED_DEMO=false in production to disable demo accounts and sample data.');
}
const db = openDb(cfg.dbFile);
const { app, svc } = createApp(db, cfg);

if (cfg.seedDemo && seedAccounts(db)) {
  console.log('\nSeeded demo accounts (change or delete them before going live):');
  Object.entries(SEED_ACCOUNTS).forEach(([role, a]) => console.log(`  ${role.padEnd(6)} ${a.email}  /  ${a.password}`));
}

const moviesEmpty = () => db.prepare('SELECT COUNT(*) AS c FROM movies').get().c === 0;
if (moviesEmpty() && cfg.tmdb.key) {
  try {
    await syncFromTmdb(db, cfg);
  } catch (e) {
    console.warn(`[tmdb] first import failed: ${e.message}`);
  }
}
if (cfg.seedDemo && seedSampleMovies(db)) console.log('Added sample movies (set TMDB_API_KEY and call GET /movies as admin to import real ones).');
if (cfg.autoSchedule) {
  const n = ensureSchedule(db);
  if (n) console.log(`Scheduled ${n} showtimes for the next 7 days.`);
}

setInterval(() => svc.releaseExpired(), 15000).unref();
if (cfg.autoSchedule) setInterval(() => ensureSchedule(db), 6 * 3600000).unref();

if (cfg.jwtSecret === 'dev-only-secret-change-me') console.warn('! JWT_SECRET is not set. Using an insecure development secret.');
if (cfg.otpMode === 'console') console.warn('! OTP_MODE=console: sign-in codes are printed here and returned by the API. Set SMTP_* before going live.');
if (cfg.paymentMode === 'mock') console.warn('! No Razorpay keys: payments are simulated.');

app.listen(cfg.port, () => console.log(`\nTicketHub API ready on http://localhost:${cfg.port}  (database: ${cfg.dbFile})`));
