import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT UNIQUE, gender TEXT, marital_status TEXT, dob TEXT, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER', created_on TEXT DEFAULT (date('now')));
CREATE TABLE IF NOT EXISTS theater_owners (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'THEATER_OWNER', created_on TEXT DEFAULT (date('now')));
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'ADMIN', created_on TEXT DEFAULT (date('now')));
CREATE TABLE IF NOT EXISTS theaters (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, location TEXT,
  owner_id INTEGER NOT NULL REFERENCES theater_owners(id) ON DELETE CASCADE, format TEXT);
CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT, movie_id INTEGER UNIQUE, title TEXT NOT NULL, overview TEXT,
  vote_average REAL DEFAULT 0, vote_count INTEGER DEFAULT 0, release_date TEXT, backdrop_path TEXT, poster_path TEXT,
  status TEXT, tagline TEXT, revenue INTEGER DEFAULT 0, runtime INTEGER DEFAULT 0, category TEXT, type TEXT,
  director TEXT, writer TEXT, cast_json TEXT DEFAULT '[]', is_demo INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_movies_type ON movies(type);
CREATE TABLE IF NOT EXISTS showtimes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, time TEXT NOT NULL, amount REAL NOT NULL, format TEXT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  theater_id INTEGER NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
  UNIQUE(movie_id, theater_id, date, time));
CREATE INDEX IF NOT EXISTS idx_showtimes_movie ON showtimes(movie_id, date);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  showtime_id INTEGER NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE, no_of_seat INTEGER NOT NULL,
  booking_date TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', expires_at INTEGER, amount_total REAL NOT NULL,
  order_id TEXT, order_amount REAL, payment_id TEXT, paid_at TEXT, created_at INTEGER NOT NULL, seats_json TEXT, food_json TEXT DEFAULT '[]', food_total REAL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE TABLE IF NOT EXISTS booked_seats (
  id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  showtime_id INTEGER NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE, seat_no TEXT NOT NULL,
  UNIQUE(showtime_id, seat_no));
CREATE TABLE IF NOT EXISTS contact_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, phone TEXT, message TEXT, created_at TEXT DEFAULT (datetime('now')));
`;

export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  // Forward-only, idempotent migrations for databases created by earlier TicketHub versions.
  const bookingColumns = new Set(db.pragma('table_info(bookings)').map((column) => column.name));
  if (!bookingColumns.has('food_json')) db.exec("ALTER TABLE bookings ADD COLUMN food_json TEXT DEFAULT '[]'");
  if (!bookingColumns.has('food_total')) db.exec('ALTER TABLE bookings ADD COLUMN food_total REAL DEFAULT 0');
  return db;
}
