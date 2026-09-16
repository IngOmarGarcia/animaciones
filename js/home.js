import { VISIBLE_ANIMATIONS, CATEGORIES } from './catalog.js';
import { renderGallery } from './gallery.js';
import { renderSupport } from './extras.js';

renderSupport(document.getElementById('support'));

const grid = document.getElementById('grid');
const chips = document.getElementById('chips');
let current = new URLSearchParams(location.search).get('cat') || 'todas';

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
  const list = current === 'todas' ? VISIBLE_ANIMATIONS : VISIBLE_ANIMATIONS.filter((a) => a.category === current);
  renderGallery(grid, list);
}

render();
