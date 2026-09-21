// Los datos de la tarjeta viajan dentro del enlace (base64url de un JSON),
// así no se necesita base de datos y el mensaje no se ve a simple vista en el chat.
const LIMITS = { p: 40, m: 140, d: 40, lt: 65, l: 650, mem: 1200, c1: 7, c2: 7, img: 22000 };

function toBase64Url(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  let b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function cleanCard(raw) {
  const card = { a: typeof raw?.a === 'string' ? raw.a.slice(0, 60) : '' };
  for (const key of Object.keys(LIMITS)) {
    const value = raw?.[key];
    card[key] = typeof value === 'string'
      ? (key === 'img' ? (/^data:image\/(?:jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length <= LIMITS.img ? value : '')
        : value.replace(key === 'l' ? /[\t ]+/g : /\s+/g, ' ').trim().slice(0, LIMITS[key]))
      : '';
  }
  return card;
}

export function encodeCard(card) {
  const clean = cleanCard(card);
  const payload = { a: clean.a };
  for (const key of Object.keys(LIMITS)) if (clean[key]) payload[key] = clean[key];
  return toBase64Url(JSON.stringify(payload));
}

export function decodeCard(value) {
  if (!value) return null;
  try {
    return cleanCard(JSON.parse(fromBase64Url(value)));
  } catch {
    return null;
  }
}

export function buildShareUrl(card) {
  // Cloudflare Pages sirve las páginas sin ".html"; en local se necesita la extensión.
  const isLocal = /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname) || location.protocol === 'file:';
  const url = new URL(isLocal ? 'v.html' : 'v', location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('s', encodeCard(card));
  return url.toString();
}
