// Serialisers: field names match what the Spring API returned, so the UI needs no mapping.
export const userView = (u) => u && ({ id: u.id, name: u.name, email: u.email, phone: u.phone, gender: u.gender, maritalStatus: u.marital_status, dob: u.dob, role: u.role });

export const movieView = (m) => m && ({
  id: m.id, movieId: m.movie_id, title: m.title, overview: m.overview, vote_average: m.vote_average, vote_count: m.vote_count,
  release_date: m.release_date, backdrop_path: m.backdrop_path, poster_path: m.poster_path, status: m.status, tagline: m.tagline,
  revenue: m.revenue, runtime: m.runtime, category: m.category, type: m.type,
});

export const theaterView = (t) => t && ({ id: t.id, name: t.name, location: t.location });

export function ownerView(db, o) {
  if (!o) return o;
  const theaters = db.prepare('SELECT * FROM theaters WHERE owner_id = ?').all(o.id).map(theaterView);
  return { id: o.id, name: o.name, email: o.email, role: o.role, theaters };
}

export const adminView = (a) => a && ({ id: a.id, name: a.name, email: a.email, role: a.role });
