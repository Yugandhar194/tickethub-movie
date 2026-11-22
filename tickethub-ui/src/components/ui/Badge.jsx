import { cn } from '../../lib/format';

const tones = {
  neutral: 'bg-white/10 text-ink',
  crimson: 'bg-crimson text-white',
  amber: 'bg-gold/15 text-gold-soft border border-gold/30',
  green: 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30',
  muted: 'bg-white/[0.06] text-mute border border-white/10',
  danger: 'bg-crimson/15 text-crimson-soft border border-crimson/30',
};

export default function Badge({ tone = 'neutral', className, children, ...rest }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none', tones[tone], className)}
      {...rest}
    >
      {children}
    </span>
  );
}
