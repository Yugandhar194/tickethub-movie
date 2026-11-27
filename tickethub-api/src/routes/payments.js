import crypto from 'node:crypto';
import { Router } from 'express';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { ApiError, wrap } from '../util.js';

const code = (id) => `TH-${String(id).padStart(6, '0')}`;
const FOOD_CATALOG = Object.freeze({
  1: { name: 'Nachos', price: 300 },
  2: { name: 'Coke 500ml', price: 250 },
  3: { name: 'Masala Coke 500ml', price: 250 },
  4: { name: 'Cheese Popcorn', price: 300 },
  5: { name: 'Salted Popcorn', price: 300 },
  6: { name: 'Stuffed Samosa', price: 150 },
  7: { name: 'Onion Kachori', price: 150 },
  8: { name: 'Veg Puff', price: 200 },
  9: { name: 'Tea', price: 75 },
  10: { name: 'Coffee', price: 100 },
});
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function priceFood(items = []) {
  if (!Array.isArray(items) || items.length > 10) throw new ApiError(400, 'Invalid food order.');
  const seen = new Set();
  const lines = items.map((item) => {
    const id = Number(item?.id);
    const quantity = Number(item?.quantity);
    if (!FOOD_CATALOG[id] || !Number.isInteger(quantity) || quantity < 1 || quantity > 10 || seen.has(id)) {
      throw new ApiError(400, 'Food items must use valid catalogue IDs and quantities from 1 to 10.');
    }
    seen.add(id);
    return { id, name: FOOD_CATALOG[id].name, price: FOOD_CATALOG[id].price, quantity };
  });
  return { lines, total: round2(lines.reduce((sum, item) => sum + item.price * item.quantity, 0)) };
}

async function sendBookingNotifications({ auth, cfg, booking, user, showtime, seats, foodLines, total }) {
  const movie = showtime.movie?.title || 'your movie';
  const when = `${showtime.date} at ${String(showtime.time).slice(0, 5)}`;
  const bookingCode = code(booking.id);
  const summary = [
    `Your TicketHub booking ${bookingCode} is confirmed.`,
    `Movie: ${movie}`,
    `Theatre: ${showtime.theater?.name || 'Cinema'}`,
    `Show: ${when}`,
    `Seats: ${seats.join(', ')}`,
    `Total paid: INR ${Number(total).toFixed(2)}`,
    foodLines.length ? `Food: ${foodLines.map((item) => `${item.name} x${item.quantity}`).join(', ')}` : '',
    `View your ticket: ${cfg.frontendUrl}/tickets/${booking.id}`,
  ].filter(Boolean).join('\n');

  if (cfg.otpMode === 'smtp' && user.email) {
    try {
      await auth.sendMail(user.email, `TicketHub booking confirmed - ${bookingCode}`, summary);
    } catch (error) {
      console.error('[notifications] confirmation email failed:', error.message);
    }
  }

  if (cfg.whatsapp?.token && cfg.whatsapp?.phoneNumberId && user.phone) {
    const digits = String(user.phone).replace(/\D/g, '');
    const recipient = digits.length === 10 ? `91${digits}` : digits;
    if (recipient.length >= 10 && recipient.length <= 15) {
      try {
        const response = await fetch(`https://graph.facebook.com/${cfg.whatsapp.graphVersion}/${cfg.whatsapp.phoneNumberId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${cfg.whatsapp.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: recipient,
            type: 'template',
            template: {
              name: cfg.whatsapp.template,
              language: { code: 'en_US' },
              components: [{ type: 'body', parameters: [
                { type: 'text', text: bookingCode },
                { type: 'text', text: movie },
                { type: 'text', text: when },
                { type: 'text', text: seats.join(', ') },
                { type: 'text', text: `INR ${Number(total).toFixed(2)}` },
              ] }],
            },
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          console.error('[notifications] WhatsApp delivery failed:', data?.error?.message || response.statusText);
        }
      } catch (error) {
        console.error('[notifications] WhatsApp delivery failed:', error.message);
      }
    }
  }
}

export default function paymentRoutes({ db, cfg, svc, auth }) {
  const r = Router();

  function mine(req) {
    svc.releaseExpired();
    const b = svc.q.booking.get(req.body?.bookingId ?? req.query.bookingId);
    if (!b || b.user_id !== req.user.id) throw new ApiError(404, 'Booking not found.');
    return b;
  }

  // The server owns every price. The browser sends catalogue IDs and quantities, never trusted prices.
  r.post('/api/payments/create', auth.requireRole('USER'), wrap(async (req, res) => {
    const b = mine(req);
    if (b.status === 'CONFIRMED') throw new ApiError(400, 'This booking is already paid.');
    if (b.status !== 'PENDING') throw new ApiError(410, 'This booking has expired. Please choose your seats again.');

    const food = priceFood(req.body?.foodItems || []);
    const subtotal = round2(Number(b.amount_total) + food.total);
    const fee = round2(subtotal * (cfg.convenienceFeePct || 0) / 100);
    const tax = round2((subtotal + fee) * (cfg.gstPct || 0) / 100);
    const amount = round2(subtotal + fee + tax);
    if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, 'Could not calculate a valid order total.');

    let order;
    if (process.env.NODE_ENV === 'production' && cfg.paymentMode !== 'razorpay') {
      throw new ApiError(503, 'Online payments are not configured yet. Please try again later.');
    }
    if (cfg.paymentMode === 'razorpay') {
      const auth64 = Buffer.from(`${cfg.razorpay.keyId}:${cfg.razorpay.keySecret}`).toString('base64');
      const resp = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST', headers: { Authorization: `Basic ${auth64}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt: code(b.id) }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new ApiError(502, data?.error?.description || 'Razorpay could not create the order.');
      order = { id: data.id, amount: data.amount, currency: data.currency };
    } else {
      order = { id: `order_mock_${b.id}_${crypto.randomBytes(4).toString('hex')}`, amount: Math.round(amount * 100), currency: 'INR', mock: true };
    }

    db.prepare('UPDATE bookings SET order_id = ?, order_amount = ?, food_total = ?, food_json = ? WHERE id = ?')
      .run(order.id, amount, food.total, JSON.stringify(food.lines), b.id);
    res.json({ ...order, key_id: cfg.razorpay.keyId || undefined, breakdown: { tickets: b.amount_total, food: food.total, fee, tax, total: amount } });
  }));

  r.post('/api/payments/success', auth.requireRole('USER'), wrap(async (req, res) => {
    const { orderId, transactionId, signature } = req.body?.orderId ? req.body : req.query;
    if (!orderId || !transactionId) throw new ApiError(400, 'Payment order and transaction IDs are required.');
    const b = db.prepare('SELECT * FROM bookings WHERE order_id = ?').get(String(orderId));
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

    svc.confirmBooking(b, String(transactionId));
    const confirmed = svc.q.booking.get(b.id);
    const user = svc.q.user.get(b.user_id);
    const view = svc.bookingView(confirmed);
    await sendBookingNotifications({
      auth, cfg, booking: confirmed, user, showtime: view.showtime,
      seats: view.seatNumbers, foodLines: JSON.parse(confirmed.food_json || '[]'),
      total: confirmed.order_amount || confirmed.amount_total,
    });
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
    line('AMOUNT PAID', `INR ${Number(b.order_amount || b.amount_total).toFixed(2)}`);
    doc.image(qr, doc.page.width - 36 - 120, doc.page.height - 36 - 150, { width: 120 });
    doc.fontSize(14).font('Helvetica-Bold').text(code(b.id), 36, doc.page.height - 36 - 40);
    doc.end();
  }));

  return r;
}
