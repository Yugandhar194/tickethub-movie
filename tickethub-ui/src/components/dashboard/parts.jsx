import { Search } from 'lucide-react';
import { cn } from '../../lib/format';

export function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-panel border hairline bg-white/[0.03] p-5">
      <p className="text-sm text-mute">{label}</p>
      <p className="num mt-2 text-3xl font-extrabold">{value}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}

export function BarChart({ data, format = (v) => v, label }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <figure>
      <div className="flex h-44 items-end gap-2" role="img" aria-label={label}>
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="num text-xs font-semibold text-mute">{d.value ? format(d.value) : ''}</span>
            <div className="w-full rounded-t-lg bg-gradient-to-t from-crimson to-gold/90" style={{ height: `${Math.max(d.value ? 6 : 2, (d.value / max) * 100)}%`, opacity: d.value ? 1 : 0.25 }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d) => <span key={d.label} className="num flex-1 text-center text-[11px] text-faint">{d.label}</span>)}
      </div>
    </figure>
  );
}

export function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
      <input value={value} onChange={(e) => onChange(e.target.value)} aria-label={placeholder} placeholder={placeholder} className="field h-10 pl-10" />
    </div>
  );
}

export function DataTable({ columns, rows, empty = 'Nothing to show.', loading }) {
  return (
    <div className="overflow-x-auto rounded-panel border hairline">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-white/[0.04] text-xs text-mute">
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={cn('px-4 py-3 font-semibold', c.align === 'right' && 'text-right')}>{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {loading ? (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-mute">Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-mute">{empty}</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="transition hover:bg-white/[0.03]">
                {columns.map((c) => <td key={c.key} className={cn('px-4 py-3.5', c.align === 'right' && 'text-right', c.className)}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function DashShell({ title, subtitle, tabs, tab, setTab, children }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <p className="mt-1 text-mute">{subtitle}</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label={`${title} sections`} className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} className={cn('flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition', tab === id ? 'bg-white/10 text-ink' : 'text-mute hover:bg-white/[0.05] hover:text-ink')}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
