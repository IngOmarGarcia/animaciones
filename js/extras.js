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

function mlIcon(size) {
  const img = document.createElement('img');
  img.src = 'img/mercadolibre.svg';
  img.alt = '';
  img.width = size;
  img.height = size;
  return img;
}

function arrow(label, symbol) {
  const button = el('button', 'gifts-arrow', symbol);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  return button;
}

// Carrusel de regalos con enlaces de afiliado: todos al azar, primero los de la categoría de la animación.
// Se marca claramente como Mercado Libre para que no se confunda con las funciones del sitio.
export function renderGifts(container, category) {
  const items = [
    ...shuffle(GIFTS.filter((g) => g.category === category)),
    ...shuffle(GIFTS.filter((g) => g.category === 'todas')),
  ];
  if (!items.length) {
    container.hidden = true;
    return;
  }

  const track = el('div', 'gifts');
  for (const gift of items) {
    const link = el('a', 'gift');
    link.href = gift.url;
    link.target = '_blank';
    link.rel = 'sponsored noopener';
    const cta = el('span', 'gift-cta');
    cta.append(mlIcon(16), 'Ver en Mercado Libre →');
    link.append(giftVisual(gift), el('span', 'gift-title', gift.title), cta);
    track.append(link);
  }

  const prev = arrow('Productos anteriores', '‹');
  const next = arrow('Más productos', '›');
  const page = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: 'smooth' });
  const updateArrows = () => {
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  prev.addEventListener('click', () => page(-1));
  next.addEventListener('click', () => page(1));
  track.addEventListener('scroll', updateArrows, { passive: true });
  new ResizeObserver(updateArrows).observe(track);

  const title = el('h2', 'gifts-title');
  title.append(mlIcon(28), 'Mira estos productos de Mercado Libre');
  const heading = el('div');
  heading.append(el('p', 'gifts-kicker', '🎁 ¿Quieres regalar algo de verdad?'), title);
  const nav = el('div', 'gifts-nav');
  nav.append(prev, next);
  const head = el('div', 'gifts-head');
  head.append(heading, nav);

  container.replaceChildren(
    head,
    track,
    el('p', 'gifts-note', 'Productos vendidos en Mercado Libre, no por ViralCss. Son enlaces de afiliado: si compras, podemos recibir una pequeña comisión sin costo extra para ti.'),
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
