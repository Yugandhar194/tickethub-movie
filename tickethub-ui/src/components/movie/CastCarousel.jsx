import { useState } from 'react';
import { img } from '../../lib/posters';
import { initials } from '../../context/AuthContext';

function Avatar({ person }) {
  const [broken, setBroken] = useState(false);
  const src = img(person.photo, 'w185');
  return (
    <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-white/10 to-white/[0.03] ring-1 ring-white/10 sm:h-28 sm:w-28">
      {src && !broken ? (
        <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xl font-extrabold text-mute">{initials(person.name)}</span>
      )}
    </div>
  );
}

export default function CastCarousel({ cast }) {
  if (!cast?.length) return null;
  return (
    <div className="no-scrollbar -mx-4 flex gap-5 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8">
      {cast.map((p) => (
        <div key={`${p.id}-${p.name}`} className="w-24 shrink-0 text-center sm:w-28">
          <Avatar person={p} />
          <p className="mt-2.5 line-clamp-2 text-sm font-semibold leading-tight">{p.name}</p>
          {p.character && <p className="mt-0.5 line-clamp-1 text-xs text-mute">{p.character}</p>}
        </div>
      ))}
    </div>
  );
}
