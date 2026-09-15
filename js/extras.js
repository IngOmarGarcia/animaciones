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

// CLABE en bloques de banco, plaza, cuenta y dígito verificador.
const formatClabe = (digits) => digits.replace(/^(\d{3})(\d{3})(\d{11})(\d)$/, '$1 $2 $3 $4');

// Donación voluntaria por transferencia (CLABE) o link de pago; null si no está configurada.
function renderDonation() {
  const { clabe = '', holder = '', bank = '', url = '' } = SITE.donation || {};
  const digits = clabe.replace(/\D/g, '');
  if (!digits && !url) return null;

  const box = el('section', 'donate');
  box.id = 'apoyar';
  box.append(
    el('h2', 'donate-title', '☕ ¿Te gustó? Apoya a ViralCss'),
    el('p', 'donate-text', 'Todo el sitio es gratis. Si quieres ayudarnos a seguir haciendo animaciones, puedes donar la cantidad que quieras. Es totalmente voluntario.'),
  );

  if (digits) {
    const number = el('code', 'donate-number', formatClabe(digits));
    const info = el('div', 'donate-info');
    info.append(el('span', 'donate-label', `Transferencia a CLABE ${bank}`.trim()), number);
    if (holder) info.append(el('span', 'donate-label', `A nombre de ${holder}`));
    const copy = el('button', 'btn', 'Copiar CLABE');
    copy.type = 'button';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(digits);
      } catch {
        const range = document.createRange();
        range.selectNodeContents(number);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
        document.execCommand('copy');
      }
      copy.textContent = '¡Copiada!';
      setTimeout(() => { copy.textContent = 'Copiar CLABE'; }, 2000);
    });
    const row = el('div', 'donate-row');
    row.append(info, copy);
    box.append(row);
  }

  if (url) {
    const link = el('a', 'btn btn-primary', 'Donar con tarjeta');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    box.append(link);
  }
  return box;
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

  const donation = renderDonation();
  container.replaceChildren(...(donation ? [promo, donation] : [promo]));
}
