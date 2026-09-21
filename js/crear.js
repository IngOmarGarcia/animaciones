import { VISIBLE_ANIMATIONS, getAnimation } from './catalog.js';
import { buildShareUrl, cleanCard, encodeCard } from './share.js';
import { fillOverlay } from './overlay.js';
import { renderGallery } from './gallery.js';
import { createPlayer } from './anim/engine.js';
import { renderGifts, renderSupport } from './extras.js';
import { DANA_DEFAULTS } from './anim/dana2-core.js';

const anim = getAnimation(new URLSearchParams(location.search).get('a')) || VISIBLE_ANIMATIONS[0];
const DRAFT_KEY = `detallito-borrador-${anim.id}`;
const isDana2 = anim.codename === 'Dana2';
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
if (isDana2) {
  fields.p.value = DANA_DEFAULTS.recipientName;
  fields.m.value = DANA_DEFAULTS.introMessage;
  fields.lt.value = DANA_DEFAULTS.letterTitle;
  fields.l.value = DANA_DEFAULTS.letterText;
  fields.mem.value = DANA_DEFAULTS.memories.join('|');
}

try {
  const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
  for (const key of ['p', 'm', 'd', 'lt', 'l', 'mem', 'c1', 'c2']) if (fields[key] && typeof draft[key] === 'string') fields[key].value = draft[key];
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

let photoData = '';
const memoryFields = [];
if (isDana2) {
  $('galaxyFields').hidden = false;
  $('dana2Fields').hidden = false;
  fields.mem.closest('label').hidden = true;
  document.querySelector('.galaxy-colors').hidden = true;
  $('codeLink').closest('.code-link').hidden = true;
  const values = (fields.mem.value || '').split('|');
  for (let i = 0; i < DANA_DEFAULTS.memories.length; i++) {
    const [defaultTitle, defaultBody] = DANA_DEFAULTS.memories[i].split('~');
    const [title = defaultTitle, body = defaultBody] = (values[i] || '').split('~');
    const group = document.createElement('fieldset');
    group.className = 'dana2-memory';
    const legend = document.createElement('legend');
    legend.textContent = `Isla ${i + 1}`;
    const titleLabel = document.createElement('label');
    titleLabel.textContent = 'Título';
    const titleInput = document.createElement('input');
    titleInput.value = title;
    titleInput.maxLength = 50;
    titleLabel.append(titleInput);
    const bodyLabel = document.createElement('label');
    bodyLabel.textContent = 'Mensaje';
    const bodyInput = document.createElement('textarea');
    bodyInput.value = body;
    bodyInput.maxLength = 110;
    bodyInput.rows = 2;
    bodyLabel.append(bodyInput);
    group.append(legend, titleLabel, bodyLabel);
    $('dana2Memories').append(group);
    memoryFields.push({ titleInput, bodyInput });
  }
  let previousName = fields.p.value || DANA_DEFAULTS.recipientName;
  fields.p.addEventListener('input', () => {
    const finalTitle = memoryFields[6].titleInput;
    if (finalTitle.value === `Para ${previousName}`) finalTitle.value = `Para ${fields.p.value.trim() || DANA_DEFAULTS.recipientName}`;
    previousName = fields.p.value.trim() || DANA_DEFAULTS.recipientName;
  });
  $('dana2Photo').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    photoData = '';
    if (!file) { $('dana2PhotoStatus').textContent = 'Añade una imagen para el portal. La plantilla no trae foto.'; update(); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { $('dana2PhotoStatus').textContent = 'Elige una imagen JPG, PNG o WebP.'; return; }
    const source = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      const sx = (image.naturalWidth - side) / 2;
      const sy = (image.naturalHeight - side) / 2;
      const canvas = document.createElement('canvas');
      for (const size of [192, 160, 128, 96]) {
        canvas.width = canvas.height = size;
        canvas.getContext('2d').drawImage(image, sx, sy, side, side, 0, 0, size, size);
        photoData = canvas.toDataURL('image/jpeg', 0.55);
        if (photoData.length <= 22000) break;
      }
      if (photoData.length > 22000) throw new Error('image-too-large');
      $('dana2PhotoStatus').textContent = `Imagen lista: ${file.name}. Viajará dentro del enlace que compartas.`;
      update();
    } catch {
      photoData = '';
      $('dana2PhotoStatus').textContent = 'No se pudo leer la imagen. Prueba con otra.';
      update();
    } finally { URL.revokeObjectURL(source); }
  });
}

const readCard = () => cleanCard({
  a: anim.id, p: fields.p.value, m: fields.m.value, d: fields.d.value,
  ...(anim.letterFields ? {
    lt: fields.lt.value, l: fields.l.value, mem: isDana2
      ? memoryFields.map(({ titleInput, bodyInput }) => `${titleInput.value.replace(/[|~]/g, ' ').trim()}~${bodyInput.value.replace(/[|~]/g, ' ').trim()}`).join('|')
      : fields.mem.value,
    c1: isDana2 ? '' : fields.c1.value, c2: isDana2 ? '' : fields.c2.value,
  } : {}),
  img: isDana2 ? photoData : '',
});
// Campos extra (carta, recuerdos y colores) para las escenas que los usan
if (anim.letterFields) $('galaxyFields').hidden = false;

let shareText = '';

function update() {
  const card = readCard();
  fillOverlay(overlay, card, anim);
  if (player) player.stage.card = card;
  // El código descargable lleva el nombre y mensaje que ya escribieron.
  $('codeLink').href = Object.entries(card).some(([key, value]) => key !== 'a' && value)
    ? `codigo.html?s=${encodeCard(card)}`
    : `codigo.html?a=${encodeURIComponent(anim.id)}`;
  $('counter').textContent = `${fields.m.value.length}/140`;
  result.hidden = true;
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ p: fields.p.value, m: fields.m.value, d: fields.d.value,
      lt: fields.lt?.value, l: fields.l?.value, mem: card.mem,
      c1: fields.c1?.value, c2: fields.c2?.value }));
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
renderGallery($('more'), VISIBLE_ANIMATIONS.filter((a) => a.id !== anim.id));
