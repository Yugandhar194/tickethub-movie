import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { homeFor, useAuth } from '../../context/AuthContext';
import { fetchLocalMovie } from '../../api/backend';
import Skeleton from '../ui/Skeleton';

export function RequireAuth({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search, reason: 'Sign in to continue.' }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return children;
}

// Old URLs (/ticket/12, /payment/12, ...) keep working by redirecting to the new routes.
export function Redirect({ to }) {
  const params = useParams();
  const { search } = useLocation();
  const target = typeof to === 'function' ? to(params) : to;
  return <Navigate to={`${target}${search}`} replace />;
}

// The old /movie_details/:id and /show_time/:id used the database id; the new routes key on the TMDB id.
export function LegacyMovieRedirect({ hash = '' }) {
  const { id } = useParams();
  const [target, setTarget] = useState(null);
  useEffect(() => {
    let live = true;
    fetchLocalMovie(id)
      .then((m) => live && setTarget(`/movies/${m?.movieId ? m.movieId : `l${id}`}${hash}`))
      .catch(() => live && setTarget('/movies'));
    return () => {
      live = false;
    };
  }, [id, hash]);
  if (target) return <Navigate to={target} replace />;
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8">
      <Skeleton className="h-8 w-48" />
    </div>
  );
}
