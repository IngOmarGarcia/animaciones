import { VISIBLE_ANIMATIONS, CATEGORIES } from './catalog.js';
import { renderGallery, setGalleryPaused, galleryPaused } from './gallery.js';
import { createSupportCard } from './support.js';
import { TURTLE_ANIMATIONS } from './turtle-catalog.js';
import { SEASONAL_ANIMATIONS } from './seasonal-catalog.js';

const support = createSupportCard();
if (support) document.getElementById('support').append(support);

const grid = document.getElementById('grid');
const chips = document.getElementById('chips');
const more = document.getElementById('gallery-more');
const previous = document.getElementById('gallery-previous');
const pageStatus = document.getElementById('gallery-page-status');
// Los dos lotes recientes primero; el resto conserva su orden editorial.
const recentIds = new Set([...TURTLE_ANIMATIONS, ...SEASONAL_ANIMATIONS].map(a=>a.id));
const homeAnimations = [...VISIBLE_ANIMATIONS.filter(a=>a.cinematic),...TURTLE_ANIMATIONS, ...SEASONAL_ANIMATIONS, ...VISIBLE_ANIMATIONS.filter(a=>!a.cinematic&&!recentIds.has(a.id))].filter(a=>!a.hidden);
let current = new URLSearchParams(location.search).get('cat') || 'todas';
if (!CATEGORIES.some(c=>c.id===current)) current='todas';
let list = [];
let page = 0;
const BATCH = 40;

function renderPage() {
  const start = page * BATCH, end = Math.min(start + BATCH, list.length);
  renderGallery(grid, list.slice(start, end));
  previous.hidden = page === 0;
  more.hidden = end >= list.length;
  more.textContent = `Ver las siguientes ${Math.min(BATCH, list.length - end)}`;
  pageStatus.textContent = list.length ? `Mostrando ${start + 1}–${end} de ${list.length} animaciones` : 'No hay animaciones en esta categoría';
}

function changePage(direction) {
  const next = page + direction;
  if(next < 0 || next * BATCH >= list.length) return;
  page = next;
  renderPage();
  const heading = document.getElementById('gallery-title');
  heading.focus({preventScroll:true});
  heading.scrollIntoView({block:'start'});
}
more.addEventListener('click', () => changePage(1));
previous.addEventListener('click', () => changePage(-1));

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
  list = current === 'todas' ? homeAnimations : homeAnimations.filter((a) => a.category === current);
  const guide=document.getElementById('categoryGuide');
  const link=document.createElement('a');link.href=current==='todas'?'/animaciones.html':`/categorias/${current}.html`;link.textContent=current==='todas'?'Comparar por interacción, colores o cartas →':'Ver la guía para elegir en esta categoría →';guide.replaceChildren(link);
  page = 0;
  renderPage();
}

render();
const motion=document.getElementById('homeMotion');
const motionLabel=()=>{motion.textContent=galleryPaused()?'Animar miniaturas':'Pausar miniaturas';motion.setAttribute('aria-pressed',String(galleryPaused()));};
motion.addEventListener('click',()=>{setGalleryPaused(!galleryPaused(),{userInitiated:true});motionLabel();});motionLabel();
