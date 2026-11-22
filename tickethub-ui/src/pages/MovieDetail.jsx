import { useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Play, Ticket, TriangleAlert } from 'lucide-react';
import { getMovie, getOmdb, getSimilar } from '../api/catalog';
import { useAsync } from '../hooks/useAsync';
import SmartImage from '../components/ui/SmartImage';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import SectionHeader from '../components/ui/SectionHeader';
import ScoreRing from '../components/movie/ScoreRing';
import CastCarousel from '../components/movie/CastCarousel';
import TrailerModal from '../components/movie/TrailerModal';
import useTrailer from '../components/movie/useTrailer';
import PosterRow from '../components/movie/PosterRow';
import PosterCard from '../components/movie/PosterCard';
import ShowtimePicker, { useShowtimes } from '../components/movie/ShowtimePicker';
import { formatDate, formatINR, formatRuntime, formatUSD, formatUSDCompact, releaseYear } from '../lib/format';
import { img } from '../lib/posters';

const langName = (code) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code;
  } catch {
    return code;
  }
};

function Fact({ label, children }) {
  if (!children || children === '—') return null;
  return (
    <div>
      <dt className="text-xs text-mute">{label}</dt>
      <dd className="num mt-1 font-semibold">{children}</dd>
    </div>
  );
}

