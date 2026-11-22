import { useMemo, useState } from 'react';
import { Building2, Clapperboard, LayoutDashboard, RefreshCw, Ticket, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { cancelBooking, deleteOwner, deleteUser, errorMessage, fetchAllBookings, fetchAllOwners, fetchAllUsers, fetchLocalMovies, syncMoviesFromTmdb } from '../api/backend';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { addDays, formatDate, formatINR, formatTime, toISODate } from '../lib/format';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { BarChart, DashShell, DataTable, SearchBox, StatCard } from '../components/dashboard/parts';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Customers', icon: Users },
  { id: 'owners', label: 'Theater owners', icon: Building2 },
  { id: 'bookings', label: 'Bookings', icon: Ticket },
  { id: 'movies', label: 'Movie catalogue', icon: Clapperboard },
];

const safe = (fn) => fn().catch(() => []);

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const users = useAsync(() => safe(fetchAllUsers), []);
  const owners = useAsync(() => safe(fetchAllOwners), []);
  const bookings = useAsync(() => safe(fetchAllBookings), []);
  const catalogue = useAsync(async () => {
    const types = ['NowPlaying', 'Trending', 'Upcoming', 'Popular'];
    const lists = await Promise.all(types.map((t) => fetchLocalMovies(t).catch(() => [])));
    return types.map((t, i) => ({ type: t, count: lists[i].length }));
  }, []);
  const [syncing, setSyncing] = useState(false);

  const stats = useMemo(() => {
    const rows = bookings.data || [];
    const revenue = rows.reduce((s, b) => s + (b.showtime?.amount || 0) * (b.noOfSeat || 0), 0);
    const days = Array.from({ length: 7 }, (_, i) => toISODate(addDays(new Date(), i - 6)));
    const perDay = days.map((d) => ({ label: formatDate(d, { weekday: 'short' }), value: rows.filter((b) => b.bookingDate === d).reduce((s, b) => s + (b.noOfSeat || 0), 0) }));
    const byMovie = {};
    rows.forEach((b) => { const t = b.showtime?.movie?.title; if (t) byMovie[t] = (byMovie[t] || 0) + (b.noOfSeat || 0); });
    const top = Object.entries(byMovie).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { revenue, perDay, top, seats: rows.reduce((s, b) => s + (b.noOfSeat || 0), 0) };
  }, [bookings.data]);

  const match = (r, ...fields) => !q || fields.some((f) => String(f(r) ?? '').toLowerCase().includes(q.toLowerCase()));

  const run = async () => {
    setBusy(true);
    try {
      await confirm.action();
      toast.success(confirm.done);
      confirm.reload();
      setConfirm(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const ask = (title, body, action, done, reload) => setConfirm({ title, body, action, done, reload });
  const del = { className: 'text-right', align: 'right' };

  const sync = async () => {
    setSyncing(true);
    try {
      const msg = await syncMoviesFromTmdb();
      toast.success(typeof msg === 'string' ? msg : 'Movies synced.');
      catalogue.reload();
    } catch (e) {
      toast.error(errorMessage(e, 'The sync failed. Check the backend logs.'));
    } finally {
      setSyncing(false);
    }
  };

  const tabChange = (t) => { setTab(t); setQ(''); };

  return (
    <DashShell title="Admin" subtitle={`Signed in as ${user.name}.`} tabs={TABS} tab={tab} setTab={tabChange}>
      {tab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label="Customers" value={users.data?.length ?? '—'} />
            <StatCard label="Theater owners" value={owners.data?.length ?? '—'} />
            <StatCard label="Bookings" value={bookings.data?.length ?? '—'} hint={`${stats.seats} seats`} />
            <StatCard label="Ticket revenue" value={formatINR(stats.revenue)} hint="Seats x show price, before food" />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-panel border hairline bg-white/[0.03] p-6">
              <h2 className="mb-5 font-extrabold">Seats booked, last 7 days</h2>
              <BarChart data={stats.perDay} label="Seats booked per day" />
            </section>
            <section className="rounded-panel border hairline bg-white/[0.03] p-6">
              <h2 className="mb-5 font-extrabold">Top films by seats</h2>
              {stats.top.length ? (
                <ol className="space-y-3">
                  {stats.top.map(([t, n], i) => (
                    <li key={t} className="flex items-center gap-3 text-sm"><span className="num w-5 text-faint">{i + 1}</span><span className="min-w-0 flex-1 truncate font-semibold">{t}</span><span className="num text-mute">{n}</span></li>
                  ))}
                </ol>
              ) : <p className="text-sm text-mute">No bookings yet.</p>}
            </section>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <SearchBox value={q} onChange={setQ} placeholder="Search customers" />
          <DataTable loading={users.loading} empty="No customers found." columns={[
            { key: 'name', label: 'Name', className: 'font-semibold' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone', className: 'num' }, { key: 'gender', label: 'Gender' },
            { key: 'a', label: '', ...del, render: (r) => <Button size="sm" variant="danger" onClick={() => ask(`Delete ${r.name}?`, 'This removes the customer account.', () => deleteUser(r.id), 'Customer deleted.', users.reload)}>Delete</Button> },
          ]} rows={(users.data || []).filter((r) => match(r, (x) => x.name, (x) => x.email, (x) => x.phone))} />
        </div>
      )}

      {tab === 'owners' && (
        <div className="space-y-4">
          <SearchBox value={q} onChange={setQ} placeholder="Search owners" />
          <DataTable loading={owners.loading} empty="No theater owners found." columns={[
            { key: 'name', label: 'Name', className: 'font-semibold' }, { key: 'email', label: 'Email' },
            { key: 't', label: 'Theaters', render: (r) => (r.theaters || []).map((t) => t.name).join(', ') || '—' },
            { key: 'a', label: '', ...del, render: (r) => <Button size="sm" variant="danger" onClick={() => ask(`Delete ${r.name}?`, 'This removes the owner account.', () => deleteOwner(r.id), 'Owner deleted.', owners.reload)}>Delete</Button> },
          ]} rows={(owners.data || []).filter((r) => match(r, (x) => x.name, (x) => x.email))} />
        </div>
      )}

      {tab === 'bookings' && (
        <div className="space-y-4">
          <SearchBox value={q} onChange={setQ} placeholder="Search bookings" />
          <DataTable loading={bookings.loading} empty="No bookings found." columns={[
            { key: 'u', label: 'Customer', className: 'font-semibold', render: (r) => r.user?.name },
            { key: 'm', label: 'Movie', render: (r) => r.showtime?.movie?.title },
            { key: 't', label: 'Theater', render: (r) => r.showtime?.theater?.name },
            { key: 's', label: 'Show', className: 'num', render: (r) => `${formatDate(r.showtime?.date, { day: 'numeric', month: 'short' })}, ${formatTime(r.showtime?.time)}` },
            { key: 'noOfSeat', label: 'Seats', className: 'num' },
            { key: 'a', label: '', ...del, render: (r) => <Button size="sm" variant="danger" onClick={() => ask('Delete this booking?', `${r.user?.name}'s booking for ${r.showtime?.movie?.title} will be removed and its seats released.`, () => cancelBooking(r.id), 'Booking deleted.', bookings.reload)}>Delete</Button> },
          ]} rows={(bookings.data || []).filter((r) => match(r, (x) => x.user?.name, (x) => x.showtime?.movie?.title, (x) => x.showtime?.theater?.name))} />
        </div>
      )}

      {tab === 'movies' && (
        <div className="space-y-6">
          <section className="rounded-panel border hairline bg-white/[0.03] p-6">
            <h2 className="font-extrabold">Sync movies from TMDB</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">Runs the backend import, which copies movies, cast and crew from TMDB into the TicketHub database so theaters can schedule them. The backend decides which TMDB list and page it pulls; new films appear on the site once they have showtimes.</p>
            <Button className="mt-5" onClick={sync} loading={syncing}><RefreshCw className="h-4 w-4" aria-hidden />Sync now</Button>
          </section>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {(catalogue.data || []).map((c) => <StatCard key={c.type} label={c.type.replace(/([a-z])([A-Z])/g, '$1 $2')} value={c.count} hint="films in database" />)}
          </div>
        </div>
      )}

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm?.title} size="sm">
        <p className="text-sm leading-relaxed text-zinc-300">{confirm?.body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirm(null)}>Keep</Button>
          <Button loading={busy} onClick={run}>Delete</Button>
        </div>
      </Modal>
    </DashShell>
  );
}
