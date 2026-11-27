import axios from 'axios';
import { API_BASE, AUTH_API_BASE_URL, BACKEND } from '../config/env';

const http = axios.create({ baseURL: API_BASE, timeout: 15000 });
const authHttp = AUTH_API_BASE_URL ? axios.create({ baseURL: AUTH_API_BASE_URL, timeout: 15000 }) : http;

// The backend issues a token after the one-time code is verified; it is sent on every request.
export const TOKEN_KEY = 'th_token';
export const REFRESH_TOKEN_KEY = 'th_refresh_token';
const installAuthInterceptors = (client) => {
  client.interceptors.request.use((config) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      const request = err?.config;
      const url = request?.url || '';
      const isAuthStart = /\/(signin|user\/verifyOTP|api\/auth\/(login|verify-otp|refresh))/.test(url);
      if (err?.response?.status === 401 && sessionStorage.getItem(TOKEN_KEY) && !isAuthStart) {
        const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken && request && !request._retry) {
          request._retry = true;
          try {
            const { data } = await authHttp.post('/api/auth/refresh', null, {
              headers: { Authorization: `Bearer ${refreshToken}` },
            });
            if (!data?.token) throw new Error('Refresh did not return an access token.');
            sessionStorage.setItem(TOKEN_KEY, data.token);
            request.headers.Authorization = `Bearer ${data.token}`;
            return client.request(request);
          } catch {
            sessionStorage.removeItem(REFRESH_TOKEN_KEY);
          }
        }
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        sessionStorage.removeItem('user_details');
        window.location.assign('/login');
      }
      return Promise.reject(err);
    }
  );
};
installAuthInterceptors(http);
if (authHttp !== http) installAuthInterceptors(authHttp);

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
  return data?.message || data?.error || (e?.code === 'ERR_NETWORK' ? 'Cannot reach the TicketHub server.' : fallback);
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
export const fetchShowtimes = (movieId, movieTitle = movieId) =>
  AUTH_API_BASE_URL ? fetchCineholdShowtimes(movieTitle) :
    http.get(`/showtimes/movie/${movieId}`).then((x) => (Array.isArray(x.data) ? x.data : []));
export const fetchBookedSeats = (showtimeId) =>
  AUTH_API_BASE_URL
    ? authHttp.get(`/api/show-times/${showtimeId}/booked-seats`).then((x) =>
        (Array.isArray(x.data) ? x.data : []).map((seat) => ({
          ...seat,
          seatNo: String(seat.seat_no || seat.seatNo || '').replace(':', ''),
          status: 'BOOKED',
        }))
      )
    : http.get(`/booked-seats/showtime/${showtimeId}`).then((x) => (Array.isArray(x.data) ? x.data : []));

export const reserveCineholdSeat = (showtimeId, seatNo) =>
  authHttp.post('/api/seats/reserve', {
    show_time_id: showtimeId,
    seat: String(seatNo).replace(/^([A-Z]+)(\d+)$/i, '$1:$2'),
  }).then((x) => x.data);

export const releaseCineholdSeat = (reservationId) =>
  authHttp.delete(`/api/seats/reserve/${reservationId}`);

async function fetchCineholdShowtimes(title) {
  const normalize = (value) => String(value || '').trim().toLocaleLowerCase();
  const { data } = await authHttp.get('/api/movies');
  const matchingMovies = (Array.isArray(data) ? data : []).filter((item) => normalize(item.name) === normalize(title));
  if (matchingMovies.length > 1) {
    throw new Error(`Cinehold has multiple movies titled "${title}"; their showtimes cannot be safely distinguished.`);
  }
  const rows = matchingMovies[0]?.show_times;
  if (!Array.isArray(rows) || !rows.length) return [];

  return Promise.all(rows.map(async (show) => {
    const detail = await authHttp.get(`/api/show-times/${show.id}`).then((x) => x.data);
    const startTime = String(detail.start_time || show.start_time || '');
    const time = startTime.match(/(?:T|^)(\d{2}:\d{2})/)?.[1] || startTime;
    const cinema = detail.cinema || {};
    return {
      id: show.id,
      date: String(detail.start_date || show.start_date || '').slice(0, 10),
      endDate: String(detail.end_date || show.end_date || '').slice(0, 10),
      time,
      amount: Number(detail.price ?? show.price) || 0,
      currency: detail.price_currency || show.price_currency || 'INR',
      format: detail.experience_type || show.experience_type || '',
      totalSeats: Number(cinema.seat_map?.total_seats) || 0,
      seatMap: cinema.seat_map || null,
      theater: { id: cinema.id || detail.cinema_id, name: cinema.name || 'Cinema' },
      movie: {
        title: matchingMovies[0].name,
        poster_path: matchingMovies[0].poster_image_url || null,
        runtime: matchingMovies[0].duration_in_mins || null,
      },
    };
  }));
}

