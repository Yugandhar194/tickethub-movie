import { useCallback, useState } from 'react';
import { getTrailerKey } from '../../api/catalog';

export default function useTrailer() {
  const [state, setState] = useState({ open: false, movie: null, key: '', loading: false });
  const play = useCallback(async (movie) => {
    setState({ open: true, movie, key: movie.trailerKey || '', loading: !movie.trailerKey });
    if (!movie.trailerKey) {
      const key = await getTrailerKey(movie);
      setState((s) => (s.movie?.id === movie.id ? { ...s, key, loading: false } : s));
    }
  }, []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);
  return { ...state, play, close };
}
