# TicketHub UI (2026 redesign)

A rebuilt frontend for TicketHub: React 18, Vite, Tailwind, Framer Motion, Lucide. It keeps the Spring Boot API contract and the email-OTP sign-in flow from the original, and adds live releases, trending titles and box office from TMDB.

## Run it

```bash
npm install
cp .env.example .env     # then add a free TMDB key (see below)
npm run dev              # http://localhost:5173 (the backend's CORS only allows this port)
```

No MySQL handy? `npm run mock` starts a small stand-in API on port 8080. Sign in with `user@tickethub.test`, `owner@tickethub.test` or `admin@tickethub.test`, any password, OTP `123456`.

`npm run build` produces `dist/`.

## Data sources, in order

1. **TMDB** (needs `VITE_TMDB_API_KEY`): now playing, trending this week, upcoming, details, trailers, cast, revenue. Responses are cached in `localStorage` (30 min), and the last cached answer is served if TMDB is unreachable.
2. **TicketHub database** (your backend's `/movie/{type}/type`) when TMDB is missing or down.
3. **Sample set** (clearly labelled, invented titles) only if both are unreachable.

**Booking bridge.** Showtimes and bookings use the database movie id. Each live film is matched to a database row by TMDB id (`movieId` column), then by exact title. Matched films show "Book now" and real showtimes; unmatched films say they are not scheduled yet. Admin ▸ Movie catalogue ▸ Sync calls your existing `GET /movies` import.

**Box office** is TMDB's worldwide `revenue` for films now in cinemas, ranked high to low. TMDB revenue is community-maintained and lags trade charts; the UI says so. When TMDB has no revenue yet, the ticker ranks by popularity and says that instead.

## Routes

`/`, `/movies`, `/movies/:id` (TMDB id), `/search`, `/book/:showtimeId`, `/checkout/:bookingId`, `/tickets/:bookingId`, `/my-bookings`, `/account`, `/admin`, `/owner`, `/login`, `/register`, `/about`, `/contact`, `/terms`, `/returns`. Old URLs (`/movie_details/:id`, `/payment/:id`, `/ticket/:id`, ...) redirect.

`VITE_BACKEND=dotnet` switches route shapes for the .NET API. That project currently has no booking, booked-seat or ticket endpoints, so only browsing and sign-in work there.

## Things the backend does not do (and what the UI does instead)

| Gap | UI behaviour |
|---|---|
| No seat-lock endpoint | The seat hold timer only resets the on-screen selection. The seat map re-checks taken seats every 20 s and again just before booking. |
| `createBooking` accepts seats that are already taken | Mitigated by the re-check above, not fixed. Add a unique constraint on (showtime, seatNo). |
| One price per showtime | Seat tiers (Classic, Executive, Recliner) are zones; multipliers in `src/config/seatTiers.js` are 1. |
| Booking response has no seat labels | Seats are remembered in this browser's `localStorage`; other devices show the seat count. |
| No payment status on booking | Ticket page does not verify payment. |
| No showtime-by-id, format, amenities or city fields | Showtime goes with the user from the movie page. City comes from `theater.location`. A format filter appears automatically if showtimes include a `format` field. |
| No endpoints to create theaters, screens or showtimes | Admin cannot manage them from the UI. |
| `PUT /user/updateUser` saves the posted object as the whole row | Profile editing is off (`VITE_ENABLE_PROFILE_EDIT`), because it can blank the password. |
| `/api/payments/create` trusts the amount from the browser | Unchanged. Recompute the amount on the server from the booking. |

## Behaviour changes to confirm

- Checkout total is now seats x showtime price (+ food, + optional fee/GST). The old page charged one ticket price regardless of seat count.
- Terms are shown and accepted before the booking is created, so abandoned dialogs no longer leave bookings holding seats.
- Convenience fee and GST default to 0 (`VITE_CONVENIENCE_FEE_PCT`, `VITE_GST_PCT`).
- Theater owner dashboard now loads the signed-in owner (the old one always loaded owner 1) and shows real bookings instead of sample data.
- Social links in the footer were removed (they pointed to login pages). The mascot logo was replaced with a wordmark.

## Security: please rotate

The original repo contains a TMDB key, a Google API key, a Razorpay test key id and, in `application.properties`, the database, Gmail and Razorpay secrets. Treat them as exposed and rotate them. This UI reads keys from `.env` only.
