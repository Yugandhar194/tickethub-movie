import axios from 'axios';
import { TMDB_KEY, TMDB_LANGUAGE } from '../config/env';

export const hasTmdb = Boolean(TMDB_KEY);

// TMDB issues two credentials: a short v3 API key (query param) and a long v4 read token (Bearer).
const isBearer = TMDB_KEY.startsWith('eyJ') || TMDB_KEY.length > 60;

const client = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  timeout: 10000,
  headers: isBearer ? { Authorization: `Bearer ${TMDB_KEY}` } : {},
  params: isBearer ? {} : { api_key: TMDB_KEY },
});

const PREFIX = 'th:tmdb:';
const readCache = (k) => {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + k) || 'null');
  } catch {
    return null;
  }
};
const writeCache = (k, v) => {
  try {
    localStorage.setItem(PREFIX + k, JSON.stringify({ t: Date.now(), v }));
  } catch {
    /* quota exceeded: skip caching */
  }
};

const inflight = new Map();

// GET with a TTL cache. When the network fails, the last cached answer is returned (even if stale),
// so the home page keeps rendering during an outage or when the rate limit is hit.
export async function tmdbGet(path, params = {}, ttlMinutes = 30) {
  if (!hasTmdb) throw new Error('TMDB key missing');
  const k = `${path}?${JSON.stringify(params)}`;
  const cached = readCache(k);
  if (cached && Date.now() - cached.t < ttlMinutes * 60000) return cached.v;
  if (inflight.has(k)) return inflight.get(k);

  const p = client
    .get(path, { params: { language: TMDB_LANGUAGE, ...params } })
    .then((res) => {
      writeCache(k, res.data);
      return res.data;
    })
    .catch((err) => {
      if (cached) return cached.v;
      throw err;
    })
    .finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}

let genreMapPromise;
export function tmdbGenres() {
  if (!genreMapPromise) {
    genreMapPromise = tmdbGet('/genre/movie/list', {}, 60 * 24)
      .then((d) => Object.fromEntries((d.genres || []).map((g) => [g.id, g.name])))
      .catch(() => {
        genreMapPromise = undefined;
        return {};
      });
  }
  return genreMapPromise;
}
