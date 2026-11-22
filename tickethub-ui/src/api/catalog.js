import axios from 'axios';
import { hasTmdb, tmdbGet, tmdbGenres } from './tmdb';
import { fetchLocalMovies, fetchLocalMovie, fetchLocalCast, searchLocalMovies } from './backend';
import { DEMO_MOVIES } from './demo';
import { OMDB_KEY, TMDB_REGION } from '../config/env';
import { toISODate } from '../lib/format';

// ── Normalisers: every screen works with one movie shape ───────────────────
const prettyGenre = (c) => (c ? String(c).replace(/([a-z])([A-Z])/g, '$1 $2') : '');

export function fromTmdb(m, genreMap = {}) {
  return {
    id: String(m.id),
    tmdbId: m.id,
    localId: null,
    title: m.title || m.original_title || 'Untitled',
    overview: m.overview || '',
    tagline: m.tagline || '',
    poster: m.poster_path || null,
    backdrop: m.backdrop_path || null,
    rating: m.vote_average || 0,
    votes: m.vote_count || 0,
    releaseDate: m.release_date || '',
    runtime: m.runtime || 0,
    genres: m.genres ? m.genres.map((g) => g.name) : (m.genre_ids || []).map((g) => genreMap[g]).filter(Boolean),
    language: m.original_language || '',
    revenue: m.revenue || 0,
    budget: m.budget || 0,
    status: m.status || '',
    popularity: m.popularity || 0,
    imdbId: m.imdb_id || '',
    source: 'tmdb',
  };
}

export function fromLocal(m) {
  const tmdbId = Number(m.movieId) || null;
  return {
    id: tmdbId ? String(tmdbId) : `l${m.id}`,
    tmdbId,
    localId: m.id,
    title: m.title,
    overview: m.overview || '',
    tagline: m.tagline || '',
    poster: m.poster_path || null,
    backdrop: m.backdrop_path || null,
    rating: m.vote_average || 0,
    votes: m.vote_count || 0,
    releaseDate: m.release_date || '',
    runtime: m.runtime || 0,
    genres: m.category ? [prettyGenre(m.category)] : [],
    language: '',
    revenue: m.revenue || 0,
    budget: 0,
    status: m.status || '',
    popularity: m.vote_count || 0,
    imdbId: '',
    source: 'local',
  };
}

const norm = (s) => String(s || '').trim().toLowerCase();
const year = new Date().getFullYear();
const sortPopular = (a, b) => (b.popularity || 0) - (a.popularity || 0);
const dedupe = (list) => {
  const seen = new Set();
  return list.filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));
};

// ── Link between live movies and the movies that exist in the TicketHub database ──
let indexPromise;
let indexAt = 0;
export function getLocalIndex(force = false) {
  if (!indexPromise || force || Date.now() - indexAt > 5 * 60000) {
    indexAt = Date.now();
    indexPromise = Promise.all(
      ['NowPlaying', 'Trending', 'Upcoming', 'Popular'].map((t) => fetchLocalMovies(t).catch(() => null))
    ).then((lists) => {
      const byTmdb = new Map();
      const byTitle = new Map();
      const byLocal = new Map();
      lists.flat().filter(Boolean).forEach((raw) => {
        const m = fromLocal(raw);
        if (m.tmdbId) byTmdb.set(m.tmdbId, m);
        byTitle.set(norm(m.title), m);
        byLocal.set(m.localId, m);
      });
      return { byTmdb, byTitle, byLocal, online: lists.some((l) => l !== null) };
    });
  }
  return indexPromise;
}

// Finds the database row for a live movie so showtimes and bookings use a real foreign key.
export async function resolveLocalMovie(movie) {
  if (movie.localId) return movie.localId;
  const idx = await getLocalIndex();
  const hit = (movie.tmdbId && idx.byTmdb.get(movie.tmdbId)) || idx.byTitle.get(norm(movie.title));
  if (hit) return hit.localId;
  if (!idx.online) return null;
  try {
    const found = await searchLocalMovies(movie.title);
    const exact = found.find((f) => norm(f.title) === norm(movie.title));
    return exact ? exact.id : null;
  } catch {
    return null;
  }
}

async function attachLocal(items) {
  const idx = await getLocalIndex().catch(() => null);
  if (!idx) return items;
  return items.map((m) => {
    if (m.localId) return m;
    const hit = (m.tmdbId && idx.byTmdb.get(m.tmdbId)) || idx.byTitle.get(norm(m.title));
    return hit ? { ...m, localId: hit.localId } : m;
  });
}

