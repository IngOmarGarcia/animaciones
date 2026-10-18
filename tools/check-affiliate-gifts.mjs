import assert from 'node:assert/strict';
import { GIFTS } from '../js/config.js';
import { giftsForCategory } from '../js/extras.js';
import { CATEGORIES } from '../js/catalog.js';

const seasonal = GIFTS.filter(g => g.categories);
assert.equal(seasonal.length, 20);
assert.equal(new Set(GIFTS.map(g => g.url)).size, GIFTS.length);
for (const category of ['halloween', 'muertos']) {
  const selected = giftsForCategory(category);
  assert.equal(selected.length, category === 'halloween' ? 15 : 7);
  assert(selected.every(g => g.categories.includes(category)));
}
for (const gift of seasonal) {
  assert(gift.title && !gift.title.includes('opción'), gift.url);
  assert(gift.image?.startsWith('https://http2.mlstatic.com/'), gift.url);
}
assert(!giftsForCategory('muertos').some(g => /Leatherface|Ghost Face|Prisionero|Monja/i.test(g.title)));
assert(!giftsForCategory('halloween').some(g => /Cempasúchil|Papel Picado|Catrin Catrina/i.test(g.title)));
for (const { id } of CATEGORIES.filter(c => !['halloween', 'muertos'].includes(c.id))) {
  const selected = giftsForCategory(id);
  assert(!selected.some(g => seasonal.includes(g)), `Productos de temporada en ${id}`);
  assert.equal(new Set(selected.map(g => g.url)).size, selected.length);
}
for (const route of ['/animaciones/haunted-night.html', '/animaciones/ofrenda-de-luz.html', '/js/detail.js', '/img/mercadolibre.svg']) {
  const response = await fetch(`http://127.0.0.1:8080${route}`);
  assert.equal(response.status, 200, route);
}
console.log('OK: 20 enlaces únicos; selección por categoría sin filtraciones ni duplicados; localhost disponible.');
