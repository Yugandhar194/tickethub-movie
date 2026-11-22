import { useParams, useLocation } from 'react-router-dom';
import { CheckCircle2, Download, Printer, TriangleAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import { downloadTicketPdf, fetchBooking } from '../api/backend';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { loadBookingMeta } from '../lib/bookingStore';
import { bookingCode } from '../lib/format';
import TicketPass from '../components/movie/TicketPass';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useState } from 'react';

export async function saveTicketPdf(id) {
  const blob = await downloadTicketPdf(id);
  const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `ticket_${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Ticket() {
  const { bookingId } = useParams();
  const { state } = useLocation();
  const { user } = useAuth();
  const { data: booking, loading, error } = useAsync(() => fetchBooking(bookingId), [bookingId]);
  const [busy, setBusy] = useState(false);
  const seats = loadBookingMeta(bookingId)?.seats || [];

  const download = async () => {
    setBusy(true);
    try {
      await saveTicketPdf(bookingId);
    } catch {
      toast.error('We could not download the PDF. Try Print instead, or try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-md px-4 py-12"><Skeleton className="h-[560px] w-full rounded-[28px]" /></div>;
  if (error || !booking) {
    return <EmptyState icon={TriangleAlert} title="We could not find this ticket" className="pt-28" action={<Button to="/my-bookings" variant="secondary">My bookings</Button>}>Check the link, or open the ticket from My bookings.</EmptyState>;
  }
  if (booking.user?.id && user?.id && booking.user.id !== user.id) {
    return <EmptyState icon={TriangleAlert} title="This ticket belongs to another account" className="pt-28" action={<Button to="/">Go home</Button>}>Sign in with the account that made the booking.</EmptyState>;
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-10">
      {state?.paid && (
        <div role="status" className="no-print mb-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" aria-hidden />
          <h1 className="mt-4 text-2xl font-extrabold">You are going</h1>
          <p className="mt-1 text-mute">Payment received for booking <span className="num font-semibold text-ink">{bookingCode(booking.id)}</span>.</p>
        </div>
      )}
      {!state?.paid && <h1 className="no-print mb-8 text-center text-2xl font-extrabold">Your ticket</h1>}
      <TicketPass booking={booking} seats={seats} />
      <div className="no-print mt-8 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={download} loading={busy}><Download className="h-4 w-4" aria-hidden />Download PDF</Button>
        <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />Print</Button>
      </div>
      <div className="no-print mt-3 grid">
        <Button to="/my-bookings" variant="ghost">View all bookings</Button>
      </div>
    </div>
  );
}
