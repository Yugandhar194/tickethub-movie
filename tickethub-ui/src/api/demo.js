// Offline sample catalogue, used only when neither TMDB nor the TicketHub backend can be reached.
// Titles, people and figures are invented so they cannot be mistaken for real releases or real box office.
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dd}`;
};

const base = [
  ['The Last Lighthouse', 'Thriller', 'en', 126, 7.8, 5120, 412_000_000, 90_000_000, -34, 'A keeper on a storm-lashed rock realises the ships he guides home are not all heading for harbour.'],
  ['Neon Monsoon', 'Action', 'hi', 148, 7.1, 8830, 366_000_000, 70_000_000, -27, 'Over one night of rain in a flooded megacity, a courier races a rogue algorithm to the last working train.'],
  ['Paper Kingdoms', 'Animation', 'en', 102, 8.2, 12044, 331_000_000, 110_000_000, -41, 'Two siblings fold a map into a world and discover the borders are alive.'],
  ['Saffron Skies', 'Romance', 'hi', 134, 7.4, 3902, 198_000_000, 28_000_000, -20, 'A pilot and a kite maker trade letters across a city that is always about to change.'],
  ['Ghost Frequency', 'Horror', 'en', 109, 6.9, 4410, 176_000_000, 12_000_000, -13, 'A late-night radio host starts taking calls from listeners who have never been born.'],
  ['Harbor Lights', 'Drama', 'en', 117, 7.6, 2480, 121_000_000, 22_000_000, -9, 'Three generations of a fishing family fight to keep their pier open for one more season.'],
  ['Iron Orchard', 'Science Fiction', 'en', 139, 7.3, 6120, 88_000_000, 135_000_000, -5, 'On a terraformed moon, a botanist finds the trees are rebuilding the colony in their own image.'],
  ['Velvet Hour', 'Comedy', 'ta', 121, 6.8, 1890, 42_000_000, 15_000_000, -3, 'A struggling jazz club has seven days to win over the one critic who closed down its rivals.'],
  ['Tide of Embers', 'Adventure', 'en', 151, 0, 0, 0, 160_000_000, 6, 'An expedition follows a river of fire to a lost city beneath a volcano.'],
  ['Quiet Machines', 'Mystery', 'en', 113, 0, 0, 0, 40_000_000, 13, 'A repair technician starts hearing the same sentence from every appliance she fixes.'],
];

const cast = [
  ['Mira Halden', 'Arjun Vale', 'Tessa Orwell', 'Kabir Anand'],
  ['Ines Carrow', 'Dev Malhotra', 'Soren Platt', 'Anaya Roy'],
];

export const DEMO_MOVIES = base.map(([title, genre, language, runtime, rating, votes, revenue, budget, offset, overview], i) => ({
  id: `d${i + 1}`,
  tmdbId: null,
  localId: null,
  title,
  overview,
  tagline: '',
  poster: null,
  backdrop: null,
  rating,
  votes,
  releaseDate: day(offset),
  runtime,
  genres: [genre],
  language,
  revenue,
  budget,
  status: offset > 0 ? 'Post Production' : 'Released',
  popularity: 100 - i * 7,
  imdbId: '',
  source: 'demo',
  cast: cast[i % 2].map((name, n) => ({ id: `${i}-${n}`, name, character: '', photo: null })),
  director: 'Demo Director',
  trailerKey: '',
}));
