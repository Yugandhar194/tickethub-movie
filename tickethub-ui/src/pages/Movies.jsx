import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Film } from 'lucide-react';
import FilterBar, { applyFilters, DEFAULT_FILTERS, WHEN_OPTIONS } from '../components/movie/FilterBar';
import MovieGrid from '../components/movie/MovieGrid';
import SourceNotice from '../components/movie/SourceNotice';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import useCatalog from '../hooks/useCatalog';

const PAGE = 24;

export default function Movies() {
  const [params] = useSearchParams();
  const { pool, loading, source } = useCatalog({ withBoxOffice: false });
  const initialWhen = WHEN_OPTIONS.some((o) => o.value === params.get('when')) ? params.get('when') : 'any';
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, when: initialWhen, sort: params.get('sort') || 'popular' });
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    const when = params.get('when');
    if (when && WHEN_OPTIONS.some((o) => o.value === when)) setFilters((f) => ({ ...f, when }));
  }, [params]);

  const genres = useMemo(() => [...new Set(pool.flatMap((m) => m.genres))].sort(), [pool]);
  const languages = useMemo(() => [...new Set(pool.map((m) => m.language).filter(Boolean))].sort(), [pool]);
  const filtered = useMemo(() => applyFilters(pool, filters), [pool, filters]);

  useEffect(() => setVisible(PAGE), [filters]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-8">
      <h1 className="mb-2 text-3xl font-extrabold sm:text-4xl">Movies</h1>
      <p className="mb-8 max-w-xl text-mute">Everything in cinemas now and what opens next.</p>
      <SourceNotice source={source} />
      <FilterBar filters={filters} setFilters={setFilters} genres={genres} languages={languages} total={filtered.length} />
      {!loading && filtered.length === 0 ? (
        <EmptyState icon={Film} title="No films match" action={<Button variant="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</Button>}>
          Loosen a filter or two to see more.
        </EmptyState>
      ) : (
        <MovieGrid items={filtered.slice(0, visible)} loading={loading} />
      )}
      {!loading && filtered.length > visible && (
        <div className="mt-12 flex justify-center">
          <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE)}>Show more films</Button>
        </div>
      )}
    </div>
  );
}
