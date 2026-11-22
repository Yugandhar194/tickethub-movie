import { hashPassword } from './auth.js';
import { addDays, isoDate } from './util.js';

export const SEED_ACCOUNTS = {
  admin: { email: 'admin@tickethub.test', password: 'Admin@123' },
  owner: { email: 'owner@tickethub.test', password: 'Owner@123' },
  user: { email: 'user@tickethub.test', password: 'User@1234' },
};

const day = (n) => isoDate(addDays(new Date(), n));

const SAMPLE_FILMS = [
  ['The Last Lighthouse', 'Thriller', -34, 7.8, 412000000, 126, 'NowPlaying', 'A keeper on a storm-lashed rock realises the ships he guides home are not all heading for harbour.'],
  ['Neon Monsoon', 'Action', -27, 7.1, 366000000, 148, 'NowPlaying', 'Over one night of rain in a flooded megacity, a courier races a rogue algorithm to the last working train.'],
  ['Paper Kingdoms', 'Animation', -41, 8.2, 331000000, 102, 'NowPlaying', 'Two siblings fold a map into a world and discover the borders are alive.'],
  ['Saffron Skies', 'Romance', -20, 7.4, 198000000, 134, 'NowPlaying', 'A pilot and a kite maker trade letters across a city that is always about to change.'],
  ['Ghost Frequency', 'Horror', -13, 6.9, 176000000, 109, 'Trending', 'A late-night radio host starts taking calls from listeners who have never been born.'],
  ['Harbor Lights', 'Drama', -9, 7.6, 121000000, 117, 'Trending', 'Three generations of a fishing family fight to keep their pier open for one more season.'],
  ['Iron Orchard', 'ScienceFiction', -5, 7.3, 88000000, 139, 'NowPlaying', 'On a terraformed moon, a botanist finds the trees are rebuilding the colony in their own image.'],
  ['Velvet Hour', 'Comedy', -3, 6.8, 42000000, 121, 'Trending', 'A struggling jazz club has seven days to win over the one critic who closed down its rivals.'],
  ['Tide of Embers', 'Adventure', 6, 0, 0, 151, 'Upcoming', 'An expedition follows a river of fire to a lost city beneath a volcano.'],
  ['Quiet Machines', 'Mystery', 13, 0, 0, 113, 'Upcoming', 'A repair technician starts hearing the same sentence from every appliance she fixes.'],
];
const CAST = ['Mira Halden', 'Dev Malhotra', 'Tessa Orwell', 'Kabir Anand', 'Ines Carrow', 'Soren Platt'];

export function seedAccounts(db) {
  const hasAny = db.prepare('SELECT (SELECT COUNT(*) FROM users) + (SELECT COUNT(*) FROM theater_owners) + (SELECT COUNT(*) FROM admins) AS c').get().c;
  if (hasAny) return false;
  db.prepare('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)').run('Site Admin', SEED_ACCOUNTS.admin.email, hashPassword(SEED_ACCOUNTS.admin.password));
  const ownerId = db.prepare('INSERT INTO theater_owners (name, email, password_hash) VALUES (?, ?, ?)').run('Neha Shah', SEED_ACCOUNTS.owner.email, hashPassword(SEED_ACCOUNTS.owner.password)).lastInsertRowid;
  db.prepare('INSERT INTO users (name, email, phone, gender, marital_status, dob, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('Asha Verma', SEED_ACCOUNTS.user.email, '9000000001', 'FEMALE', 'UNMARRIED', '1996-04-12', hashPassword(SEED_ACCOUNTS.user.password));
  const t = db.prepare('INSERT INTO theaters (name, location, owner_id, format) VALUES (?, ?, ?, ?)');
  t.run('Aurora Cinemas', 'Mumbai', ownerId, '2D');
  t.run('Grand Orchid IMAX', 'Pune', ownerId, 'IMAX 3D');
  t.run('Metro Plaza Atmos', 'Mumbai', ownerId, 'Dolby Atmos');
  return true;
}

export function seedSampleMovies(db) {
  if (db.prepare('SELECT COUNT(*) AS c FROM movies').get().c) return 0;
  const ins = db.prepare(`INSERT INTO movies (movie_id, title, overview, vote_average, vote_count, release_date, status, tagline, revenue, runtime, category, type, director, writer, cast_json, is_demo)
    VALUES (NULL, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, 'Sample Director', 'Sample Writer', ?, 1)`);
  SAMPLE_FILMS.forEach(([title, category, off, rating, revenue, runtime, type, overview], i) => {
    const cast = CAST.slice(i % 3, (i % 3) + 3).map((name, n) => ({ castId: i * 10 + n, name, profile_path: null }));
    ins.run(title, overview, rating, rating ? 900 + i * 130 : 0, day(off), off > 0 ? 'Post Production' : 'Released', revenue, runtime, category, type, JSON.stringify(cast));
  });
  return SAMPLE_FILMS.length;
}

const SLOTS = ['10:30:00', '14:15:00', '18:45:00', '21:30:00'];
const BASE = { '2D': 220, 'IMAX 3D': 340, 'Dolby Atmos': 290 };

// Keeps the next seven days stocked with showtimes for every film that is out now. Safe to run repeatedly.
export function ensureSchedule(db, days = 7) {
  const films = db.prepare(`SELECT id FROM movies WHERE type IN ('NowPlaying','Trending','Popular') AND release_date <= ?`).all(day(0));
  const theaters = db.prepare('SELECT * FROM theaters').all();
  if (!films.length || !theaters.length) return 0;
  const ins = db.prepare('INSERT OR IGNORE INTO showtimes (date, time, amount, format, movie_id, theater_id) VALUES (?, ?, ?, ?, ?, ?)');
  let added = 0;
  db.transaction(() => {
    films.forEach((f, fi) => {
      for (let d = 0; d < days; d += 1) {
        theaters.forEach((t, ti) => {
          const count = 2 + ((fi + d + ti) % 3);
          for (let k = 0; k < count; k += 1) {
            const time = SLOTS[(k + fi) % SLOTS.length];
            const price = (BASE[t.format] || 230) + (time >= '18:00:00' ? 30 : 0);
            added += ins.run(day(d), time, price, t.format || null, f.id, t.id).changes;
          }
        });
      }
    });
  })();
  return added;
}
