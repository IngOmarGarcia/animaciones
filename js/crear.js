import { VISIBLE_ANIMATIONS, getAnimation } from './catalog.js';
import { buildShareUrl, cleanCard, encodeCard, decodeCard } from './share.js';
import { fillOverlay, setAccessibleReveal } from './overlay.js';
import { renderGallery } from './gallery.js';
import { createPlayer } from './anim/engine.js';
import './support.js';
import { relatedAnimations, guideFor } from './scene-guides.js';
import { DANA_DEFAULTS } from './anim/dana2-core.js';
import { FONT_OPTIONS } from './anim/text-style.js';

const params = new URLSearchParams(location.search);
const sharedCard = decodeCard(params.get('s'));
const anim = getAnimation(sharedCard?.a || params.get('a')) || VISIBLE_ANIMATIONS[0];
const DRAFT_KEY = `detallito-borrador-${anim.id}`;
const isDana2 = anim.codename === 'Dana2';
const hasPhoto = isDana2 || !!anim.photoField;
const isSeasonal = !!anim.seasonalText;
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
$('detailLink').href = `/animaciones/${anim.id}.html`;
$('previewStatus').textContent = guideFor(anim).interaction;
const previewCanvas=$('scene').querySelector('canvas');
if(guideFor(anim).mode==='auto') {previewCanvas.removeAttribute('role');previewCanvas.removeAttribute('tabindex');previewCanvas.setAttribute('aria-label',anim.description);}
fields.m.placeholder = anim.defaultMessage;
$('textFont').replaceChildren(...FONT_OPTIONS.map(font => {
  const option = document.createElement('option'); option.value = font.id; option.textContent = font.label; return option;
}));
fields.f.value = 'clear';
if (anim.colorDefaults) {
  $('animationColors').hidden = false;
  [fields.c1.value, fields.c2.value] = anim.colorDefaults;
}
if (isSeasonal) {
  $('seasonalFields').hidden = false;
  $('recipientCaption').textContent = 'Nombre o título (opcional)';
  $('messageCaption').textContent = 'Tu frase (editable y opcional)';
  $('senderCaption').textContent = 'Firma';
  fields.p.placeholder = anim.exampleTitle ? `Ej. ${anim.exampleTitle}` : anim.category === 'muertos' ? 'Ej. En memoria de Luna' : anim.category === 'halloween' ? 'Ej. Fiesta de Halloween' : 'Ej. Un nuevo comienzo';
  fields.d.placeholder = 'Ej. Familia García';
  fields.m.value = anim.defaultMessage;
  $('phraseSuggestion').replaceChildren(...anim.phrases.map((phrase) => {
    const option = document.createElement('option'); option.value = phrase; option.textContent = phrase; return option;
  }));
}
if (isDana2) {
  fields.p.value = DANA_DEFAULTS.recipientName;
  fields.m.value = DANA_DEFAULTS.introMessage;
  fields.lt.value = DANA_DEFAULTS.letterTitle;
  fields.l.value = DANA_DEFAULTS.letterText;
  fields.mem.value = DANA_DEFAULTS.memories.join('|');
}

try {
  const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
  for (const key of ['p', 'm', 'd', 'lt', 'l', 'mem', 'c1', 'c2', 'tm', 'f', 'age']) if (fields[key] && typeof draft[key] === 'string' && (key !== 'tm' || ['suggest', 'custom', 'none'].includes(draft[key])) && (key !== 'f' || FONT_OPTIONS.some(font => font.id === draft[key]))) fields[key].value = draft[key];
  $('colorsEnabled').checked = !!anim.colorDefaults && (draft.colorsEnabled === true || (draft.colorsEnabled === undefined && anim.letterFields && !isDana2 && !!draft.c1));
} catch {
  // sessionStorage no disponible: se empieza en blanco
}

if (sharedCard) {
  if (anim.colorDefaults) [fields.c1.value, fields.c2.value] = [sharedCard.c1 || anim.colorDefaults[0], sharedCard.c2 || anim.colorDefaults[1]];
  for (const key of ['p', 'm', 'd', 'lt', 'l', 'mem', 'age']) if (fields[key]) fields[key].value = sharedCard[key] || '';
  fields.f.value = sharedCard.f || 'elegant';
  if (isSeasonal) fields.tm.value = sharedCard.tm || 'suggest';
  $('colorsEnabled').checked = !!anim.colorDefaults && !!sharedCard.c1 && !!sharedCard.c2;
}

