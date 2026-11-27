import 'dotenv/config';

export function loadConfig(overrides = {}) {
  const env = process.env;
  const num = (v, d) => (Number.isFinite(Number(v)) && v !== undefined && v !== '' ? Number(v) : d);
  const cfg = {
    port: num(env.PORT, 8080),
    dbFile: env.DB_FILE || './data/tickethub.db',
    jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me',
    corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()),
    frontendUrl: (env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
    holdMinutes: num(env.SEAT_HOLD_MINUTES, 10),
    cancelCutoffHours: num(env.CANCEL_CUTOFF_HOURS, 2),
    convenienceFeePct: Math.max(0, num(env.CONVENIENCE_FEE_PCT, 0)),
    gstPct: Math.max(0, num(env.GST_PCT, 0)),
    tmdb: {
      key: (env.TMDB_API_KEY || '').trim(),
      base: (env.TMDB_BASE_URL || 'https://api.themoviedb.org/3').replace(/\/$/, ''),
      region: env.TMDB_REGION || 'IN',
    },
    razorpay: { keyId: env.RAZORPAY_KEY_ID || '', keySecret: env.RAZORPAY_KEY_SECRET || '' },
    googleClientId: (env.GOOGLE_CLIENT_ID || '').trim(),
    whatsapp: { token: env.WHATSAPP_ACCESS_TOKEN || '', phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || '', template: env.WHATSAPP_TEMPLATE_NAME || 'tickethub_booking_confirmed', graphVersion: env.WHATSAPP_GRAPH_VERSION || 'v24.0' },
    smtp: { host: env.SMTP_HOST || '', port: num(env.SMTP_PORT, 587), user: env.SMTP_USER || '', pass: env.SMTP_PASS || '', from: env.SMTP_FROM || env.SMTP_USER || 'TicketHub <no-reply@tickethub.local>' },
    // "console" prints the OTP in the server log and returns it in the sign-in response (local development only).
    // It switches to "smtp" automatically when SMTP_HOST is set.
    otpMode: env.SMTP_HOST ? 'smtp' : (env.OTP_MODE || 'console'),
    seedDemo: env.SEED_DEMO !== 'false',
    autoSchedule: env.AUTO_SCHEDULE !== 'false',
    signinLimit: num(env.SIGNIN_LIMIT, 8), // sign-in attempts per email per 15 minutes
    seats: { rows: 'ABCDEFGH', cols: 14, max: 8 },
    ...overrides,
  };
  cfg.paymentMode = cfg.razorpay.keyId && cfg.razorpay.keySecret ? 'razorpay' : 'mock';
  return cfg;
}
