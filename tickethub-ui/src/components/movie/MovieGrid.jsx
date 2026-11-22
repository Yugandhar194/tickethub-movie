import { PosterSkeleton } from '../ui/Skeleton';
import PosterCard from './PosterCard';

export const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

export default function MovieGrid({ items, loading, skeletons = 12 }) {
  return (
    <div className={gridClass}>
      {loading
        ? Array.from({ length: skeletons }, (_, i) => <PosterSkeleton key={i} />)
        : items.map((m) => <PosterCard key={m.id} movie={m} />)}
    </div>
  );
}
