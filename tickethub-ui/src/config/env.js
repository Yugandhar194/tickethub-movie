// Single place where environment variables are read. Everything else imports from here.
const env = import.meta.env;

export const BACKEND = (env.VITE_BACKEND || 'spring').toLowerCase() === 'dotnet' ? 'dotnet' : 'spring';

const configuredApiBase = (env.VITE_API_BASE_URL || '').trim();
const isLocalApiOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(configuredApiBase);

// A Vite VITE_* value is compiled into the bundle. If Vercel accidentally has a
// localhost value configured, never ship browser requests back to the visitor's computer.
const resolvedApiBase = env.PROD && isLocalApiOrigin
  ? (BACKEND === 'dotnet' ? 'http://localhost:5266' : 'https://tickethub-api-iota.vercel.app')
  : (configuredApiBase || (BACKEND === 'dotnet' ? 'http://localhost:5266' : (env.PROD ? 'https://tickethub-api-iota.vercel.app' : 'http://localhost:8080')));

export const API_BASE = resolvedApiBase.replace(/\/$/, '');
export const AUTH_API_BASE_URL = (env.VITE_AUTH_API_BASE_URL || '').trim().replace(/\/$/, '');
export const GOOGLE_CLIENT_ID = (env.VITE_GOOGLE_CLIENT_ID || '').trim();

export const TMDB_KEY = (env.VITE_TMDB_API_KEY || '').trim();
export const TMDB_REGION = env.VITE_TMDB_REGION || 'IN';
export const TMDB_LANGUAGE = env.VITE_TMDB_LANGUAGE || 'en-US';
export const OMDB_KEY = (env.VITE_OMDB_API_KEY || '').trim();

export const RAZORPAY_KEY_ID = env.VITE_RAZORPAY_KEY_ID || '';

const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};
export const CONVENIENCE_FEE_PCT = num(env.VITE_CONVENIENCE_FEE_PCT, 0);
export const GST_PCT = num(env.VITE_GST_PCT, 0);
export const SEAT_HOLD_MINUTES = num(env.VITE_SEAT_HOLD_MINUTES, 8) || 8;

// The Spring update endpoint saves the request body as the whole user row, and the login response
// never includes the password, so saving a profile can blank the password. Off until that is fixed.
export const ENABLE_PROFILE_EDIT = String(env.VITE_ENABLE_PROFILE_EDIT || '').toLowerCase() === 'true';
