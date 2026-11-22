import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/format';
import { backdropFallback, posterFallback } from '../../lib/posters';

// Image that never shows a broken icon: on error it swaps to a generated poster carrying the title.
export default function SmartImage({ src, alt = '', title, kind = 'poster', className, imgClassName, ...rest }) {
  const fallback = kind === 'backdrop' ? backdropFallback(title || alt) : posterFallback(title || alt);
  const [current, setCurrent] = useState(src || fallback);
  const [loaded, setLoaded] = useState(false);

  const ref = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    // Skip the initial run so a cached image that already fired onLoad is not hidden again.
    if (first.current) {
      first.current = false;
      if (ref.current?.complete && ref.current.naturalWidth) setLoaded(true);
      return;
    }
    setCurrent(src || fallback);
    setLoaded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div className={cn(!/\babsolute\b/.test(className || '') && 'relative', 'overflow-hidden bg-raised', className)}>
      <img
        ref={ref}
        src={current}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (current !== fallback) setCurrent(fallback);
        }}
        className={cn('h-full w-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0', imgClassName)}
        {...rest}
      />
    </div>
  );
}
