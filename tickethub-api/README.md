# TicketHub API

Express + SQLite backend for the TicketHub UI. It speaks the same endpoints as the original Spring API, so the frontend works unchanged, and it adds the things the Spring version was missing.

## Run

```bash
npm install
npm start          # http://localhost:8080
```

Needs Node 18.17 or newer. No database server, no mail server, no keys. The first start creates `data/tickethub.db`, three demo accounts, ten sample films and seven days of showtimes. `npm test` runs 14 end-to-end tests.

Demo accounts (printed on first start):

| Role | Email | Password |
|---|---|---|
| Customer | user@tickethub.test | User@1234 |
| Theater owner | owner@tickethub.test | Owner@123 |
| Admin | admin@tickethub.test | Admin@123 |

Sign-in is two steps: password, then a 6-digit code. In development the code is printed in this terminal and shown on the sign-in screen.

## What it does that the Spring backend did not

- **Real seat locks.** Choosing seats and continuing creates a pending booking that holds them for `SEAT_HOLD_MINUTES`. The seat map shows them as locked to everyone else, and they are released automatically if payment does not arrive. A unique constraint makes double booking impossible; losing the race returns `409`.
- **Server-side pricing.** The ticket total comes from the showtime price. The browser can add food on top but can never pay less.
- **Payment checks.** With Razorpay keys the payment signature is verified; a booking is only confirmed after that.
- **Login tokens and roles.** Customers see only their own bookings; owners see only their theaters; admin routes need an admin. Passwords are bcrypt hashes and are never returned.
- **Seat labels, status and expiry** are returned on bookings, so tickets show seats on any device.
- **Admin tools:** add theaters, owners and showtimes (`/admin/...`), import from TMDB (`GET /movies`), and automatic showtime scheduling.
- **Safer profile edits:** `PUT /user/updateUser/:id` changes only name, email, phone, gender, marital status and date of birth.

## Endpoints

Public: `GET /movie/:type/type` (NowPlaying, Trending, Upcoming, Popular), `/movie/:id`, `/movie/:id/cast`, `/movie/search?title=`, `/showtimes/movie/:id`, `/showtimes/:id`, `/booked-seats/showtime/:id`, `POST /signin`, `/user/verifyOTP`, `/user/signup`, `GET /user/validateEmail`, `/user/validatePhone`, `POST /contact/send`, `GET /health`.

Signed in: `POST /bookings/create`, `GET /bookings/:id`, `/bookings/user/:id`, `DELETE /bookings/deleteUser/:id` (cancel), `POST /api/payments/create`, `/api/payments/success`, `GET /tickets/download/:id`, `PUT /user/updateUser/:id`.

Admin: `GET /user/getAllUsers`, `/theaterowner/getAllUsers`, `/movies` (TMDB import), `DELETE /user/deleteUser/:id`, `/theaterowner/deleteUser/:id`, `/admin/theaters`, `/admin/theater-owners`, `/admin/showtimes`, `/admin/schedule`. Owners can read `/bookings/getAllUsers` (their theaters only).

## Going live

Set `JWT_SECRET`, `SMTP_*` (otherwise anyone can read sign-in codes), real Razorpay keys, `CORS_ORIGINS` and `FRONTEND_URL`, and `SEED_DEMO=false`. Delete or change the demo accounts. Put it behind HTTPS.

SQLite suits a single server. For several servers, move to Postgres or MySQL.
