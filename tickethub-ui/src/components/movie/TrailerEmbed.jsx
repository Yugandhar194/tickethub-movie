import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import SmartImage from '../ui/SmartImage';
import { img } from '../../lib/posters';

// The player only loads after a click, so the page does not pull in YouTube until the viewer asks for it.
export default function TrailerEmbed({ trailerKey, title, backdrop, paused = false }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (paused) setPlaying(false);
  }, [paused]);

  if (!trailerKey) return null;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-panel bg-black ring-1 ring-white/10">
      {playing && !paused ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={`${title} trailer`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button onClick={() => setPlaying(true)} className="group absolute inset-0 block w-full" aria-label={`Play the ${title} trailer`}>
          <SmartImage src={img(backdrop, 'w780') || `https://img.youtube.com/vi/${trailerKey}/hqdefault.jpg`} kind="backdrop" title={title} className="absolute inset-0 h-full w-full" imgClassName="opacity-80 transition duration-500 group-hover:scale-[1.03]" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-crimson shadow-crimson transition group-hover:scale-110">
            <Play className="ml-1 h-8 w-8 fill-white" aria-hidden />
          </span>
        </button>
      )}
    </div>
  );
}