// ── Bookings, payment, tickets ─────────────────────────────────────────────
export const createBooking = (payload) =>
  AUTH_API_BASE_URL
    ? authHttp.post('/api/checkouts', { reservation_ids: payload.reservationIds }).then((x) => x.data)
    : http.post('/bookings/create', payload).then((x) => x.data);
export const fetchBooking = (id) =>
  AUTH_API_BASE_URL
    ? authHttp.get(`/api/checkouts/${id}`).then((x) => x.data)
    : http.get(`/bookings/${id}`).then((x) => x.data);
export const fetchBookingsByUser = (userId) =>
  AUTH_API_BASE_URL
    ? authHttp.get('/api/checkouts').then((x) => x.data || [])
    : http.get(`/bookings/user/${userId}`).then((x) => x.data || []);
export const fetchAllBookings = () =>
  http.get('/bookings/getAllUsers').then((x) => (Array.isArray(x.data) ? x.data : []));
export const cancelBooking = (id) =>
  AUTH_API_BASE_URL
    ? Promise.reject(new Error('Cinehold does not support paid booking cancellation or refunds yet.'))
    : http.delete(`/bookings/deleteUser/${id}`).then((x) => x.data);
export const downloadTicketPdf = (id) =>
  http.get(`/tickets/download/${id}`, { responseType: 'blob' }).then((x) => x.data);

// Spring returns the Razorpay order as JSON; .NET returns just the order id string.
export async function createPaymentOrder(bookingId, amount, foodItems = []) {
  if (AUTH_API_BASE_URL) {
    const { data } = await authHttp.post(`/api/checkouts/${bookingId}/orders`, { food_items: foodItems });
    if (!data?.id) throw new Error('Could not create the payment order.');
    return {
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      mock: Boolean(data.mock),
      key_id: data.key_id,
    };
  }
  const { data } = await http.post(r.payCreate, { bookingId, foodItems });
  if (!data) throw new Error('Could not create the payment order.');
  if (typeof data === 'string') {
    return { id: data, amount: Math.round(amount * 100), currency: 'INR' };
  }
  return { id: data.id, amount: data.amount, currency: data.currency || 'INR', mock: Boolean(data.mock) };
}
export const confirmPayment = (orderId, transactionId, signature) =>
  AUTH_API_BASE_URL
    ? authHttp.post(`/api/checkouts/${orderId}/verify`, {
        razorpay_payment_id: transactionId,
        razorpay_signature: signature,
      }).then((x) => x.data)
    : http.post(r.paySuccess, null, { params: { orderId, transactionId, signature } });

// ── Auth and users ─────────────────────────────────────────────────────────
export const signInWithGoogle = (credential) => http.post('/auth/google', { credential }).then((x) => x.data);

export async function signIn(credentials) {
  const { data } = await authHttp.post(AUTH_API_BASE_URL ? '/api/auth/login' : r.signin, credentials);
  const profile = data?.user || data?.theaterOwner || data?.admin || null;
  return { message: data?.message, profile, token: data?.token };
}
export const verifyOtp = (payload) =>
  authHttp.post(AUTH_API_BASE_URL ? '/api/auth/verify-otp' : '/user/verifyOTP', payload).then((x) => x.data);
export const signUp = (user) =>
  authHttp.post(AUTH_API_BASE_URL ? '/api/auth/signup' : '/user/signup', user).then((x) => x.data);
export const checkEmail = (email) =>
  authHttp.get(AUTH_API_BASE_URL ? '/api/auth/validate-email' : '/user/validateEmail', { params: { email } });
export const checkPhone = (phone) =>
  authHttp.get(AUTH_API_BASE_URL ? '/api/auth/validate-phone' : '/user/validatePhone', { params: { phone } });
export const updateUser = (id, user) => http.put(`/user/updateUser/${id}`, user).then((x) => x.data);
export const fetchAllUsers = () =>
  http.get('/user/getAllUsers').then((x) => (Array.isArray(x.data) ? x.data : []));
export const deleteUser = (id) => http.delete(`/user/deleteUser/${id}`).then((x) => x.data);

export const fetchAllOwners = () =>
  http.get('/theaterowner/getAllUsers').then((x) => (Array.isArray(x.data) ? x.data : []));
export const fetchOwner = (id) => http.get(`/theaterowner/${id}`).then((x) => x.data);
export const deleteOwner = (id) => http.delete(`/theaterowner/deleteUser/${id}`).then((x) => x.data);

export const sendContactMessage = (payload) => http.post('/contact/send', payload).then((x) => x.data);
