import { getAnimation, getCategory } from './catalog.js';
import { createPlayer } from './anim/engine.js';

// Las vistas previas solo se animan mientras están en pantalla.
const players = new WeakMap();
const visible = new WeakSet();

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const card = entry.target;
    if (entry.isIntersecting) {
      visible.add(card);
      activate(card);
    } else {
      visible.delete(card);
      players.get(card)?.pause();
    }
  }
}, { rootMargin: '80px' });

async function activate(card) {
  let player = players.get(card);
  if (!player) {
    if (card.dataset.loading) return;
    card.dataset.loading = '1';
    const anim = getAnimation(card.dataset.id);
    try {
      const mod = await anim.load();
      player = createPlayer(card.querySelector('canvas'), mod.default, { loop: anim.previewLoop, preview: true });
      players.set(card, player);
    } catch (err) {
      console.error('No se pudo cargar la animación', anim.id, err);
      return;
    } finally {
      delete card.dataset.loading;
    }
  }
  if (visible.has(card) && card.isConnected) player.play();
}

function createCard(anim) {
  const card = document.createElement('a');
  card.className = 'card';
  card.href = `crear.html?a=${encodeURIComponent(anim.id)}`;
  card.dataset.id = anim.id;

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = getCategory(anim.category)?.name ?? '';
  thumb.append(canvas, badge);

  const body = document.createElement('div');
  body.className = 'card-body';
  const title = document.createElement('h3');
  title.textContent = anim.title;
  const desc = document.createElement('p');
  desc.textContent = anim.description;
  body.append(title, desc);

  card.append(thumb, body);
  return card;
}

export function clearGallery(container) {
  for (const old of container.querySelectorAll('.card')) {
    observer.unobserve(old);
    players.get(old)?.destroy();
  }
  container.replaceChildren();
}

export function appendGallery(container, animations) {
  const cards = animations.map(createCard);
  container.append(...cards);
  for (const card of cards) observer.observe(card);
}

export function renderGallery(container, animations) {
  clearGallery(container);
  appendGallery(container, animations);
}
