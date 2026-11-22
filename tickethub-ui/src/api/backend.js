import axios from 'axios';
import { API_BASE, BACKEND } from '../config/env';

const http = axios.create({ baseURL: API_BASE, timeout: 15000 });

// The backend issues a token after the one-time code is verified; it is sent on every request.
export const TOKEN_KEY = 'th_token';
http.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
// A token that has expired mid-session sends the person back to sign in instead of failing silently.
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && sessionStorage.getItem(TOKEN_KEY) && !/\/(signin|user\/verifyOTP)/.test(err.config?.url || '')) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem('user_details');
      window.location.assign('/login');
    }
    return Promise.reject(err);
  }
);

// Route tables for the two backends that live in the repo. Spring is the complete one.
const routes = {
  spring: {
    moviesByType: (t) => `/movie/${t}/type`,
    movieById: (id) => `/movie/${id}`,
    movieCast: (id) => `/movie/${id}/cast`,
    movieSearch: () => '/movie/search',
    movieFilter: (t) => `/movie/${t}/filter`,
    filterParams: (t, p) => p,
    signin: '/signin',
    payCreate: '/api/payments/create',
    paySuccess: '/api/payments/success',
  },
  dotnet: {
    moviesByType: (t) => `/movie/type/${t}`,
    movieById: (id) => `/movie/id/${id}`,
    movieCast: (id) => `/movie/id/${id}/cast`,
    movieSearch: () => '/movie/search/title',
    movieFilter: () => '/movie/filter',
    filterParams: (t, p) => ({ ...p, type: t }),
    signin: '/user/signin',
    payCreate: '/payments/create',
    paySuccess: '/payments/success',
  },
};
const r = routes[BACKEND];

export const errorMessage = (e, fallback = 'Something went wrong. Please try again.') => {
  const data = e?.response?.data;
  if (typeof data === 'string' && data.length < 200) return data;
  return data?.message || (e?.code === 'ERR_NETWORK' ? 'Cannot reach the TicketHub server.' : fallback);
};

// ── Movies stored in the TicketHub database ────────────────────────────────
export const fetchLocalMovies = (type) => http.get(r.moviesByType(type)).then((x) => x.data || []);
export const fetchLocalMovie = (id) => http.get(r.movieById(id)).then((x) => x.data);
export const fetchLocalCast = (id) => http.get(r.movieCast(id)).then((x) => x.data);
export const searchLocalMovies = (title) =>
  http.get(r.movieSearch(), { params: { title } }).then((x) => x.data || []);
export const filterLocalMovies = (type, params) =>
  http.get(r.movieFilter(type), { params: r.filterParams(type, params) }).then((x) => x.data || []);
// Existing admin endpoint that pulls TMDB movies into the database (Spring: GET /movies).
export const syncMoviesFromTmdb = () => http.get('/movies').then((x) => x.data);

// ── Showtimes and seats ────────────────────────────────────────────────────
export const fetchShowtimes = (movieId) =>
  http.get(`/showtimes/movie/${movieId}`).then((x) => (Array.isArray(x.data) ? x.data : []));
export const fetchBookedSeats = (showtimeId) =>
  http.get(`/booked-seats/showtime/${showtimeId}`).then((x) => (Array.isArray(x.data) ? x.data : []));

// ── Bookings, payment, tickets ─────────────────────────────────────────────
export const createBooking = (payload) => http.post('/bookings/create', payload).then((x) => x.data);
export const fetchBooking = (id) => http.get(`/bookings/${id}`).then((x) => x.data);
export const fetchBookingsByUser = (userId) =>
  http.get(`/bookings/user/${userId}`).then((x) => x.data || []);
export const fetchAllBookings = () =>
  http.get('/bookings/getAllUsers').then((x) => (Array.isArray(x.data) ? x.data : []));
export const cancelBooking = (id) => http.delete(`/bookings/deleteUser/${id}`).then((x) => x.data);
export const downloadTicketPdf = (id) =>
  http.get(`/tickets/download/${id}`, { responseType: 'blob' }).then((x) => x.data);

// Spring returns the Razorpay order as JSON; .NET returns just the order id string.
export async function createPaymentOrder(bookingId, amount) {
  const { data } = await http.post(r.payCreate, null, { params: { bookingId, amount } });
  if (!data) throw new Error('Could not create the payment order.');
  if (typeof data === 'string') {
    return { id: data, amount: Math.round(amount * 100), currency: 'INR' };
  }
  return { id: data.id, amount: data.amount, currency: data.currency || 'INR', mock: Boolean(data.mock) };
}
export const confirmPayment = (orderId, transactionId, signature) =>
  http.post(r.paySuccess, null, { params: { orderId, transactionId, signature } });

// ── Auth and users ─────────────────────────────────────────────────────────
export async function signIn(credentials) {
  const { data } = await http.post(r.signin, credentials);
  const profile = data?.user || data?.theaterOwner || data?.admin || null;
  return { message: data?.message, profile };
}
export const verifyOtp = (payload) => http.post('/user/verifyOTP', payload).then((x) => x.data);
export const signUp = (user) => http.post('/user/signup', user).then((x) => x.data);
export const checkEmail = (email) => http.get('/user/validateEmail', { params: { email } });
export const checkPhone = (phone) => http.get('/user/validatePhone', { params: { phone } });
export const updateUser = (id, user) => http.put(`/user/updateUser/${id}`, user).then((x) => x.data);
export const fetchAllUsers = () =>
  http.get('/user/getAllUsers').then((x) => (Array.isArray(x.data) ? x.data : []));
export const deleteUser = (id) => http.delete(`/user/deleteUser/${id}`).then((x) => x.data);

export const fetchAllOwners = () =>
  http.get('/theaterowner/getAllUsers').then((x) => (Array.isArray(x.data) ? x.data : []));
export const fetchOwner = (id) => http.get(`/theaterowner/${id}`).then((x) => x.data);
export const deleteOwner = (id) => http.delete(`/theaterowner/deleteUser/${id}`).then((x) => x.data);

export const sendContactMessage = (payload) => http.post('/contact/send', payload).then((x) => x.data);
