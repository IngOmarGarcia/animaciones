import { ANIMATIONS, getAnimation } from './catalog.js';
import { buildShareUrl, cleanCard, encodeCard } from './share.js';
import { fillOverlay } from './overlay.js';
import { renderGallery } from './gallery.js';
import { createPlayer } from './anim/engine.js';
import { renderGifts, renderSupport } from './extras.js';

const DRAFT_KEY = 'detallito-borrador';

const anim = getAnimation(new URLSearchParams(location.search).get('a')) || ANIMATIONS[0];
const $ = (id) => document.getElementById(id);
const form = $('form');
const fields = form.elements;
const overlay = $('overlay');
const result = $('result');
const link = $('link');
const copyBtn = $('copy');
const nativeBtn = $('native');

document.title = `${anim.title} · Personaliza y comparte | ViralCss`;
$('title').textContent = anim.title;
$('desc').textContent = anim.description;
fields.m.placeholder = anim.defaultMessage;

try {
  const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
  for (const key of ['p', 'm', 'd']) if (typeof draft[key] === 'string') fields[key].value = draft[key];
} catch {
  // sessionStorage no disponible: se empieza en blanco
}

let player = null;
anim.load()
  .then((mod) => {
    player = createPlayer($('scene').querySelector('canvas'), mod.default, { loop: anim.previewLoop, card: readCard() });
    player.play();
  })
  .catch((err) => console.error('No se pudo cargar la animación', err));

const readCard = () => cleanCard({ a: anim.id, p: fields.p.value, m: fields.m.value, d: fields.d.value });

let shareText = '';

function update() {
  const card = readCard();
  fillOverlay(overlay, card, anim);
  if (player) player.stage.card = card;
  // El código descargable lleva el nombre y mensaje que ya escribieron.
  $('codeLink').href = card.p || card.m || card.d
    ? `codigo.html?s=${encodeCard(card)}`
    : `codigo.html?a=${encodeURIComponent(anim.id)}`;
  $('counter').textContent = `${fields.m.value.length}/140`;
  result.hidden = true;
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ p: fields.p.value, m: fields.m.value, d: fields.d.value }));
  } catch {
    // ignorar
  }
}

form.addEventListener('input', update);
update();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const card = readCard();
  const url = buildShareUrl(card);
  shareText = card.p ? `${card.p}, tengo una sorpresa para ti 💛` : 'Tengo una sorpresa para ti 💛';
  link.value = url;
  $('wa').href = `https://wa.me/?text=${encodeURIComponent(`${shareText} Ábrela aquí: ${url}`)}`;
  $('open').href = url;
  nativeBtn.hidden = !navigator.share;
  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(link.value);
  } catch {
    link.select();
    document.execCommand('copy');
  }
  copyBtn.textContent = '¡Copiado!';
  setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 2000);
});

nativeBtn.addEventListener('click', () => {
  navigator.share({ title: 'Una sorpresa para ti', text: shareText, url: link.value }).catch(() => {});
});

renderSupport($('support'));
renderGifts($('gifts'), anim.category);
renderGallery($('more'), ANIMATIONS.filter((a) => a.id !== anim.id));
