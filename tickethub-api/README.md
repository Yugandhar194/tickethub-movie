# TicketHub API

Express + SQLite backend for the TicketHub UI. It speaks the same endpoints as the original Spring API, so the frontend works unchanged, and it adds the things the Spring version was missing.

## Run

```bash
npm install
npm start          # http://localhost:8080
```

Requires Node.js 22.x (the version pinned for Vercel and native SQLite compatibility). No database server, no mail server, no keys. The first start creates `data/tickethub.db`, three demo accounts, ten sample films and seven days of showtimes. `npm test` runs 15 end-to-end tests.

Demo accounts (printed on first start):

| Role | Email | Password |
|---|---|---|
| Customer | user@tickethub.test | User@1234 |
| Theater owner | owner@tickethub.test | Owner@123 |
| Admin | admin@tickethub.test | Admin@123 |

Sign-in is two steps: password, then a 6-digit code. In development the code is printed in this terminal and shown on the sign-in screen.

## What it does that the Spring backend did not

- **Real seat locks.** Choosing seats and continuing creates a pending booking that holds them for `SEAT_HOLD_MINUTES`. The seat map shows them as locked to everyone else, and they are released automatically if payment does not arrive. A unique constraint makes double booking impossible; losing the race returns `409`.
- **Server-side pricing.** Ticket prices come from the booking; food is accepted only as catalogue IDs and bounded quantities, then priced on the server. Client-submitted totals are ignored. Convenience-fee and GST percentages are configured on the server.
- **Payment checks.** With Razorpay keys the payment signature is verified; a booking is only confirmed after that. Confirmation is idempotent and the downloadable PDF reflects the paid order total.
- **Google sign-in.** `POST /auth/google` verifies the Google ID token and audience against `GOOGLE_CLIENT_ID`; it never trusts browser-supplied profile fields.
- **Booking notifications.** After a payment is verified, the API automatically sends a confirmation email through SMTP and an approved WhatsApp Cloud API template. The frontend does not call WhatsApp directly. WhatsApp uses the phone saved on the customer profile, normalizes 10-digit Indian numbers to `91` format, and sends five template parameters (booking code, movie, show date/time, seats, amount). Missing configuration or invalid phone numbers safely skip WhatsApp; Meta delivery failures are logged and never undo a verified payment.
- **Production guardrails.** `NODE_ENV=production` refuses the demo JWT secret, mock payments, console OTP mode and seeded demo accounts.
- **Login tokens and roles.** Customers see only their own bookings; owners see only their theaters; admin routes need an admin. Passwords are bcrypt hashes and are never returned.
- **Seat labels, status and expiry** are returned on bookings, so tickets show seats on any device.
- **Admin tools:** add theaters, owners and showtimes (`/admin/...`), import from TMDB (`GET /movies`), and automatic showtime scheduling.
- **Safer profile edits:** `PUT /user/updateUser/:id` changes only name, email, phone, gender, marital status and date of birth.

## Endpoints

Public: `POST /auth/google` (Google Identity Services ID token), `GET /movie/:type/type` (NowPlaying, Trending, Upcoming, Popular), `/movie/:id`, `/movie/:id/cast`, `/movie/search?title=`, `/showtimes/movie/:id`, `/showtimes/:id`, `/booked-seats/showtime/:id`, `POST /signin`, `/user/verifyOTP`, `/user/signup`, `GET /user/validateEmail`, `/user/validatePhone`, `POST /contact/send`, `GET /health`.

Signed in: `POST /bookings/create`, `GET /bookings/:id`, `/bookings/user/:id`, `DELETE /bookings/deleteUser/:id` (cancel), `POST /api/payments/create`, `/api/payments/success`, `GET /tickets/download/:id`, `PUT /user/updateUser/:id`.

Admin: `GET /user/getAllUsers`, `/theaterowner/getAllUsers`, `/movies` (TMDB import), `DELETE /user/deleteUser/:id`, `/theaterowner/deleteUser/:id`, `/admin/theaters`, `/admin/theater-owners`, `/admin/showtimes`, `/admin/schedule`. Owners can read `/bookings/getAllUsers` (their theaters only).

## Going live

Set `NODE_ENV=production`, a random `JWT_SECRET` of at least 32 characters, `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`, matching Razorpay keys, `CORS_ORIGINS` (include the exact deployed UI origin), `FRONTEND_URL` (the deployed UI origin), and `SEED_DEMO=false`. Set `GOOGLE_CLIENT_ID` to your Google OAuth Web client ID. For WhatsApp, configure `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_VERSION` (default `v24.0`) and an approved `WHATSAPP_TEMPLATE_NAME`. The approved template must use exactly five body parameters in this order: booking code, movie title, show date/time, seats, total amount. The customer must have a valid phone number saved in their profile. The API sends this template automatically after verified payment; do not call Meta from the browser. Keep `CONVENIENCE_FEE_PCT` and `GST_PCT` in sync with the matching frontend `VITE_` values. Never commit `.env` files or provider secrets. Put the API behind HTTPS.

SQLite suits a single server. For several servers, move to Postgres or MySQL.
