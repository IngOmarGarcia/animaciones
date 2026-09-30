import { VISIBLE_ANIMATIONS, CATEGORIES } from './catalog.js';
import { renderGallery, appendGallery, setGalleryPaused, galleryPaused } from './gallery.js';
import { createSupportCard } from './support.js';

const support = createSupportCard();
if (support) document.getElementById('support').append(support);

const grid = document.getElementById('grid');
const chips = document.getElementById('chips');
const sentinel = document.getElementById('gallery-sentinel');
const more = document.getElementById('gallery-more');
let current = new URLSearchParams(location.search).get('cat') || 'todas';
if (!CATEGORIES.some(c=>c.id===current)) current='todas';
let list = [];
let shown = 0;
const BATCH = 16;
const initialCount = () => matchMedia('(max-width: 719px)').matches ? 8 : 12;

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
    chip.setAttribute('aria-pressed', String(cat.id === current));
    chip.textContent = cat.name;
    chip.addEventListener('click', () => {
      current = cat.id;
      render();
      chips.querySelectorAll('button')[CATEGORIES.findIndex(c=>c.id===current)].focus();
    });
    return chip;
  }));
  list = current === 'todas' ? VISIBLE_ANIMATIONS : VISIBLE_ANIMATIONS.filter((a) => a.category === current);
  const guide=document.getElementById('categoryGuide');
  const link=document.createElement('a');link.href=current==='todas'?'/animaciones.html':`/categorias/${current}.html`;link.textContent=current==='todas'?'Comparar por interacción, colores o cartas →':'Ver la guía para elegir en esta categoría →';guide.replaceChildren(link);
  shown = Math.min(initialCount(), list.length);
  loader.unobserve(sentinel);
  renderGallery(grid, list.slice(0, shown));
  const hasMore = shown < list.length;
  more.hidden = !hasMore;
  sentinel.hidden = !hasMore;
  if (hasMore) loader.observe(sentinel);
}

render();
const motion=document.getElementById('homeMotion');
const motionLabel=()=>{motion.textContent=galleryPaused()?'Animar miniaturas':'Pausar miniaturas';motion.setAttribute('aria-pressed',String(galleryPaused()));};
motion.addEventListener('click',()=>{setGalleryPaused(!galleryPaused());motionLabel();});motionLabel();
