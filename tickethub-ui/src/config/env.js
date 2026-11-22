// Single place where environment variables are read. Everything else imports from here.
const env = import.meta.env;

export const BACKEND = (env.VITE_BACKEND || 'spring').toLowerCase() === 'dotnet' ? 'dotnet' : 'spring';

export const API_BASE = (
  env.VITE_API_BASE_URL || (BACKEND === 'dotnet' ? 'http://localhost:5266' : 'http://localhost:8080')
).replace(/\/$/, '');

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