// ── Lists. Each returns { items, source } and degrades TMDB → backend → demo ──
async function fromLocalType(types) {
  for (const t of types) {
    try {
      const rows = await fetchLocalMovies(t);
      if (rows.length) return rows.map(fromLocal);
    } catch {
      /* try next */
    }
  }
  return null;
}

const isThisSeason = (m) => (m.releaseDate || '') >= `${year}-01-01`;
const keepIfEnough = (list, pred, min = 6) => {
  const filtered = list.filter(pred);
  return filtered.length >= min ? filtered : list;
};

export async function getNowPlaying() {
  if (hasTmdb) {
    try {
      const genres = await tmdbGenres();
      const pages = await Promise.all([1, 2].map((page) => tmdbGet('/movie/now_playing', { region: TMDB_REGION, page })));
      const all = dedupe(pages.flatMap((p) => p.results || []).map((m) => fromTmdb(m, genres)));
      const items = keepIfEnough(all.filter((m) => m.poster), isThisSeason).sort(sortPopular);
      if (items.length) return { items: await attachLocal(items), source: 'tmdb' };
    } catch {
      /* fall through */
    }
  }
  const local = await fromLocalType(['NowPlaying', 'Popular']);
  if (local) return { items: local, source: 'local' };
  return { items: DEMO_MOVIES.filter((m) => m.releaseDate <= toISODate(new Date())), source: 'demo' };
}

export async function getTrending() {
  if (hasTmdb) {
    try {
      const genres = await tmdbGenres();
      const data = await tmdbGet('/trending/movie/week');
      const all = (data.results || []).map((m) => fromTmdb(m, genres)).filter((m) => m.poster);
      const items = keepIfEnough(all, isThisSeason);
      if (items.length) return { items: await attachLocal(items), source: 'tmdb' };
    } catch {
      /* fall through */
    }
  }
  const local = await fromLocalType(['Trending', 'Popular']);
  if (local) return { items: local, source: 'local' };
  return { items: [...DEMO_MOVIES].sort(sortPopular).slice(0, 8), source: 'demo' };
}

export async function getUpcoming() {
  const today = toISODate(new Date());
  if (hasTmdb) {
    try {
      const genres = await tmdbGenres();
      const data = await tmdbGet('/movie/upcoming', { region: TMDB_REGION });
      const items = (data.results || [])
        .map((m) => fromTmdb(m, genres))
        .filter((m) => m.poster && m.releaseDate > today)
        .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
      if (items.length) return { items: await attachLocal(items), source: 'tmdb' };
    } catch {
      /* fall through */
    }
  }
  const local = await fromLocalType(['Upcoming']);
  if (local) return { items: local, source: 'local' };
  return { items: DEMO_MOVIES.filter((m) => m.releaseDate > today), source: 'demo' };
}

