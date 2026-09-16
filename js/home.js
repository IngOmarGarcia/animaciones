import { VISIBLE_ANIMATIONS, CATEGORIES } from './catalog.js';
import { renderGallery, appendGallery } from './gallery.js';
import { renderSupport } from './extras.js';

renderSupport(document.getElementById('support'));

const grid = document.getElementById('grid');
const chips = document.getElementById('chips');
const sentinel = document.getElementById('gallery-sentinel');
const more = document.getElementById('gallery-more');
let current = new URLSearchParams(location.search).get('cat') || 'todas';
let list = [];
let shown = 0;
const BATCH = 16;
const initialCount = () => matchMedia('(max-width: 719px)').matches ? 16 : 32;

function loadNext() {
  if (shown >= list.length) return;
  const next = list.slice(shown, shown + BATCH);
  appendGallery(grid, next);
  shown += next.length;
  more.hidden = shown >= list.length;
  sentinel.hidden = shown >= list.length;
  if (sentinel.hidden) loader.unobserve(sentinel);
}

const loader = new IntersectionObserver((entries) => {
  if (entries.some((entry) => entry.isIntersecting)) loadNext();
}, { rootMargin: '0px 0px 80px 0px' });
more.addEventListener('click', loadNext);

function render() {
  chips.replaceChildren(...CATEGORIES.map((cat) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.setAttribute('role', 'tab');
    chip.setAttribute('aria-selected', String(cat.id === current));
    chip.textContent = cat.name;
    chip.addEventListener('click', () => {
      current = cat.id;
      render();
    });
    return chip;
  }));
  list = current === 'todas' ? VISIBLE_ANIMATIONS : VISIBLE_ANIMATIONS.filter((a) => a.category === current);
  shown = Math.min(initialCount(), list.length);
  loader.unobserve(sentinel);
  renderGallery(grid, list.slice(0, shown));
  const hasMore = shown < list.length;
  more.hidden = !hasMore;
  sentinel.hidden = !hasMore;
  if (hasMore) loader.observe(sentinel);
}

render();
