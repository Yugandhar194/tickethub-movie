<div align="center">

# 🎬 TicketHub

### Find your film. Pick your seats. Make it a movie night.

An elegant, responsive movie discovery and ticket-booking experience built with **React** and **Vite**.

<p>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 3" />
  <img src="https://img.shields.io/badge/Responsive-Mobile_first-22C55E?style=for-the-badge" alt="Responsive design" />
</p>

[Features](#-the-ticketHub-experience) · [Get started](#-get-started) · [Configuration](#-configuration) · [Deploy](#-build--deploy)

</div>

---

## ✨ The TicketHub experience

TicketHub brings the cinema journey together in one place—from discovering what is showing to carrying a digital ticket on your phone.

| Discover | Book | Manage |
|---|---|---|
| 🎞️ Featured movie carousel and trending titles | 🪑 Interactive seat selection and showtimes | 🎟️ Digital tickets and booking history |
| 🔎 Search, genre, language, rating and date filters | 💳 Checkout with Razorpay integration | 🛠️ Admin and theater-owner dashboards |
| 🍿 Movie details, cast, ratings and trailers | 📱 Mobile-friendly booking flow | 👤 Account and role-aware sign-in |

### Designed for every screen

The interface combines a cinematic dark palette, responsive layouts, touch-friendly navigation, subtle motion and accessible controls. On phones, the navigation stays available while browsing; trailer playback remains contained in its centered dialog.

## 🧰 Built with

- **React 18** and **React Router** for the application and routes
- **Vite 5** for local development and production builds
- **Tailwind CSS** for responsive styling
- **Framer Motion** for transitions and carousel effects
- **Lucide React** for icons
- **Axios** for API communication
- **TMDB** movie discovery data, with optional **OMDb** ratings
- **Razorpay** checkout integration through the backend
- Optional Google Identity Services sign-in, SMTP booking emails and Meta WhatsApp Cloud API confirmations

## 🚀 Get started

### Requirements

- Node.js 18 or later
- npm
- The TicketHub API for live booking features (or the included mock API for a local demo)

### Install and run

```bash
npm install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Then start the API and frontend in separate terminals:

```bash
npm run mock
```

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The mock API keeps demo data in memory and resets when restarted. Use one of these demo accounts:

| Role | Email |
|---|---|
| Customer | `user@tickethub.test` |
| Theater owner | `owner@tickethub.test` |
| Admin | `admin@tickethub.test` |

For the mock sign-in flow, any password works and the one-time code is `123456`. Mock payments are not real transactions.

## ⚙️ Configuration

Set values in `.env` before starting Vite. Values prefixed with `VITE_` are included in the client bundle; **never put private credentials or server-side secrets in this file**.

| Variable | Purpose | Default |
|---|---|---|
| `VITE_BACKEND` | API contract to use: `spring` or `dotnet` | `spring` |
| `VITE_API_BASE_URL` | TicketHub API origin | `http://localhost:8080` |
| `VITE_GOOGLE_CLIENT_ID` | Google Identity Services Web client ID (must match the API) | Empty |
| `VITE_TMDB_API_KEY` | Live movie listings, details and trailers | Empty |
| `VITE_TMDB_REGION` | Movie region | `IN` |
| `VITE_TMDB_LANGUAGE` | Movie language | `en-US` |
| `VITE_OMDB_API_KEY` | Optional IMDb and Rotten Tomatoes ratings | Empty |
| `VITE_RAZORPAY_KEY_ID` | Public Razorpay key ID used by checkout | Empty |
| `VITE_CONVENIENCE_FEE_PCT` | Optional checkout fee percentage | `0` |
| `VITE_GST_PCT` | Optional GST percentage | `0` |
| `VITE_SEAT_HOLD_MINUTES` | Client-side seat selection timer | `8` |
| `VITE_ENABLE_PROFILE_EDIT` | Enable account profile editing | `false` |

Without a TMDB key, the app can use movies from the configured backend and then fall back to a clearly labelled sample set. Movie responses from TMDB are cached in the browser.

> **Production payments:** Keep the Razorpay secret and all payment verification on the server. The frontend key ID is public; it is not a substitute for server-side order validation.

## 🗺️ Main screens

| Path | Screen |
|---|---|
| `/` | Home and featured films |
| `/movies` | Browse and filter movies |
| `/movies/:id` | Movie information, trailer and showtimes |
| `/search` | Search movies |
| `/login` · `/register` | Account access |
| `/book/:showtimeId` | Choose seats |
| `/checkout/:bookingId` | Review and pay |
| `/tickets/:bookingId` | Digital ticket |
| `/my-bookings` · `/account` | Customer account |
| `/admin` · `/owner` | Role-specific dashboards |
| `/contact` · `/terms` · `/returns` | Support and policies |

## 📦 Build & deploy

Create an optimized static production build:

```bash
npm run build
```

The generated site is in `dist/`. Preview the build locally with:

```bash
npm run preview
```

TicketHub can be deployed to any static host that serves Vite builds. Configure the host to route application paths back to `index.html` for client-side routing, set the required `VITE_` values before building, and allow the deployed site origin in the API's CORS configuration.

## 🔌 Data and backend notes

- Movie discovery prefers TMDB when configured, then uses the TicketHub API, with sample data as an offline fallback.
- Booking, seat availability, account and payment actions require a compatible backend. `tickethub-api` is one that is included.
- The included mock API is for local UI exploration only; it is in-memory and does not provide production persistence or real payment processing.
- The .NET backend contract currently supports only part of the booking experience; the Spring backend is the complete integration.
- TMDB movie data is provided by TMDB. TicketHub is not endorsed or certified by TMDB.

### Bundled backend (`tickethub-api`)

A Node.js (Express and SQLite) backend that matches the API the UI calls. Nothing to install besides Node 18.17 or newer: no database server, no mail server, no keys.

```bash
# terminal 1
cd tickethub-api
npm install
npm start            # http://localhost:8080

# terminal 2
cd tickethub-ui
npm install
cp .env.example .env # add your TMDB key
npm run dev          # http://localhost:5173
```

Demo accounts are created on first start: `user@tickethub.test` / `User@1234`, `owner@tickethub.test` / `Owner@123`, `admin@tickethub.test` / `Admin@123`. Sign-in uses a one-time code, which the backend prints in its terminal in development.

The two apps are linked by `VITE_API_BASE_URL` in `tickethub-ui/.env` (default `http://localhost:8080`) and `CORS_ORIGINS` in `tickethub-api/.env` (default `http://localhost:5173`). For live films you can book, put the same TMDB key in both `.env` files; the backend imports the films and schedules showtimes for them. See `tickethub-api/README.md` for endpoints, seat locking, server-priced food orders, Google sign-in, email/WhatsApp confirmations, payments and production setup.

---

<div align="center">

**Made for movie lovers. Built to make booking feel like part of the show.** 🍿

</div>
