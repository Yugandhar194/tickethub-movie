import { useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import SectionHeader from '../components/ui/SectionHeader';
import EmptyState from '../components/ui/EmptyState';
import HeroCarousel from '../components/movie/HeroCarousel';
import BoxOfficeTicker from '../components/movie/BoxOfficeTicker';
import FilterBar, { applyFilters, DEFAULT_FILTERS } from '../components/movie/FilterBar';
import MovieGrid from '../components/movie/MovieGrid';
import PosterRow from '../components/movie/PosterRow';
import PosterCard from '../components/movie/PosterCard';
import SourceNotice from '../components/movie/SourceNotice';
import useCatalog from '../hooks/useCatalog';
import { Film } from 'lucide-react';

const year = new Date().getFullYear();

export default function Home() {
  const { now, trending, upcoming, pool, box, loading, source, refreshBox } = useCatalog();
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, when: 'any' });

  const slides = useMemo(() => {
    if (!box) return [];
    const trendIds = new Set(trending.map((m) => m.id));
    const withArt = box.items.filter((m) => m.backdrop);
    // Films without a backdrop still get a slide (a generated frame stands in for the image).
    return (withArt.length >= 3 ? withArt : box.items)
      .slice(0, 5)
      .map((movie, i) => ({
        movie,
        badges: [
          box.ranked ? { label: `#${i + 1} Box Office`, tone: 'crimson' } : { label: 'Now playing', tone: 'muted' },
          trendIds.has(movie.id) && { label: `Trending ${year}`, tone: 'amber' },
          movie.source === 'demo' && { label: 'Sample', tone: 'muted' },
        ].filter(Boolean),
      }));
  }, [box, trending]);

  const genres = useMemo(() => [...new Set(pool.flatMap((m) => m.genres))].sort(), [pool]);
  const languages = useMemo(() => [...new Set(pool.map((m) => m.language).filter(Boolean))].sort(), [pool]);
  const filtered = useMemo(() => applyFilters(pool.filter((m) => m.releaseDate <= new Date().toISOString().slice(0, 10) || filters.when === 'upcoming' || filters.when === 'any'), filters), [pool, filters]);
  const shown = filtered.slice(0, 12);

  return (
    <>
      <HeroCarousel slides={slides} loading={loading || !box} />
      <BoxOfficeTicker data={box} loading={loading || !box} onRefresh={refreshBox} />

      <div className="mx-auto max-w-[1400px] px-4 pt-12 sm:px-8">
        <SourceNotice source={source} />

        <section aria-labelledby="find-title" className="scroll-mt-24">
          <SectionHeader title="Find a film" subtitle="Filter what is playing and what is coming." to="/movies" linkLabel="Browse everything" />
          <h2 id="find-title" className="sr-only">Find a film</h2>
          <FilterBar filters={filters} setFilters={setFilters} genres={genres} languages={languages} total={filtered.length} />
          {!loading && shown.length === 0 ? (
            <EmptyState icon={Film} title="Nothing matches those filters" action={<Button variant="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>Clear filters</Button>}>
              Try a different genre or release window.
            </EmptyState>
          ) : (
            <MovieGrid items={shown} loading={loading} />
          )}
        </section>

        <section className="mt-20">
          <SectionHeader title={`Trending ${year}`} subtitle="What people are opening this week." to="/movies?sort=popular" />
          <PosterRow
            items={trending.slice(0, 14)}
            loading={loading}
            render={(m, i) => <PosterCard movie={m} rank={i + 1} />}
          />
        </section>

        {(loading || upcoming.length > 0) && (
          <section className="mt-20">
            <SectionHeader title="Coming soon" subtitle="Add the date to your calendar." to="/movies?when=upcoming" />
            <PosterRow items={upcoming.slice(0, 14)} loading={loading} render={(m) => <PosterCard movie={m} />} />
          </section>
        )}
      </div>
    </>
  );
}
