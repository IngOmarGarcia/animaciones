import { VISIBLE_ANIMATIONS, CATEGORIES } from './catalog.js';
import { renderGallery, appendGallery, setGalleryPaused, galleryPaused } from './gallery.js';
import { createSupportCard } from './support.js';
import { TURTLE_ANIMATIONS } from './turtle-catalog.js';
import { SEASONAL_ANIMATIONS } from './seasonal-catalog.js';
import { EMOTIONAL_ANIMATIONS } from './emotional-catalog.js';
import { orderHomeCategories } from './home-categories.js';
import { renderGifts } from './extras.js';
import { initAdSlots, disposeAdSlots, setHomeAdDensity } from './ads.js';
import { backParticles } from './back-particles.js';

const support = createSupportCard();
if (support) document.getElementById('support').append(support);

const grid = document.getElementById('grid');
const chips = document.getElementById('chips');
const sideCategories = document.getElementById('side-categories');
const products = document.getElementById('home-products');
const more = document.getElementById('gallery-more');
const pageStatus = document.getElementById('gallery-page-status');
// Los dos lotes recientes primero; el resto conserva su orden editorial.
const recentIds = new Set([...EMOTIONAL_ANIMATIONS,...TURTLE_ANIMATIONS, ...SEASONAL_ANIMATIONS].map(a=>a.id));
const homeAnimations = [...EMOTIONAL_ANIMATIONS,...VISIBLE_ANIMATIONS.filter(a=>a.cinematic),...TURTLE_ANIMATIONS, ...SEASONAL_ANIMATIONS, ...VISIBLE_ANIMATIONS.filter(a=>!a.cinematic&&!recentIds.has(a.id))].filter(a=>!a.hidden);
let current = new URLSearchParams(location.search).get('cat') || 'todas';
if (!CATEGORIES.some(c=>c.id===current)) current='todas';
let list = [];
let loaded = 0, loading = false, renderVersion = 0;
const BATCH = 40;
const orderedCategories = orderHomeCategories(CATEGORIES, VISIBLE_ANIMATIONS);

function updateLoadStatus() {
  more.hidden = loaded >= list.length;
  more.disabled = loading;
  more.textContent = loading ? 'Cargando animaciones…' : `Cargar ${Math.min(BATCH, list.length - loaded)} animaciones más`;
  pageStatus.textContent = list.length ? `Mostrando 1–${loaded} de ${list.length} animaciones` : 'No hay animaciones en esta categoría';
  grid.setAttribute('aria-busy', String(loading));
}
function addFeedAd(afterCard, position) {
  const ad = document.createElement('aside');
  ad.className = 'ad-slot feed-ad';ad.dataset.adPlacement = 'home-feed';ad.dataset.afterAnimation = position;
  afterCard.after(ad);
}
function renderFirstBatch() {
  renderVersion++;loading = false;loaded = Math.min(BATCH, list.length);
  disposeAdSlots(grid);
  renderGallery(grid, list.slice(0, loaded));
  const cards = [...grid.children];
  for (let position = 10; position < cards.length; position += 10) {
    addFeedAd(cards[position - 1], position);
  }
  initAdSlots(grid);
  updateLoadStatus();
}

async function loadMore() {
  if (loading || loaded >= list.length) return;
  const version = renderVersion, start = loaded, end = Math.min(loaded + BATCH, list.length);
  const separator = document.createElement('aside');
  separator.className = 'ad-slot batch-ad';separator.dataset.adPlacement = 'home-batch';separator.dataset.afterAnimation = loaded;
  loading = true;updateLoadStatus();
  const preservePosition = mutate => {
    const x = scrollX, y = scrollY;
    mutate();
    // Insertion above the load button must not anchor the viewport to it.
    grid.getBoundingClientRect();
    window.scrollTo({left:x, top:y, behavior:'instant'});
  };
  preservePosition(() => { grid.append(separator);initAdSlots(grid); });
  for (let position = start; position < end; position += 10) {
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (version !== renderVersion) return;
    const chunkEnd = Math.min(position + 10, end);
    preservePosition(() => {
      appendGallery(grid, list.slice(position, chunkEnd));
      if (position === start && document.activeElement === more) {
        separator.nextElementSibling?.querySelector('a')?.focus({preventScroll:true});
      }
      loaded = chunkEnd;
      if (chunkEnd < end) addFeedAd(grid.lastElementChild, chunkEnd);
      initAdSlots(grid);
    });
  }
  loading = false;updateLoadStatus();
}
more.addEventListener('click', loadMore);

