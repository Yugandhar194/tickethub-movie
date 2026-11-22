import crypto from 'node:crypto';
import { Router } from 'express';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { ApiError, wrap } from '../util.js';

const code = (id) => `TH-${String(id).padStart(6, '0')}`;

export default function paymentRoutes({ db, cfg, svc, auth }) {
  const r = Router();

  function mine(req) {
    svc.releaseExpired();
    const b = svc.q.booking.get(req.query.bookingId);
    if (!b || b.user_id !== req.user.id) throw new ApiError(404, 'Booking not found.');
    return b;
  }

  // The ticket price is fixed by the booking. The browser may add food and drinks on top, but can never pay less.
  r.post('/api/payments/create', auth.requireRole('USER'), wrap(async (req, res) => {
    const b = mine(req);
    if (b.status === 'CONFIRMED') throw new ApiError(400, 'This booking is already paid.');
    if (b.status !== 'PENDING') throw new ApiError(410, 'This booking has expired. Please choose your seats again.');
    const amount = Math.round(Number(req.query.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount < b.amount_total) throw new ApiError(400, 'The amount is lower than the ticket total.');
    if (amount > b.amount_total + 50000) throw new ApiError(400, 'The amount is too high for this booking.');

    let order;
    if (cfg.paymentMode === 'razorpay') {
      const auth64 = Buffer.from(`${cfg.razorpay.keyId}:${cfg.razorpay.keySecret}`).toString('base64');
      const resp = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST', headers: { Authorization: `Basic ${auth64}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt: code(b.id) }), signal: AbortSignal.timeout(15000),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new ApiError(502, data?.error?.description || 'Razorpay could not create the order.');
      order = { id: data.id, amount: data.amount, currency: data.currency };
    } else {
      // No Razorpay keys configured: a stand-in order that the UI completes without opening the payment window.
      order = { id: `order_mock_${b.id}_${crypto.randomBytes(4).toString('hex')}`, amount: Math.round(amount * 100), currency: 'INR', mock: true };
    }
    db.prepare('UPDATE bookings SET order_id = ?, order_amount = ? WHERE id = ?').run(order.id, amount, b.id);
    res.json(order);
  }));

  r.post('/api/payments/success', auth.requireRole('USER'), wrap((req, res) => {
    const { orderId, transactionId, signature } = req.query;
    const b = db.prepare('SELECT * FROM bookings WHERE order_id = ?').get(String(orderId || ''));
    if (!b || b.user_id !== req.user.id) throw new ApiError(404, 'Order not found.');
    if (b.status === 'CONFIRMED') return res.json({ message: 'Already confirmed' });
    if (cfg.paymentMode === 'razorpay') {
      const expected = crypto.createHmac('sha256', cfg.razorpay.keySecret).update(`${orderId}|${transactionId}`).digest('hex');
      const given = Buffer.from(String(signature || ''));
      const want = Buffer.from(expected);
      if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) throw new ApiError(400, 'The payment signature did not match.');
    } else if (!String(orderId).startsWith('order_mock_')) {
      throw new ApiError(400, 'Unknown order.');
    }
    svc.confirmBooking(b, String(transactionId || 'mock_payment'));
    res.json({ message: 'Payment confirmed' });
  }));

  r.get('/tickets/download/:id', auth.requireAuth, wrap(async (req, res) => {
    svc.releaseExpired();
    const b = svc.q.booking.get(req.params.id);
    const allowed = b && (req.user.role === 'ADMIN' || (req.user.role === 'USER' && b.user_id === req.user.id));
    if (!allowed) throw new ApiError(404, 'Booking not found.');
    if (b.status !== 'CONFIRMED') throw new ApiError(402, 'Payment is still pending for this booking.');
    const v = svc.bookingView(b);
    const qr = await QRCode.toBuffer(`${cfg.frontendUrl}/tickets/${b.id}`, { margin: 1, width: 220 });

    const doc = new PDFDocument({ size: 'A5', margin: 36, info: { Title: `TicketHub ${code(b.id)}` } });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="ticket_${b.id}.pdf"` });
    doc.pipe(res);
    doc.rect(0, 0, doc.page.width, 70).fill('#E11D48');
    doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold').text('TicketHub', 36, 26);
    doc.fillColor('#111').fontSize(20).text(v.showtime.movie.title, 36, 96, { width: doc.page.width - 72 });
    const line = (label, value) => { doc.moveDown(0.6).fontSize(9).font('Helvetica').fillColor('#666').text(label); doc.fontSize(13).font('Helvetica-Bold').fillColor('#111').text(value); };
    doc.moveDown(0.4);
    line('THEATER', `${v.showtime.theater.name}, ${v.showtime.theater.location || ''}`);
    line('DATE AND TIME', `${v.showtime.date}  ${String(v.showtime.time).slice(0, 5)}`);
    line('SEATS', v.seatNumbers.join(', '));
    line('AMOUNT', `INR ${b.amount_total.toFixed(2)}`);
    doc.image(qr, doc.page.width - 36 - 120, doc.page.height - 36 - 150, { width: 120 });
    doc.fontSize(14).font('Helvetica-Bold').text(code(b.id), 36, doc.page.height - 36 - 40);
    doc.end();
  }));

  return r;
}
