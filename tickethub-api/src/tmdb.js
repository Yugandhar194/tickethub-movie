// Server-side TMDB import. Fills the movies table with the films that are in cinemas, trending and upcoming,
// storing the TMDB id in movie_id so the UI can match live titles to bookable ones.
const PRIORITY = ['NowPlaying', 'Trending', 'Upcoming', 'Popular'];

export async function syncFromTmdb(db, cfg, log = console.log) {
  const { key, base, region } = cfg.tmdb;
  if (!key) throw new Error('TMDB_API_KEY is not set, so there is nothing to import.');
  const bearer = key.startsWith('eyJ') || key.length > 60;

  async function get(path, params = {}) {
    const url = new URL(base + path);
    Object.entries({ language: 'en-US', ...(bearer ? {} : { api_key: key }), ...params }).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url, { headers: bearer ? { Authorization: `Bearer ${key}` } : {}, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`TMDB ${path} returned ${res.status}`);
    return res.json();
  }

  const lists = {
    NowPlaying: ['/movie/now_playing', [{ region, page: 1 }, { region, page: 2 }]],
    Trending: ['/trending/movie/week', [{}]],
    Upcoming: ['/movie/upcoming', [{ region }]],
    Popular: ['/movie/popular', [{}]],
  };
  const chosen = new Map(); // tmdb id -> { type, row }
  for (const type of PRIORITY) {
    const [path, pages] = lists[type];
    for (const p of pages) {
      try {
        const data = await get(path, p);
        for (const m of data.results || []) if (m.poster_path && !chosen.has(m.id)) chosen.set(m.id, { type, row: m });
      } catch (e) {
        log(`[tmdb] ${path}: ${e.message}`);
      }
    }
  }
  if (!chosen.size) throw new Error('TMDB returned no movies. Check the API key.');

  const upsert = db.prepare(`INSERT INTO movies (movie_id, title, overview, vote_average, vote_count, release_date, backdrop_path, poster_path, status, tagline,
      revenue, runtime, category, type, director, writer, cast_json, is_demo)
    VALUES (@movie_id, @title, @overview, @vote_average, @vote_count, @release_date, @backdrop_path, @poster_path, @status, @tagline,
      @revenue, @runtime, @category, @type, @director, @writer, @cast_json, 0)
    ON CONFLICT(movie_id) DO UPDATE SET title=excluded.title, overview=excluded.overview, vote_average=excluded.vote_average, vote_count=excluded.vote_count,
      release_date=excluded.release_date, backdrop_path=excluded.backdrop_path, poster_path=excluded.poster_path, status=excluded.status, tagline=excluded.tagline,
      revenue=excluded.revenue, runtime=excluded.runtime, category=excluded.category, type=excluded.type, director=excluded.director, writer=excluded.writer,
      cast_json=excluded.cast_json, is_demo=0`);

  const entries = [...chosen.entries()].slice(0, 70);
  let done = 0;
  const queue = [...entries];
  const worker = async () => {
    while (queue.length) {
      const [id, { type, row }] = queue.shift();
      let d = row;
      try {
        d = await get(`/movie/${id}`, { append_to_response: 'credits' });
      } catch (e) {
        log(`[tmdb] details for ${id}: ${e.message}`);
      }
      const crew = d.credits?.crew || [];
      const cast = (d.credits?.cast || []).slice(0, 12).map((c, i) => ({ castId: c.id ?? i, name: c.name, profile_path: c.profile_path || null }));
      upsert.run({
        movie_id: id, title: d.title || row.title, overview: d.overview || '', vote_average: d.vote_average || 0, vote_count: d.vote_count || 0,
        release_date: d.release_date || '', backdrop_path: d.backdrop_path || row.backdrop_path || null, poster_path: d.poster_path || row.poster_path,
        status: d.status || (type === 'Upcoming' ? 'Upcoming' : 'Released'), tagline: d.tagline || '', revenue: d.revenue || 0, runtime: d.runtime || 0,
        category: (d.genres?.[0]?.name || '').replace(/\s+/g, ''), type, director: crew.find((c) => c.job === 'Director')?.name || '',
        writer: crew.find((c) => ['Writer', 'Screenplay'].includes(c.job))?.name || '', cast_json: JSON.stringify(cast),
      });
      done += 1;
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));

  // Real films replace the sample ones, unless a sample film already has bookings.
  const removed = db.prepare(`DELETE FROM movies WHERE is_demo = 1 AND id NOT IN (SELECT s.movie_id FROM showtimes s JOIN bookings b ON b.showtime_id = s.id)`).run().changes;
  log(`[tmdb] imported ${done} movies${removed ? `, removed ${removed} sample movies` : ''}`);
  return { imported: done, removedSamples: removed };
}
