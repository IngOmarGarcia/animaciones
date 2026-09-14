import { SITE, GIFTS } from './config.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function contactHref(message) {
  if (SITE.whatsapp) return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
  return `mailto:${SITE.email}?subject=${encodeURIComponent('Animación personalizada')}&body=${encodeURIComponent(message)}`;
}

const shuffle = (list) => list
  .map((item) => [Math.random(), item])
  .sort((a, b) => a[0] - b[0])
  .map(([, item]) => item);

// Foto del producto; si no hay o no carga, se queda el emoji.
function giftVisual(gift) {
  const emoji = el('span', 'gift-emoji', gift.emoji);
  if (!gift.image) return emoji;
  const frame = el('span', 'gift-img');
  const img = document.createElement('img');
  img.src = gift.image;
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('error', () => frame.replaceWith(emoji), { once: true });
  frame.append(img);
  return frame;
}

// Bloque de regalos con enlaces de afiliado: 4 al azar, primero los de la categoría de la animación.
export function renderGifts(container, category) {
  const items = [
    ...shuffle(GIFTS.filter((g) => g.category === category)),
    ...shuffle(GIFTS.filter((g) => g.category === 'todas')),
  ].slice(0, 4);
  if (!items.length) {
    container.hidden = true;
    return;
  }
  const grid = el('div', 'gifts');
  for (const gift of items) {
    const link = el('a', 'gift');
    link.href = gift.url;
    link.target = '_blank';
    link.rel = 'sponsored noopener';
    link.append(giftVisual(gift), el('span', 'gift-title', gift.title), el('span', 'gift-cta', 'Ver en Mercado Libre →'));
    grid.append(link);
  }
  container.replaceChildren(
    el('h2', 'gifts-title', '🎁 ¿Quieres regalar algo de verdad?'),
    grid,
    el('p', 'gifts-note', 'Enlaces de afiliado: si compras, podemos recibir una pequeña comisión sin costo extra para ti.'),
  );
}

// Tarjeta de encargos personalizados + botón de donación (si está configurado).
export function renderSupport(container) {
  const promo = el('a', 'promo');
  promo.href = 'encargos.html';
  const text = el('span', 'promo-text');
  text.append(
    el('strong', '', 'Animación personalizada con su foto'),
    el('span', '', `Hecha especialmente para esa persona · ${SITE.customOrderPrice}`),
  );
  promo.append(el('span', 'promo-emoji', '✨'), text, el('span', 'promo-arrow', '→'));

  const parts = [promo];
  if (SITE.donationUrl) {
    const wrap = el('p', 'support-donate');
    const donate = el('a', 'btn', '☕ ¿Te gustó? Invítame un café');
    donate.href = SITE.donationUrl;
    donate.target = '_blank';
    donate.rel = 'noopener';
    wrap.append(donate);
    parts.push(wrap);
  }
  container.replaceChildren(...parts);
}
