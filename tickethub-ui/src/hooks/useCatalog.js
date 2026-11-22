import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBoxOffice, getNowPlaying, getTrending, getUpcoming } from '../api/catalog';

const dedupe = (list) => {
  const seen = new Set();
  return list.filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));
};

// Loads every list the discovery pages need, once, and derives the box-office ranking from them.
export default function useCatalog({ withBoxOffice = true } = {}) {
  const [state, setState] = useState({ loading: true, now: [], trending: [], upcoming: [], box: null, sources: [] });

  const load = useCallback(async () => {
    const [now, trending, upcoming] = await Promise.all([getNowPlaying(), getTrending(), getUpcoming()]);
    setState((s) => ({ ...s, now: now.items, trending: trending.items, upcoming: upcoming.items, sources: [now.source, trending.source, upcoming.source], loading: false }));
    if (withBoxOffice) {
      const box = await getBoxOffice(dedupe([...now.items, ...trending.items]));
      setState((s) => ({ ...s, box }));
    }
  }, [withBoxOffice]);

  useEffect(() => {
    load().catch(() => setState((s) => ({ ...s, loading: false })));
  }, [load]);

  useEffect(() => {
    if (!withBoxOffice) return undefined;
    const t = setInterval(() => load().catch(() => {}), 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [load, withBoxOffice]);

  const refreshBox = useCallback(async () => {
    setState((s) => ({ ...s, box: null }));
    await load();
  }, [load]);

  const pool = useMemo(() => dedupe([...state.now, ...state.trending, ...state.upcoming]), [state.now, state.trending, state.upcoming]);
  const source = state.sources.includes('tmdb') ? 'tmdb' : state.sources.includes('local') ? 'local' : state.sources[0] || 'tmdb';
  return { ...state, pool, source, refreshBox };
}
