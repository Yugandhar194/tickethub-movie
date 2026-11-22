const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatINR(value) {
  const n = Number(value) || 0;
  return Number.isInteger(n) ? inr0.format(n) : inr2.format(n);
}

export function formatCurrency(value, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(Number(value) || 0);
  } catch {
    return `${currency} ${Number(value) || 0}`;
  }
}

const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});
const usdFull = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const formatUSDCompact = (n) => (n > 0 ? usdCompact.format(n) : '—');
export const formatUSD = (n) => (n > 0 ? usdFull.format(n) : '—');

export function parseISODate(value) {
  if (!value) return null;
  // "2026-11-21" must be read as a local date, not UTC midnight.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const addDays = (d, n) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
};

export function formatDate(value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = value instanceof Date ? value : parseISODate(value);
  return d ? d.toLocaleDateString('en-IN', opts) : '—';
}

export function formatTime(value) {
  if (!value) return '';
  const [h = '0', m = '0'] = String(value).split(':');
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function showStart(date, time) {
  const d = parseISODate(date);
  if (!d) return null;
  const [h = '0', m = '0'] = String(time || '0:0').split(':');
  d.setHours(Number(h), Number(m), 0, 0);
  return d;
}

export function formatRuntime(min) {
  const n = Number(min);
  if (!n) return '';
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export const bookingCode = (id) => {
  const value = String(id);
  return `TH-${/^\d+$/.test(value) ? value.padStart(6, '0') : value.slice(0, 8).toUpperCase()}`;
};

export const releaseYear = (value) => {
  const d = parseISODate(value);
  return d ? d.getFullYear() : '';
};

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export const cn = (...parts) => parts.filter(Boolean).join(' ');
