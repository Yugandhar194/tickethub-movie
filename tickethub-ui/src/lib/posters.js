const TMDB_IMG = 'https://image.tmdb.org/t/p';

export function img(path, size = 'w342') {
  if (!path) return null;
  if (/^(data:|https?:|\/\/)/.test(path)) return path;
  return `${TMDB_IMG}/${size}/${String(path).replace(/^\/+/, '')}`;
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function wrap(title, max = 13, lines = 4) {
  const words = String(title).split(/\s+/);
  const out = [];
  let line = '';
  words.forEach((w) => {
    if ((line + ' ' + w).trim().length > max && line) {
      out.push(line);
      line = w;
    } else {
      line = (line + ' ' + w).trim();
    }
  });
  if (line) out.push(line);
  return out.slice(0, lines);
}

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Reliable offline poster: a dark gradient tinted from the title, with the title set in the frame.
export function posterFallback(title = 'TicketHub', width = 400, height = 600, showTitle = true) {
  const seed = hash(title);
  const tints = [
    ['#2a0a14', '#E11D48'],
    ['#2b1a05', '#F59E0B'],
    ['#1a1030', '#7C3AED'],
    ['#06242b', '#0891B2'],
    ['#1c1917', '#A8A29E'],
  ];
  const [dark, light] = tints[seed % tints.length];
  const lines = wrap(title);
  const size = Math.round(width * 0.105);
  const startY = height * 0.62 - ((lines.length - 1) * size * 1.15) / 2;
  const text = !showTitle ? '' : lines
    .map(
      (l, i) =>
        `<text x="${width * 0.08}" y="${startY + i * size * 1.15}" font-family="Plus Jakarta Sans, Inter, sans-serif" font-weight="800" font-size="${size}" fill="#FAFAFA">${escapeXml(l)}</text>`
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="#09090B"/></linearGradient><radialGradient id="r" cx="0.8" cy="0.15" r="0.7"><stop offset="0" stop-color="${light}" stop-opacity="0.55"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#r)"/><rect x="${width * 0.06}" y="${height * 0.06}" width="${width * 0.88}" height="${height * 0.88}" rx="${width * 0.04}" fill="none" stroke="#FAFAFA" stroke-opacity="0.12"/>${text}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Wide frames carry no text: the page already prints the title next to them.
export const backdropFallback = (title) => posterFallback(title, 1280, 720, false);
