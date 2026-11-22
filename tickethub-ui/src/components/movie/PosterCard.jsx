import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SmartImage from '../ui/SmartImage';
import Badge from '../ui/Badge';
import ScoreBadge from '../ui/ScoreBadge';
import { formatDate, releaseYear } from '../../lib/format';
import { img } from '../../lib/posters';

export default function PosterCard({ movie, badge, badgeTone = 'crimson', rank, className }) {
  const upcoming = movie.releaseDate && movie.releaseDate > new Date().toISOString().slice(0, 10);
  return (
    <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }} className={className}>
      <Link to={`/movies/${movie.id}`} className="group block" aria-label={`${movie.title}, ${releaseYear(movie.releaseDate)}`}>
        <div className="relative overflow-hidden rounded-poster shadow-lift ring-1 ring-white/10 transition duration-300 group-hover:ring-white/30">
          <SmartImage src={img(movie.poster, 'w500')} alt="" title={movie.title} className="aspect-[2/3] w-full" imgClassName="transition duration-500 group-hover:scale-[1.04]" />
          {(badge || rank) && (
            <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
              {rank && <span className="num grid h-7 min-w-7 place-items-center rounded-lg bg-black/70 px-1.5 text-sm font-extrabold backdrop-blur">{rank}</span>}
              {badge && <Badge tone={badgeTone}>{badge}</Badge>}
            </div>
          )}
          {movie.localId && !upcoming && (
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur">
              Book now
            </span>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="mt-3 px-0.5">
          <h3 className="line-clamp-1 text-[15px] font-bold leading-snug">{movie.title}</h3>
          <div className="mt-1 flex items-center justify-between gap-2 text-sm text-mute">
            <span className="num truncate">{upcoming ? `Opens ${formatDate(movie.releaseDate, { day: 'numeric', month: 'short' })}` : formatDate(movie.releaseDate, { month: 'short', year: 'numeric' })}</span>
            <ScoreBadge value={movie.rating} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
