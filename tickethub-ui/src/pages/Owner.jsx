import { useMemo, useState } from 'react';
import { Building2, LayoutDashboard, Ticket } from 'lucide-react';
import { fetchAllBookings, fetchOwner } from '../api/backend';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { addDays, formatDate, formatINR, formatTime, toISODate } from '../lib/format';
import { BarChart, DashShell, DataTable, StatCard } from '../components/dashboard/parts';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'theaters', label: 'My theaters', icon: Building2 },
  { id: 'bookings', label: 'Bookings', icon: Ticket },
];

export default function Owner() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const owner = useAsync(() => fetchOwner(user.id), [user.id]);
  const all = useAsync(() => fetchAllBookings().catch(() => []), []);

  const theaters = owner.data?.theaters || [];
  const ids = useMemo(() => new Set(theaters.map((t) => t.id)), [theaters]);
  const mine = useMemo(() => (all.data || []).filter((b) => ids.has(b.showtime?.theater?.id)), [all.data, ids]);

  const stats = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => toISODate(addDays(new Date(), i - 6)));
    return {
      seats: mine.reduce((s, b) => s + (b.noOfSeat || 0), 0),
      revenue: mine.reduce((s, b) => s + (b.showtime?.amount || 0) * (b.noOfSeat || 0), 0),
      perDay: days.map((d) => ({ label: formatDate(d, { weekday: 'short' }), value: mine.filter((b) => b.bookingDate === d).reduce((s, b) => s + (b.noOfSeat || 0), 0) })),
    };
  }, [mine]);

  return (
    <DashShell title="Theater owner" subtitle={`Signed in as ${user.name}.`} tabs={TABS} tab={tab} setTab={setTab}>
      {tab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            <StatCard label="Theaters" value={theaters.length} />
            <StatCard label="Seats sold" value={stats.seats} />
            <StatCard label="Ticket revenue" value={formatINR(stats.revenue)} hint="Seats x show price, before food" />
          </div>
          <section className="rounded-panel border hairline bg-white/[0.03] p-6">
            <h2 className="mb-5 font-extrabold">Seats booked, last 7 days</h2>
            <BarChart data={stats.perDay} label="Seats booked per day" />
          </section>
        </div>
      )}
      {tab === 'theaters' && (
        <DataTable loading={owner.loading} empty="No theaters are linked to your account yet." columns={[
          { key: 'name', label: 'Theater', className: 'font-semibold' }, { key: 'location', label: 'Location' },
          { key: 'seats', label: 'Seats sold', className: 'num', render: (t) => mine.filter((b) => b.showtime?.theater?.id === t.id).reduce((s, b) => s + (b.noOfSeat || 0), 0) },
        ]} rows={theaters} />
      )}
      {tab === 'bookings' && (
        <DataTable loading={all.loading} empty="No bookings for your theaters yet." columns={[
          { key: 'u', label: 'Customer', className: 'font-semibold', render: (r) => r.user?.name },
          { key: 'm', label: 'Movie', render: (r) => r.showtime?.movie?.title },
          { key: 't', label: 'Theater', render: (r) => r.showtime?.theater?.name },
          { key: 's', label: 'Show', className: 'num', render: (r) => `${formatDate(r.showtime?.date, { day: 'numeric', month: 'short' })}, ${formatTime(r.showtime?.time)}` },
          { key: 'noOfSeat', label: 'Seats', className: 'num' },
        ]} rows={mine} />
      )}
    </DashShell>
  );
}
