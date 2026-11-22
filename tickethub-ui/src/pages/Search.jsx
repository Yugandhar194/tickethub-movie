import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, SearchX } from 'lucide-react';
import { searchMovies } from '../api/catalog';
import { useAsync, useDebounced } from '../hooks/useAsync';
import useCatalog from '../hooks/useCatalog';
import MovieGrid from '../components/movie/MovieGrid';
import SectionHeader from '../components/ui/SectionHeader';
import EmptyState from '../components/ui/EmptyState';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const debounced = useDebounced(q, 350);
  const { trending, loading: trendingLoading } = useCatalog({ withBoxOffice: false });

  useEffect(() => {
    const incoming = params.get('q') || '';
    setQ((cur) => (cur === incoming ? cur : incoming));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('q')]);

  useEffect(() => {
    const next = debounced.trim();
    if (next !== (params.get('q') || '')) setParams(next ? { q: next } : {}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const { data, loading } = useAsync(() => (debounced.trim() ? searchMovies(debounced) : Promise.resolve(null)), [debounced]);
  const items = data?.items || [];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-8">
      <h1 className="sr-only">Search</h1>
      <div className="relative mx-auto mb-12 max-w-2xl">
        <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" aria-hidden />
        <input
          autoFocus
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search movies"
          placeholder="Search for a film"
          className="h-14 w-full rounded-full border border-white/10 bg-white/[0.06] pl-14 pr-6 text-lg placeholder:text-faint focus:border-gold focus:outline-none focus:ring-4 focus:ring-gold/15"
        />
      </div>

      {!debounced.trim() ? (
        <>
          <SectionHeader title="Trending this week" />
          <MovieGrid items={trending.slice(0, 12)} loading={trendingLoading} />
        </>
      ) : !loading && items.length === 0 ? (
        <EmptyState icon={SearchX} title={`No films found for “${debounced}”`}>
          Check the spelling or try the title of a different film.
        </EmptyState>
      ) : (
        <>
          <p className="num mb-6 text-sm text-mute" aria-live="polite">{loading ? 'Searching…' : `${items.length} ${items.length === 1 ? 'result' : 'results'}`}</p>
          <MovieGrid items={items} loading={loading && !items.length} skeletons={6} />
        </>
      )}
    </div>
  );
}
