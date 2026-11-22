import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Pause, Play, Ticket } from 'lucide-react';
import SmartImage from '../ui/SmartImage';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ScoreBadge from '../ui/ScoreBadge';
import Skeleton from '../ui/Skeleton';
import TrailerModal from './TrailerModal';
import useTrailer from './useTrailer';
import { formatRuntime, releaseYear } from '../../lib/format';
import { img } from '../../lib/posters';

const INTERVAL = 5000;

export default function HeroCarousel({ slides, loading }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const trailer = useTrailer();

  const count = slides.length;
  const go = useCallback((i) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    setIndex(0);
  }, [count]);

  useEffect(() => {
    if (!count || paused || hover || reduce || trailer.open) return undefined;
    const t = setTimeout(() => go(index + 1), INTERVAL);
    return () => clearTimeout(t);
  }, [index, count, paused, hover, reduce, trailer.open, go]);

  if (!loading && !count) return <div className="h-16" aria-hidden />;

  if (loading || !count) {
    return (
      <section className="relative h-[78vh] min-h-[520px] w-full overflow-hidden bg-raised" aria-busy="true">
        <div className="mx-auto flex h-full max-w-[1400px] flex-col justify-end gap-4 px-4 pb-24 sm:px-8">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-16 w-full max-w-xl" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <Skeleton className="h-12 w-56" />
        </div>
      </section>
    );
  }

  const { movie, badges } = slides[index];
  const bookable = Boolean(movie.localId);

  return (
    <section
      className="relative h-[84vh] min-h-[560px] max-h-[880px] w-full overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Box office hits"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={movie.id}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 1.1, ease: 'easeOut' }}
        >
          <SmartImage src={img(movie.backdrop, 'w1280')} kind="backdrop" title={movie.title} className="h-full w-full" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/65 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-black/40" />

      <motion.div
        className="relative mx-auto flex h-full max-w-[1400px] flex-col justify-end px-4 pb-28 sm:px-8 md:pb-24"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragEnd={(_, info) => {
          if (info.offset.x < -70) go(index + 1);
          if (info.offset.x > 70) go(index - 1);
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45 }}
            className="max-w-2xl"
            aria-live={paused ? 'polite' : 'off'}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {badges.map((b) => (
                <Badge key={b.label} tone={b.tone}>{b.label}</Badge>
              ))}
              <ScoreBadge value={movie.rating} className="ml-1" />
            </div>
            <h1 className="text-balance text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">{movie.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-mute">
              {releaseYear(movie.releaseDate) && <span className="num">{releaseYear(movie.releaseDate)}</span>}
              {movie.runtime > 0 && <span className="num">{formatRuntime(movie.runtime)}</span>}
              {movie.genres.length > 0 && <span>{movie.genres.slice(0, 3).join(', ')}</span>}
            </div>
            <p className="mt-4 line-clamp-3 max-w-xl text-[15px] leading-relaxed text-zinc-300">{movie.overview}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button to={`/movies/${movie.id}#showtimes`} size="lg">
                <Ticket className="h-5 w-5" aria-hidden />
                {bookable ? 'Book tickets' : 'See details'}
              </Button>
              {(movie.tmdbId || movie.trailerKey) && (
                <Button variant="secondary" size="lg" onClick={() => trailer.play(movie)}>
                  <Play className="h-5 w-5 fill-current" aria-hidden /> Watch trailer
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="absolute inset-x-0 bottom-8 md:bottom-9">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 sm:px-8">
          <div className="flex flex-1 gap-2" role="tablist" aria-label="Choose a film">
            {slides.map((s, i) => (
              <button
                key={s.movie.id}
                role="tab"
                aria-selected={i === index}
                aria-label={s.movie.title}
                onClick={() => go(i)}
                className="group/seg flex-1 text-left"
              >
                <span className="relative block h-1 overflow-hidden rounded-full bg-white/20">
                  <span
                    key={`${i === index}-${index}-${paused}`}
                    className="absolute inset-y-0 left-0 rounded-full bg-white"
                    style={{
                      width: i < index ? '100%' : i === index ? undefined : '0%',
                      ...(i === index && !reduce && !paused && !hover
                        ? { animation: `heroFill ${INTERVAL}ms linear forwards` }
                        : i === index
                          ? { width: '100%' }
                          : {}),
                    }}
                  />
                </span>
                <span className={`mt-2 hidden truncate text-xs font-semibold transition md:block ${i === index ? 'text-ink' : 'text-faint group-hover/seg:text-mute'}`}>{s.movie.title}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Resume auto-advance' : 'Pause auto-advance'}
            className="glass grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink transition hover:bg-white/15"
          >
            {paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
          </button>
        </div>
      </div>
      <style>{`@keyframes heroFill{from{width:0}to{width:100%}}`}</style>
      <TrailerModal open={trailer.open} onClose={trailer.close} trailerKey={trailer.key} title={trailer.movie?.title} loading={trailer.loading} />
    </section>
  );
}
