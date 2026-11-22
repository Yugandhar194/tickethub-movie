import { Star } from 'lucide-react';
import { cn } from '../../lib/format';

export default function ScoreBadge({ value, className }) {
  const n = Number(value);
  if (!n) return null;
  return (
    <span className={cn('num inline-flex items-center gap-1 text-sm font-bold text-gold', className)}>
      <Star className="h-3.5 w-3.5 fill-gold" aria-hidden />
      {n.toFixed(1)}
      <span className="sr-only">out of 10</span>
    </span>
  );
}