// Box office = worldwide revenue (USD) reported by TMDB for the films currently in cinemas.
// TMDB revenue is community-maintained and lags behind trade charts, so the UI labels it as such.
export async function getBoxOffice(candidates, limit = 10) {
  const fetchedAt = Date.now();
  if (hasTmdb && candidates.length) {
    try {
      const pool = [...candidates].sort(sortPopular).slice(0, 16).filter((m) => m.tmdbId);
      const details = await Promise.all(
        pool.map((m) => tmdbGet(`/movie/${m.tmdbId}`, {}, 10).then((d) => ({ ...m, revenue: d.revenue || 0, budget: d.budget || 0, runtime: d.runtime || m.runtime, status: d.status, imdbId: d.imdb_id || '' })).catch(() => m))
      );
      const ranked = details.filter((m) => m.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
      if (ranked.length >= 3) return { items: ranked, source: 'tmdb', ranked: true, fetchedAt };
      return { items: details.sort(sortPopular).slice(0, limit), source: 'tmdb', ranked: false, fetchedAt };
    } catch {
      /* fall through */
    }
  }
  const withRevenue = candidates.filter((m) => m.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  if (withRevenue.length >= 3) return { items: withRevenue, source: candidates[0]?.source || 'local', ranked: true, fetchedAt };
  const demo = DEMO_MOVIES.filter((m) => m.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  return { items: demo, source: 'demo', ranked: true, fetchedAt };
}

export async function searchMovies(query) {
  const q = query.trim();
  if (!q) return { items: [], source: 'tmdb' };
  if (hasTmdb) {
    try {
      const genres = await tmdbGenres();
      const data = await tmdbGet('/search/movie', { query: q, include_adult: false }, 10);
      const items = (data.results || []).map((m) => fromTmdb(m, genres)).sort(sortPopular);
      return { items: await attachLocal(items), source: 'tmdb' };
    } catch {
      /* fall through */
    }
  }
  try {
    const rows = await searchLocalMovies(q);
    return { items: rows.map(fromLocal), source: 'local' };
  } catch {
    return { items: DEMO_MOVIES.filter((m) => norm(m.title).includes(norm(q))), source: 'demo' };
  }
}

// ── Single movie ───────────────────────────────────────────────────────────
function pickTrailer(videos = []) {
  const yt = videos.filter((v) => v.site === 'YouTube');
  const pick = yt.find((v) => v.type === 'Trailer' && v.official) || yt.find((v) => v.type === 'Trailer') || yt.find((v) => v.type === 'Teaser') || yt[0];
  return pick ? pick.key : '';
}

export async function getMovie(key) {
  const k = String(key);
  if (k.startsWith('d')) {
    const demo = DEMO_MOVIES.find((m) => m.id === k);
    if (!demo) throw new Error('Movie not found');
    return demo;
  }
  if (k.startsWith('l')) {
    const [raw, castDto] = await Promise.all([fetchLocalMovie(k.slice(1)), fetchLocalCast(k.slice(1)).catch(() => null)]);
    if (!raw) throw new Error('Movie not found');
    return { ...fromLocal(raw), ...localCredits(castDto), trailerKey: '' };
  }
  if (hasTmdb) {
    try {
      const d = await tmdbGet(`/movie/${k}`, { append_to_response: 'videos,credits,release_dates' }, 15);
      const movie = fromTmdb(d);
      const crew = d.credits?.crew || [];
      const director = crew.find((c) => c.job === 'Director');
      const result = {
        ...movie,
        director: director?.name || '',
        writer: crew.find((c) => c.job === 'Writer' || c.job === 'Screenplay')?.name || '',
        cast: (d.credits?.cast || []).slice(0, 18).map((c) => ({ id: c.id, name: c.name, character: c.character, photo: c.profile_path })),
        trailerKey: pickTrailer(d.videos?.results),
        companies: (d.production_companies || []).map((c) => c.name).slice(0, 3),
        spokenLanguages: (d.spoken_languages || []).map((l) => l.english_name),
      };
      result.localId = await resolveLocalMovie(result);
      return result;
    } catch (err) {
      if (err?.response?.status === 404) throw err;
      /* otherwise try the local copy */
    }
  }
  const idx = await getLocalIndex();
  const local = idx.byTmdb.get(Number(k));
  if (!local) throw new Error('Movie not found');
  const castDto = await fetchLocalCast(local.localId).catch(() => null);
  return { ...local, ...localCredits(castDto), trailerKey: '' };
}

function localCredits(dto) {
  return {
    director: dto?.director || '',
    writer: dto?.writer || '',
    cast: (dto?.casts || []).map((c, i) => ({ id: c.castId || i, name: c.name, character: '', photo: c.profile_path })),
  };
}

export async function getSimilar(movie) {
  if (hasTmdb && movie.tmdbId) {
    try {
      const genres = await tmdbGenres();
      const data = await tmdbGet(`/movie/${movie.tmdbId}/recommendations`);
      const items = (data.results || []).map((m) => fromTmdb(m, genres)).filter((m) => m.poster).slice(0, 14);
      if (items.length) return attachLocal(items);
    } catch {
      /* fall through */
    }
  }
  const pool = await getNowPlaying();
  return pool.items.filter((m) => m.id !== movie.id).slice(0, 12);
}

export async function getOmdb(imdbId) {
  if (!OMDB_KEY || !imdbId) return null;
  try {
    const { data } = await axios.get('https://www.omdbapi.com/', { params: { i: imdbId, apikey: OMDB_KEY }, timeout: 8000 });
    if (data.Response === 'False') return null;
    const rt = (data.Ratings || []).find((r) => r.Source === 'Rotten Tomatoes');
    return {
      imdb: data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : '',
      rottenTomatoes: rt ? rt.Value : '',
      metascore: data.Metascore && data.Metascore !== 'N/A' ? data.Metascore : '',
      domestic: data.BoxOffice && data.BoxOffice !== 'N/A' ? data.BoxOffice : '',
    };
  } catch {
    return null;
  }
}

export async function getGenreOptions() {
  const map = await tmdbGenres();
  return Object.values(map).sort();
}

// Trailer lookup for list items (the list endpoints do not include videos).
export async function getTrailerKey(movie) {
  if (movie.trailerKey) return movie.trailerKey;
  if (!hasTmdb || !movie.tmdbId) return '';
  try {
    const d = await tmdbGet(`/movie/${movie.tmdbId}/videos`, {}, 60 * 24);
    const key = pickTrailer(d.results);
    if (key) return key;
    const en = await tmdbGet(`/movie/${movie.tmdbId}/videos`, { language: 'en-US' }, 60 * 24);
    return pickTrailer(en.results);
  } catch {
    return '';
  }
}
