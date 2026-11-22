import { motion } from 'framer-motion';
import { AISLE_AFTER, COLS, ROW_LABELS, TIERS, tierForRow } from '../../config/seatTiers';
import { cn, formatCurrency } from '../../lib/format';
import { seatPrice } from '../../lib/pricing';

const tierLook = {
  classic: 'bg-white/[0.09] border-white/15 text-zinc-300 hover:bg-white/20',
  executive: 'bg-white/[0.16] border-white/25 text-zinc-100 hover:bg-white/30',
  recliner: 'bg-gold/15 border-gold/45 text-gold-soft hover:bg-gold/30',
};

function Seat({ id, tier, state, selected, price, offset, onToggle, currency }) {
  const occupied = state === 'occupied';
  const held = state === 'held';
  const unavailable = occupied || held;
  return (
    <motion.button
      type="button"
      disabled={unavailable}
      aria-pressed={selected}
      aria-label={`Seat ${id}, ${tier.name}, ${formatCurrency(price, currency)}, ${selected ? 'selected' : unavailable ? (held ? 'held by another customer' : 'taken') : 'available'}`}
      onClick={() => onToggle(id)}
      whileTap={unavailable ? undefined : { scale: 0.88 }}
      animate={{ scale: selected ? 1.12 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      style={{ width: 'var(--seat)', height: 'var(--seat)', transform: `translateY(${offset}px)` }}
      className={cn(
        'num grid shrink-0 place-items-center border text-[clamp(7px,1.9vw,11px)] font-bold transition-colors',
        tier.id === 'recliner' ? 'rounded-xl' : 'rounded-t-xl rounded-b-md',
        selected && 'border-crimson bg-crimson text-white shadow-crimson',
        !selected && !unavailable && tierLook[tier.id],
        occupied && 'cursor-not-allowed border-white/5 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.05)_0_3px,transparent_3px_6px)] text-transparent',
        held && 'cursor-not-allowed border-gold/50 border-dashed bg-transparent text-gold/70'
      )}
    >
      {selected || held ? id : <span className="opacity-70">{id.slice(1)}</span>}
    </motion.button>
  );
}

function cinemaSeatTier(type, row) {
  const value = String(type || '').toLowerCase();
  if (value.includes('reclin')) return { id: 'recliner', name: 'Recliner', rows: [row], multiplier: 1 };
  if (value.includes('vip') || value.includes('executive') || value.includes('premium')) {
    return { id: 'executive', name: 'VIP', rows: [row], multiplier: 1 };
  }
  return { id: 'classic', name: 'Standard', rows: [row], multiplier: 1 };
}

export default function SeatMap({ seatStates, selected, onToggle, basePrice, seatMap, currency = 'INR' }) {
  const rows = seatMap?.rows?.length
    ? seatMap.rows
    : ROW_LABELS.map((row) => ({ row, seats: Array.from({ length: COLS }, (_, i) => ({ number: i + 1, type: tierForRow(row).id })) }));
  const maxColumns = Math.max(1, ...rows.map((row) => row.seats?.length || 0));
  return (
    <div className="overflow-x-auto pb-2">
      <div className="mx-auto w-fit" style={{ '--seat': 'clamp(16px, 4.5vw, 36px)', perspective: '1100px' }}>
        <div style={{ transform: 'rotateX(12deg)', transformOrigin: '50% 0' }} className="flex flex-col gap-[clamp(5px,1.3vw,10px)]">
          {rows.map((row, rowIndex) => {
            return (
              <div key={`${row.row}-${rowIndex}`} className="relative flex items-center justify-center gap-[clamp(2px,0.5vw,6px)]">
                <span className="absolute -left-6 w-4 text-center text-xs font-bold text-faint" aria-hidden>{row.row}</span>
                {(row.seats || []).map((seat, colIndex) => {
                  const id = `${row.row}${seat.number}`;
                  const tier = cinemaSeatTier(seat.type, row.row);
                  const d = colIndex - (maxColumns - 1) / 2;
                  return (
                    <div key={id} className="flex items-center" style={{ marginRight: seat.number === AISLE_AFTER ? 'clamp(10px,3vw,26px)' : 0 }}>
                      <Seat
                        id={id}
                        tier={tier}
                        state={seatStates[id] || 'available'}
                        selected={selected.includes(id)}
                        price={seatPrice(basePrice, id)}
                        offset={-(d * d) * 0.32}
                        onToggle={onToggle}
                        currency={currency}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SeatLegend({ basePrice, showHeld, seatMap, currency = 'INR' }) {
  const dot = 'inline-block h-4 w-4 rounded-t-md rounded-b-[3px] border';
  const tiers = seatMap?.rows?.length
    ? [...new Set(seatMap.rows.flatMap((row) => (row.seats || []).map((seat) => String(seat.type || '').toLowerCase())))].map((type) => cinemaSeatTier(type, ''))
    : TIERS;
  const distinctPrices = new Set(tiers.map((t) => t.multiplier)).size > 1;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-mute">
      <span className="inline-flex items-center gap-2"><i className={cn(dot, 'border-white/25 bg-white/15')} />Available</span>
      <span className="inline-flex items-center gap-2"><i className={cn(dot, 'border-crimson bg-crimson')} />Selected</span>
      <span className="inline-flex items-center gap-2"><i className={cn(dot, 'border-white/5 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.12)_0_2px,transparent_2px_4px)]')} />Occupied</span>
      {showHeld && <span className="inline-flex items-center gap-2"><i className={cn(dot, 'border-dashed border-gold/60')} />Locked</span>}
      <span className="hidden h-4 w-px bg-white/10 sm:block" />
      {tiers.filter((tier, i) => tiers.findIndex((other) => other.id === tier.id) === i).map((t) => (
        <span key={t.id} className="inline-flex items-center gap-2">
          <i className={cn(dot, t.id === 'recliner' ? 'border-gold/45 bg-gold/20' : t.id === 'executive' ? 'border-white/25 bg-white/25' : 'border-white/15 bg-white/10')} />
          {t.name}
          {distinctPrices && <span className="num text-faint">{formatCurrency(seatPrice(basePrice, `${t.rows[0]}1`), currency)}</span>}
        </span>
      ))}
    </div>
  );
}
