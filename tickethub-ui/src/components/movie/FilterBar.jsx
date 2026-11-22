import { Children, useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../../lib/format';

export const DEFAULT_FILTERS = { genre: '', language: '', when: 'any', rating: 0, sort: 'popular', bookable: false };

export const WHEN_OPTIONS = [
  { value: 'any', label: 'Any release date' },
  { value: 'now', label: 'Now showing' },
  { value: 'week', label: 'Opened this week' },
  { value: 'month', label: 'Opened this month' },
  { value: 'upcoming', label: 'Coming soon' },
];
const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest first' },
  { value: 'gross', label: 'Box office' },
];

let names;
const languageName = (code) => {
  try {
    names = names || new Intl.DisplayNames(['en'], { type: 'language' });
    return names.of(code) || code;
  } catch {
    return code;
  }
};

function Select({ label, value, onChange, children, active }) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const root = useRef(null);
  const options = Children.toArray(children)
    .filter((child) => child?.props)
    .map((child) => ({ value: child.props.value, label: child.props.children }));

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const selected = options.find((option) => String(option.value) === String(value));
  const toggle = () => {
    if (!open && root.current) {
      const bounds = root.current.getBoundingClientRect();
      setAlignRight(bounds.left + 260 > window.innerWidth - 12);
      const spaceBelow = window.innerHeight - bounds.bottom;
      setOpenUp(spaceBelow < 280 && bounds.top > spaceBelow);
    }
    setOpen((current) => !current);
  };

  return (
    <div ref={root} className="relative shrink-0">
      <span className="sr-only">{label}</span>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          'inline-flex h-10 max-w-[220px] cursor-pointer items-center gap-2 rounded-full border bg-white/[0.05] pl-4 pr-3 text-sm font-semibold transition hover:bg-white/[0.09] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold',
          active ? 'border-gold/60 text-gold-soft' : 'hairline text-ink'
        )}
      >
        <span className="max-w-[180px] truncate">{selected?.label || label}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-mute transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={label}
          className={cn(
            'glass absolute z-50 max-h-[60dvh] min-w-[180px] max-w-[260px] overflow-y-auto overflow-x-hidden rounded-2xl p-1.5 shadow-lift sm:max-h-80',
            openUp ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]',
            alignRight ? 'right-0' : 'left-0'
          )}
        >
          {options.map((option) => {
            const isSelected = String(option.value) === String(value);
            return (
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition',
                  isSelected ? 'bg-gold/15 text-gold-soft' : 'text-ink hover:bg-white/[0.08]'
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-gold" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FilterBar({ filters, setFilters, genres, languages, total }) {
  const set = (patch) => setFilters({ ...filters, ...patch });
  const dirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  return (
    <div className="mb-8">
      <div className="-mx-4 flex flex-wrap items-center gap-2.5 px-4 pb-1 sm:mx-0 sm:px-0">
        <Select label="Genre" value={filters.genre} onChange={(genre) => set({ genre })} active={Boolean(filters.genre)}>
          <option value="">All genres</option>
          {genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </Select>
        <Select label="Language" value={filters.language} onChange={(language) => set({ language })} active={Boolean(filters.language)}>
          <option value="">All languages</option>
          {languages.map((l) => <option key={l} value={l}>{languageName(l)}</option>)}
        </Select>
        <Select label="Release date" value={filters.when} onChange={(when) => set({ when })} active={filters.when !== 'any'}>
          {WHEN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select label="Minimum rating" value={String(filters.rating)} onChange={(v) => set({ rating: Number(v) })} active={filters.rating > 0}>
          <option value="0">Any rating</option>
          <option value="6">6.0 and up</option>
          <option value="7">7.0 and up</option>
          <option value="8">8.0 and up</option>
        </Select>
        <Select label="Sort by" value={filters.sort} onChange={(sort) => set({ sort })} active={filters.sort !== 'popular'}>
          {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <button
          onClick={() => set({ bookable: !filters.bookable })}
          aria-pressed={filters.bookable}
          className={cn(
            'h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition',
            filters.bookable ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300' : 'hairline bg-white/[0.05] text-ink hover:bg-white/[0.09]'
          )}
        >
          Booking open
        </button>
        {dirty && (
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-mute hover:text-ink">
            <X className="h-4 w-4" aria-hidden /> Clear
          </button>
        )}
      </div>
      <p className="num mt-4 text-sm text-mute" aria-live="polite">{total} {total === 1 ? 'film' : 'films'}</p>
    </div>
  );
}

export function applyFilters(list, f) {
  const today = new Date();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const ago = (n) => iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  const t = iso(today);
  let out = list.filter((m) => {
    if (f.genre && !m.genres.includes(f.genre)) return false;
    if (f.language && m.language !== f.language) return false;
    if (f.rating && m.rating < f.rating) return false;
    if (f.bookable && !m.localId) return false;
    const d = m.releaseDate || '';
    if (f.when === 'now' && !(d <= t && d >= ago(75))) return false;
    if (f.when === 'week' && !(d <= t && d >= ago(7))) return false;
    if (f.when === 'month' && !(d <= t && d >= ago(30))) return false;
    if (f.when === 'upcoming' && !(d > t)) return false;
    return true;
  });
  const by = {
    popular: (a, b) => (b.popularity || 0) - (a.popularity || 0),
    rating: (a, b) => b.rating - a.rating,
    newest: (a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''),
    gross: (a, b) => (b.revenue || 0) - (a.revenue || 0),
  }[f.sort];
  out = [...out].sort(by);
  return out;
}
