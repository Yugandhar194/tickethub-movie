import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PosterSkeleton } from '../ui/Skeleton';

export default function PosterRow({ items, loading, render, skeletons = 8 }) {
  const track = useRef(null);
  const scroll = (dir) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.85, behavior: 'smooth' });
  const cell = 'w-[42vw] shrink-0 snap-start sm:w-[28vw] md:w-[21vw] lg:w-[16vw] xl:w-[14.2vw] max-w-[220px]';
  return (
    <div className="group/row relative">
      <div ref={track} className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:gap-5 sm:px-8">
        {loading
          ? Array.from({ length: skeletons }, (_, i) => (
              <div key={i} className={cell}>
                <PosterSkeleton />
              </div>
            ))
          : items.map((m, i) => (
              <div key={m.id} className={cell}>
                {render(m, i)}
              </div>
            ))}
      </div>
      {!loading && items.length > 5 && (
        <>
          <button onClick={() => scroll(-1)} aria-label="Scroll left" className="glass absolute -left-3 top-[34%] z-10 hidden h-11 w-11 place-items-center rounded-full opacity-0 transition hover:bg-white/10 group-hover/row:opacity-100 lg:grid">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => scroll(1)} aria-label="Scroll right" className="glass absolute -right-3 top-[34%] z-10 hidden h-11 w-11 place-items-center rounded-full opacity-0 transition hover:bg-white/10 group-hover/row:opacity-100 lg:grid">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
