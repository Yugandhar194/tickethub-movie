import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';
import { LegacyMovieRedirect, Redirect, RequireAuth } from './components/layout/Guards';
import Home from './pages/Home';
import Movies from './pages/Movies';
import MovieDetail from './pages/MovieDetail';
import Search from './pages/Search';
import Login from './pages/Login';
import Register from './pages/Register';
import { Contact, NotFound, Returns, Terms } from './pages/Info';

// Heavier or role-specific screens load on demand.
const SeatSelection = lazy(() => import('./pages/SeatSelection'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Ticket = lazy(() => import('./pages/Ticket'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const Account = lazy(() => import('./pages/Account'));
const Admin = lazy(() => import('./pages/Admin'));
const Owner = lazy(() => import('./pages/Owner'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MotionConfig reducedMotion="user">
          <Routes>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="movies" element={<Movies />} />
              <Route path="movies/:id" element={<MovieDetail />} />
              <Route path="search" element={<Search />} />
              <Route path="book/:showtimeId" element={<RequireAuth><SeatSelection /></RequireAuth>} />
              <Route path="checkout/:bookingId" element={<RequireAuth><Checkout /></RequireAuth>} />
              <Route path="tickets/:bookingId" element={<RequireAuth><Ticket /></RequireAuth>} />
              <Route path="my-bookings" element={<RequireAuth><MyBookings /></RequireAuth>} />
              <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
              <Route path="admin" element={<RequireAuth roles={['ADMIN']}><Admin /></RequireAuth>} />
              <Route path="owner" element={<RequireAuth roles={['THEATER_OWNER']}><Owner /></RequireAuth>} />
              <Route path="contact" element={<Contact />} />
              <Route path="terms" element={<Terms />} />
              <Route path="returns" element={<Returns />} />

              {/* URLs from the previous version keep working */}
              <Route path="movie_details/:id" element={<LegacyMovieRedirect />} />
              <Route path="show_time/:id" element={<LegacyMovieRedirect hash="#showtimes" />} />
              <Route path="seat_booking/:showTimeId" element={<Redirect to={(p) => `/book/${p.showTimeId}`} />} />
              <Route path="payment/:bookingId" element={<Redirect to={(p) => `/checkout/${p.bookingId}`} />} />
              <Route path="ticket/:bookingId" element={<Redirect to={(p) => `/tickets/${p.bookingId}`} />} />
              <Route path="user-dashboard" element={<Redirect to="/my-bookings" />} />
              <Route path="owner-dashboard" element={<Redirect to="/owner" />} />
              <Route path="admin-dashboard" element={<Redirect to="/admin" />} />
              <Route path="movies-upcoming" element={<Redirect to="/movies?when=upcoming" />} />
              <Route path="contactus" element={<Redirect to="/contact" />} />
              <Route path="terms-condition" element={<Redirect to="/terms" />} />
              <Route path="return-policy" element={<Redirect to="/returns" />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <ToastContainer theme="dark" position="top-center" autoClose={4500} newestOnTop pauseOnFocusLoss={false} />
        </MotionConfig>
      </AuthProvider>
    </BrowserRouter>
  );
}
