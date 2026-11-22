import { cn } from '../../lib/format';

export default function Skeleton({ className, ...rest }) {
  return <div aria-hidden className={cn('skeleton rounded-lg', className)} {...rest} />;
}

export function PosterSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="aspect-[2/3] w-full rounded-poster" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
    </div>
  );
}