export default function MovieDetail() {
  const { id } = useParams();
  const { hash } = useLocation();
  const trailer = useTrailer();
  const { data: movie, loading, error } = useAsync(() => getMovie(id), [id]);
  const omdb = useAsync(() => (movie ? getOmdb(movie.imdbId) : null), [movie?.imdbId]);
  const similar = useAsync(() => (movie ? getSimilar(movie) : []), [movie?.id]);
  const showtimes = useShowtimes(movie);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (hash === '#showtimes' && movie && !showtimes.loading) {
      document.getElementById('showtimes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hash, movie, showtimes.loading]);

  const minPrice = useMemo(() => {
    const prices = (showtimes.data?.shows || []).map((s) => Number(s.amount)).filter(Boolean);
    return prices.length ? Math.min(...prices) : 0;
  }, [showtimes.data]);

  if (error) {
    return (
      <div className="pt-24">
        <EmptyState icon={TriangleAlert} title="We could not find that film" action={<Button to="/movies" variant="secondary">Browse movies</Button>}>
          It may have been removed, or the link is out of date.
        </EmptyState>
      </div>
    );
  }

  if (loading || !movie) {
    return (
      <div>
        <Skeleton className="h-[60vh] w-full rounded-none" />
        <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-10 sm:px-8">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-24 w-full max-w-2xl" />
        </div>
      </div>
    );
  }

  const roi = movie.budget > 0 && movie.revenue > 0 ? movie.revenue / movie.budget : 0;
  const upcoming = movie.releaseDate > new Date().toISOString().slice(0, 10);
  const scoreSub = movie.votes ? `${movie.votes.toLocaleString('en-IN')} votes` : '';

  return (
    <article>
      <header className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <SmartImage src={img(movie.backdrop, 'w1280')} kind="backdrop" title={movie.title} className="h-full w-full" imgClassName="scale-110 blur-[6px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-obsidian/75 to-obsidian" />
        </div>
        <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-4 pb-12 pt-28 sm:px-8 md:flex-row md:items-end md:pt-36">
          <SmartImage src={img(movie.poster, 'w500')} title={movie.title} alt={`${movie.title} poster`} className="aspect-[2/3] w-40 shrink-0 rounded-poster shadow-lift ring-1 ring-white/15 sm:w-56" />
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap gap-2">
              {movie.source === 'demo' && <Badge tone="muted">Sample film</Badge>}
              {upcoming && <Badge tone="amber">Opens {formatDate(movie.releaseDate)}</Badge>}
              {movie.status && !upcoming && <Badge tone="muted">{movie.status}</Badge>}
            </div>
            <h1 className="text-balance text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">{movie.title}</h1>
            {movie.tagline && <p className="mt-2 text-lg italic text-mute">{movie.tagline}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-mute">
              {releaseYear(movie.releaseDate) && <span className="num">{releaseYear(movie.releaseDate)}</span>}
              {movie.runtime > 0 && <span className="num">{formatRuntime(movie.runtime)}</span>}
              {movie.language && <span>{langName(movie.language)}</span>}
            </div>
            {movie.genres.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {movie.genres.map((g) => <li key={g} className="rounded-full border hairline bg-white/[0.05] px-3 py-1 text-sm">{g}</li>)}
              </ul>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
              {movie.rating > 0 && <ScoreRing value={movie.rating * 10} label="Audience score" sub={scoreSub} />}
              {omdb.data?.rottenTomatoes && <ScoreRing value={parseInt(omdb.data.rottenTomatoes, 10)} label="Rotten Tomatoes" />}
              {omdb.data?.imdb && <ScoreRing value={Number(omdb.data.imdb) * 10} label="IMDb" sub={`${omdb.data.imdb} / 10`} />}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" href="#showtimes" onClick={(e) => { e.preventDefault(); document.getElementById('showtimes')?.scrollIntoView({ behavior: 'smooth' }); }}>
                <Ticket className="h-5 w-5" aria-hidden /> Book tickets
              </Button>
              {(movie.trailerKey || movie.tmdbId) && (
                <Button size="lg" variant="secondary" onClick={() => trailer.play(movie)}>
                  <Play className="h-5 w-5 fill-current" aria-hidden /> Watch trailer
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] space-y-16 px-4 pb-16 pt-6 sm:px-8">
        <section id="showtimes" className="scroll-mt-24" aria-labelledby="st-title">
          <SectionHeader title="Showtimes" subtitle="Pick a day, then a time. Colours show how full each show is." />
          <h2 id="st-title" className="sr-only">Showtimes</h2>
          <ShowtimePicker movie={movie} state={showtimes} />
        </section>

        <section className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <h2 className="mb-3 text-xl font-extrabold">Story</h2>
            <p className="max-w-[68ch] leading-relaxed text-zinc-300">{movie.overview || 'No synopsis is available yet.'}</p>
            {(movie.director || movie.writer) && (
              <dl className="mt-6 grid max-w-md grid-cols-2 gap-6">
                <Fact label="Director">{movie.director}</Fact>
                <Fact label="Writer">{movie.writer}</Fact>
              </dl>
            )}
          </div>
          <aside aria-label="Box office performance" className="glass rounded-panel p-6">
            <h2 className="text-lg font-extrabold">Box office performance</h2>
            {movie.revenue > 0 ? (
              <>
                <p className="num mt-4 text-4xl font-extrabold text-gold">{formatUSDCompact(movie.revenue)}</p>
                <p className="text-sm text-mute">Worldwide gross to date</p>
                {movie.budget > 0 && (
                  <div className="mt-5">
                    <div className="flex h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
                      <div className="bg-white/40" style={{ width: `${Math.min(100, (movie.budget / Math.max(movie.revenue, movie.budget)) * 100)}%` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-mute">
                      <span className="num">Budget {formatUSD(movie.budget)}</span>
                      {roi > 0 && <span className="num font-semibold text-ink">{roi.toFixed(1)}x return</span>}
                    </div>
                  </div>
                )}
                {omdb.data?.domestic && <p className="num mt-4 text-sm text-mute">US domestic: {omdb.data.domestic}</p>}
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-mute">{upcoming ? 'This film has not opened yet.' : 'No gross has been reported for this film so far.'}</p>
            )}
            <p className="mt-5 border-t hairline pt-4 text-xs text-faint">Figures come from TMDB and can trail trade reports.</p>
          </aside>
        </section>

        {movie.cast?.length > 0 && (
          <section>
            <SectionHeader title="Cast" />
            <CastCarousel cast={movie.cast} />
          </section>
        )}

        {(similar.loading || similar.data?.length > 0) && (
          <section>
            <SectionHeader title="You might also like" />
            <PosterRow items={similar.data || []} loading={similar.loading} render={(m) => <PosterCard movie={m} />} />
          </section>
        )}
      </div>

      {movie.localId && !upcoming && (
        <div className="glass no-print fixed inset-x-0 bottom-[calc(3.8rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-4 border-x-0 px-4 py-2.5 md:hidden">
          <div>
            <p className="text-xs text-mute">Tickets from</p>
            <p className="num text-lg font-extrabold">{minPrice ? formatINR(minPrice) : 'Open'}</p>
          </div>
          <Button onClick={() => document.getElementById('showtimes')?.scrollIntoView({ behavior: 'smooth' })} className="flex-1 max-w-[220px]">Book tickets</Button>
        </div>
      )}
      <TrailerModal open={trailer.open} onClose={trailer.close} trailerKey={trailer.key} title={trailer.movie?.title} loading={trailer.loading} />
    </article>
  );
}
