export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const pad = (n) => String(n).padStart(2, '0');
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d, n) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
};
export const showStart = (date, time) => new Date(`${date}T${String(time).slice(0, 8).padEnd(8, ':00').slice(0, 8)}`);
export const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const SEAT_RE = /^[A-H](1[0-4]|[1-9])$/;
