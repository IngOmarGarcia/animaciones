import { SITE, GIFTS } from './config.js';
import { createSupportCard } from './support.js';

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
  img.src = '/img/mercadolibre.svg';
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

export function giftsForCategory(category) {
  const matching = GIFTS.filter(g => g.category === category || g.categories?.includes(category));
  // Las recomendaciones de temporada quedan limitadas a esas escenas.
  if (category === 'halloween' || category === 'muertos') return shuffle(matching);
  return [...shuffle(matching), ...shuffle(GIFTS.filter(g => g.category === 'todas' && g.category !== category))];
}

// Carrusel de regalos con enlaces de afiliado relacionados con la categoría.
// Se marca claramente como Mercado Libre para que no se confunda con las funciones del sitio.
const giftCleanup = new WeakMap();
export function renderGifts(container, category, { autoplay = false, all = false, limit = Infinity } = {}) {
  giftCleanup.get(container)?.();
  const items = (all ? shuffle([...new Map(GIFTS.map(gift => [gift.url, gift])).values()]) : giftsForCategory(category)).slice(0,limit);
  if (!items.length) {
    container.hidden = true;
    return;
  }
  container.hidden = false;

  const track = el('div', 'gifts');
  for (const gift of items) {
    const link = el('a', 'gift');
    link.title = gift.title;
    link.setAttribute('aria-label', `${gift.title} · Ver en Mercado Libre`);
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
  const resize = new ResizeObserver(updateArrows);resize.observe(track);

  const title = el('h2', 'gifts-title');
  title.append(mlIcon(28), 'Productos de Mercado Libre');
  const heading = el('div');
  const label = category === 'halloween' ? '🎃 Ideas para tu celebración de Halloween' : category === 'muertos' ? '🕯️ Ideas para celebrar el Día de Muertos' : '🎁 Ideas para acompañar esta animación';
  heading.append(el('p', 'gifts-kicker', label), title,
    el('p', 'gifts-context', 'Recomendaciones de ViralCss · Al elegir un producto, abres Mercado Libre en otra pestaña.'));
  const nav = el('div', 'gifts-nav');
  nav.append(prev, next);
  const head = el('div', 'gifts-head');
  head.append(heading, nav);

  container.replaceChildren(
    head,
    track,
    el('p', 'gifts-note', 'Productos vendidos en Mercado Libre, no por ViralCss. Son enlaces de afiliado: si compras, podemos recibir una pequeña comisión sin costo extra para ti.'),
  );
  const abort = new AbortController(), signal = abort.signal;
  let timer, observer;
  if (autoplay && items.length > 1) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reduced.matches, visible = false, hover = false, touching = false, manualUntil = 0, automaticUntil = 0;
    const toggle = arrow('Pausar carrusel automático', 'Pausar');
    toggle.className = 'gifts-toggle';
    nav.prepend(toggle);
    const update = () => { toggle.textContent = paused ? 'Reproducir' : 'Pausar';toggle.setAttribute('aria-label', paused ? 'Reproducir carrusel automático' : 'Pausar carrusel automático'); };
    const schedule = () => {
      clearInterval(timer);
      if (!visible || document.hidden || paused) return;
      timer = setInterval(() => {
        if (hover || touching || container.contains(document.activeElement) || Date.now() < manualUntil) return;
        const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
        automaticUntil = Date.now() + 1000;
        track.scrollTo({ left: end ? 0 : track.scrollLeft + (track.firstElementChild?.getBoundingClientRect().width || 220) + 14, behavior: reduced.matches ? 'instant' : 'smooth' });
      }, 4500);
    };
    toggle.addEventListener('click', () => { paused = !paused;update();schedule(); }, { signal });
    container.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; }, { signal });
    container.addEventListener('pointerleave', () => { hover = false;touching = false; }, { signal });
    container.addEventListener('pointerdown', () => { touching = true;manualUntil = Date.now() + 8000; }, { signal });
    window.addEventListener('pointerup', () => { touching = false; }, { signal });
    container.addEventListener('pointercancel', () => { touching = false; }, { signal });
    track.addEventListener('scroll', () => { if (Date.now() > automaticUntil) manualUntil = Date.now() + 8000; }, { signal, passive: true });
    document.addEventListener('visibilitychange', schedule, { signal });
    reduced.addEventListener('change', e => { if (e.matches) paused = true;update();schedule(); }, { signal });
    observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting;schedule(); }, { threshold: .15 });
    observer.observe(container);update();
  }
  giftCleanup.set(container, () => { abort.abort();resize.disconnect();observer?.disconnect();clearInterval(timer); });
}

// Tarjeta de encargos personalizados + donación voluntaria (si está configurada).
export function renderSupport(container) {
  const promo = el('a', 'promo');
  promo.href = 'encargos.html';
  const text = el('span', 'promo-text');
  text.append(
    el('strong', '', 'Animación personalizada con su foto'),
    el('span', '', `Hecha especialmente para esa persona · ${SITE.customOrderPrice}`),
  );
  promo.append(el('span', 'promo-emoji', '✨'), text, el('span', 'promo-arrow', '→'));

  const donation = createSupportCard();
  container.replaceChildren(...(donation ? [promo, donation] : [promo]));
}