function render() {
  const scrollLeft = chips.scrollLeft;
  chips.replaceChildren(...orderedCategories.map((cat) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.setAttribute('aria-pressed', String(cat.id === current));
    chip.dataset.category = cat.id;
    chip.title = `${cat.count} animaciones`;
    chip.textContent = cat.name;
    chip.addEventListener('click', () => {
      current = cat.id;
      render();
      const selected=chips.querySelector('[aria-pressed="true"]');
      selected.focus({preventScroll:true});
      selected.scrollIntoView({block:'nearest',inline:'nearest'});
    });
    return chip;
  }));
  chips.scrollLeft = scrollLeft;
  sideCategories.replaceChildren(...orderedCategories.map(cat => {
    const button = document.createElement('a');button.className = 'side-category';
    button.href = cat.id === 'todas' ? '/animaciones.html' : `/categorias/${cat.id}.html`;
    button.setAttribute('role','button');
    button.dataset.category = cat.id;button.setAttribute('aria-pressed', String(cat.id === current));
    const name = document.createElement('span');name.textContent = cat.name;
    const count = document.createElement('small');count.textContent = cat.count;
    button.append(name, count);
    button.addEventListener('keydown', event => { if(event.key === ' '){event.preventDefault();button.click();} });
    button.addEventListener('click', event => {
      if(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      current = cat.id;render();
      const selected = chips.querySelector('[aria-pressed="true"]');
      selected.focus({preventScroll:true});selected.scrollIntoView({block:'center',inline:'nearest'});
    });
    return button;
  }));
  list = current === 'todas' ? homeAnimations : homeAnimations.filter((a) => a.category === current);
  renderGifts(products, current, { autoplay: true, all: current === 'todas', limit: list.length<4?0:list.length<10?3:Infinity });
  renderFirstBatch();
  setHomeAdDensity(list.length);
}

render();
const motion=document.getElementById('homeMotion');
const motionLabel=()=>{motion.textContent=galleryPaused()?'Animar miniaturas':'Pausar miniaturas';motion.setAttribute('aria-pressed',String(galleryPaused()));};
motion.addEventListener('click',()=>{setGalleryPaused(!galleryPaused(),{userInitiated:true});motionLabel();});motionLabel();

const backToGallery=document.getElementById('back-to-gallery');
const particleButton=backParticles(backToGallery);
const sidePanel=document.getElementById('category-rail');
sidePanel.hidden=false;sidePanel.inert=true;sidePanel.setAttribute('aria-hidden','true');
const heading=document.querySelector('.gallery-head');
const backVisibility=new IntersectionObserver(entries=>{
  backToGallery.hidden=entries[0].boundingClientRect.bottom>=100;
  const show=!backToGallery.hidden;
  if(!show&&sidePanel.contains(document.activeElement))document.getElementById('gallery-title').focus({preventScroll:true});
  sidePanel.classList.toggle('is-visible',show);sidePanel.inert=!show;sidePanel.setAttribute('aria-hidden',String(!show));
  particleButton.setVisible(!backToGallery.hidden);
},{rootMargin:'-100px 0px 0px 0px'});
backVisibility.observe(heading);
backToGallery.addEventListener('click',()=>{
  document.getElementById('gallery-title').focus({preventScroll:true});
});
const alignRail = () => {
  document.querySelector('main').style.setProperty('--home-rail-start', `${document.getElementById('galeria').offsetTop + heading.offsetHeight + 24}px`);
};
new ResizeObserver(alignRail).observe(heading);window.addEventListener('resize',alignRail);alignRail();