if(anim.ageField) $('ageField').hidden=false;
if(anim.photoField) { $('memoryPhotoFields').hidden=false; $('memoryPhotoFields').append($('dana2Photo').closest('label'),$('dana2PhotoStatus')); $('photoLabel').textContent='Imagen del retrato'; $('dana2PhotoStatus').textContent='Foto opcional. Se prepara en tu dispositivo y viaja dentro del enlace.'; }
let player = null, previewPaused = false, previewVisible = true, previewLoading = true, previewFailed = false;
const resumePreview = () => {
  if (player && !previewPaused && previewVisible && !document.hidden) player.play();
  else player?.pause();
};
anim.load()
  .then((mod) => {
    player = createPlayer($('scene').querySelector('canvas'), mod.default, { card: readCard() });
    resumePreview();
    $('previewPause').textContent=player.motionReduced?'Reproducir con movimiento':'Pausar vista previa';
  })
  .catch((err) => { player?.destroy(); player = null; previewFailed = true; $('previewStatus').textContent = 'No se pudo cargar la vista previa. Reiniciar permite reintentar; aún puedes crear el enlace.'; console.error(err); })
  .finally(() => { previewLoading = false; });

let photoData = sharedCard?.img || '';
let photoProcessing = false;
const memoryFields = [];
if (isDana2) {
  $('galaxyFields').hidden = false;
  $('dana2Fields').hidden = false;
  fields.mem.closest('label').hidden = true;
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
  if(photoData) $('dana2PhotoStatus').textContent='Imagen recuperada del enlace. Se conservará al compartirlo.';
  fields.p.addEventListener('input', () => {
    const finalTitle = memoryFields[6].titleInput;
    if (finalTitle.value === `Para ${previousName}`) finalTitle.value = `Para ${fields.p.value.trim() || DANA_DEFAULTS.recipientName}`;
    previousName = fields.p.value.trim() || DANA_DEFAULTS.recipientName;
  });
}
if (hasPhoto) {
  let photoVersion=0;
  $('dana2Photo').addEventListener('change', async (event) => {
    const version=++photoVersion;
    photoProcessing=false; form.querySelector('[type="submit"]').disabled=false;
    const file = event.target.files?.[0];
    photoData = '';
    if (!file) { $('dana2PhotoStatus').textContent = anim.photoField ? 'Foto opcional. Sin foto se conserva la escena de memoria.' : 'Añade una imagen para el portal. La plantilla no trae foto.'; update(); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { $('dana2PhotoStatus').textContent = 'Elige una imagen JPG, PNG o WebP.'; update();return; }
    $('dana2PhotoStatus').textContent='Preparando imagen…';update();
    photoProcessing=true;form.querySelector('[type="submit"]').disabled=true;
    const source = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      if(version!==photoVersion)return;
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
      if(version!==photoVersion)return;
      photoData = '';
      $('dana2PhotoStatus').textContent = 'No se pudo leer la imagen. Prueba con otra.';
      update();
    } finally {
      URL.revokeObjectURL(source);
      if(version===photoVersion){photoProcessing=false;form.querySelector('[type="submit"]').disabled=false;}
    }
  });
}

const readCard = () => cleanCard({
  a: anim.id,
  p: isSeasonal && fields.tm.value === 'none' ? '' : fields.p.value,
  m: isSeasonal && fields.tm.value === 'none' ? '' : fields.m.value,
  d: isSeasonal && fields.tm.value === 'none' ? '' : fields.d.value,
  tm: isSeasonal ? fields.tm.value : '',
  f: fields.f.value,
  c1: anim.colorDefaults && $('colorsEnabled').checked ? fields.c1.value : '',
  c2: anim.colorDefaults && $('colorsEnabled').checked ? fields.c2.value : '',
  ...(anim.letterFields ? {
    lt: fields.lt.value, l: fields.l.value, mem: isDana2
      ? memoryFields.map(({ titleInput, bodyInput }) => `${titleInput.value.replace(/[|~]/g, ' ').trim()}~${bodyInput.value.replace(/[|~]/g, ' ').trim()}`).join('|')
      : fields.mem.value,
  } : {}),
  age: anim.ageField ? fields.age.value : '',
  img: hasPhoto ? photoData : '',
});
// Campos extra (carta, recuerdos y colores) para las escenas que los usan
if (anim.letterFields) $('galaxyFields').hidden = false;

let shareText = '';

