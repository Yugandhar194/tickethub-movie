// The Spring booking response does not include seat labels, so the seats chosen in this browser are
// remembered locally to render tickets. Other devices show the seat count only.
const key = (id) => `th:booking:${id}`;

export function saveBookingMeta(id, meta) {
  try {
    localStorage.setItem(key(id), JSON.stringify({ ...meta, savedAt: Date.now() }));
  } catch {
    /* storage can be unavailable (private mode); the ticket still renders without seat labels */
  }
}

export function loadBookingMeta(id) {
  try {
    return JSON.parse(localStorage.getItem(key(id)) || 'null');
  } catch {
    return null;
  }
}

// The backend has no "get showtime by id" call, so the showtime picked on the movie page travels with the user.
export function rememberShowtime(show) {
  try {
    sessionStorage.setItem(`th:showtime:${show.id}`, JSON.stringify(show));
  } catch {
    /* ignore */
  }
}

export function recallShowtime(id) {
  try {
    return JSON.parse(sessionStorage.getItem(`th:showtime:${id}`) || 'null');
  } catch {
    return null;
  }
}