function update() {
  $('colorInputs').hidden = !$('colorsEnabled').checked;
  $('fontLabel').hidden = isSeasonal && fields.tm.value === 'none';
  if (isSeasonal) {
    const noText = fields.tm.value === 'none';
    for (const id of ['recipientLabel', 'messageLabel', 'senderLabel']) $(id).hidden = noText;
    $('suggestionLabel').hidden = fields.tm.value !== 'suggest';
    $('textModeHelp').textContent = noText ? 'Solo la experiencia visual, sin nombre, frase ni firma.' : 'El título y la firma son opcionales. También puedes dejar la frase vacía.';
  }
  const card = readCard();
  fillOverlay(overlay, card, anim);
  if (player) {player.stage.card = card;player.redraw();}
  // El código descargable lleva el nombre y mensaje que ya escribieron.
  $('codeLink').href = Object.entries(card).some(([key, value]) => key !== 'a' && value)
    ? `codigo.html?s=${encodeCard(card)}`
    : `codigo.html?a=${encodeURIComponent(anim.id)}`;
  $('counter').textContent = `${fields.m.value.length}/140`;
  result.hidden = true;
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ p: fields.p.value, m: fields.m.value, d: fields.d.value,
      lt: fields.lt?.value, l: fields.l?.value, mem: card.mem,
      age: fields.age?.value, c1: fields.c1?.value, c2: fields.c2?.value, tm: isSeasonal ? fields.tm.value : '',
      f: fields.f.value, colorsEnabled: $('colorsEnabled').checked }));
  } catch {
    // ignorar
  }
}

form.addEventListener('input', update);
for (const control of [$('colorsEnabled'), fields.c1, fields.c2]) control.addEventListener('change', () => { update(); player?.restart(); });
if (isSeasonal) {
  $('phraseSuggestion').addEventListener('change', () => { fields.m.value = $('phraseSuggestion').value; update(); });
  fields.tm.addEventListener('change', () => {
    if (fields.tm.value === 'custom' && anim.phrases.includes(fields.m.value)) fields.m.value = '';
    if (fields.tm.value === 'suggest' && !fields.m.value.trim()) fields.m.value = $('phraseSuggestion').value;
    update(); player?.restart();
  });
  if (anim.phrases.includes(fields.m.value)) $('phraseSuggestion').value = fields.m.value;
}
update();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if(photoProcessing) return;
  const card = readCard();
  const url = buildShareUrl(card);
  shareText = isSeasonal ? `${anim.category === 'muertos' ? 'Una animación para celebrar y recordar este Día de Muertos 🕯️' : 'Un poquito de magia para Halloween 🎃'}${card.p ? `: ${card.p}` : ''}` : card.p ? `${card.p}, tengo una sorpresa para ti 💛` : 'Tengo una sorpresa para ti 💛';
  link.value = url;
  $('wa').href = `https://wa.me/?text=${encodeURIComponent(`${shareText} Ábrela aquí: ${url}`)}`;
  $('open').href = url;
  nativeBtn.hidden = !navigator.share;
  result.hidden = false;
  result.focus({preventScroll:true});
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

renderGallery($('more'), relatedAnimations(anim, VISIBLE_ANIMATIONS));
$('previewPause').addEventListener('click',()=>{
  if(player?.motionReduced){player.enableMotion();previewPaused=false;}else previewPaused=!previewPaused;
  resumePreview();
  $('previewPause').textContent=previewPaused?'Continuar vista previa':'Pausar vista previa';
});
$('previewRestart').addEventListener('click',async()=>{
  if (previewLoading) return;
  previewLoading = true; $('previewRestart').disabled = true;
  try {
    if(!player) player=createPlayer(previewCanvas,(await anim.load({ retry: previewFailed })).default,{card:readCard()});
    player.restart();previewPaused=false;resumePreview();previewFailed=false;
    $('previewPause').textContent=player.motionReduced?'Reproducir con movimiento':'Pausar vista previa';$('previewStatus').textContent=guideFor(anim).interaction;
  } catch(error) { player?.destroy();player=null;previewFailed=true;$('previewStatus').textContent='La escena no se pudo cargar. Revisa tu conexión e inténtalo de nuevo.'; }
  finally { previewLoading=false; $('previewRestart').disabled=false; }
});
const previewObserver=new IntersectionObserver(entries=>{previewVisible=entries[0].isIntersecting;resumePreview();});
previewCanvas.addEventListener('motionpreferencechange',()=>{if(player)$('previewPause').textContent=player.motionReduced?'Reproducir con movimiento':previewPaused?'Continuar vista previa':'Pausar vista previa';});
previewObserver.observe(previewCanvas);
const accessibleTimer=setInterval(()=>{if(player)setAccessibleReveal(overlay,player.motionReduced||player.stage.revealed||!anim.interactive&&player.time>=anim.textDelay);},200);
document.addEventListener('visibilitychange',resumePreview);
window.addEventListener('pagehide',event=>{if(event.persisted)player?.pause();else {clearInterval(accessibleTimer);player?.destroy();previewObserver.disconnect();}});
window.addEventListener('pageshow',event=>{if(event.persisted)resumePreview();});
$('clearDraft').addEventListener('click',()=>{
  try{sessionStorage.removeItem(DRAFT_KEY);}catch{}
  if(sharedCard){const url=new URL(location.href);url.searchParams.delete('s');url.searchParams.set('a',anim.id);location.replace(url.href);}else location.reload();
});
