import { VISIBLE_ANIMATIONS, getAnimation } from './catalog.js';
import { decodeCard } from './share.js';
import { buildStandaloneHtml } from './standalone.js';
import { renderSupport } from './extras.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
// ?s= trae el nombre y mensaje que escribieron en crear; ?a= solo la animación.
const card = decodeCard(params.get('s')) || { a: params.get('a') || '', p: '', m: '', d: '' };
const anim = getAnimation(card.a) || VISIBLE_ANIMATIONS[0];
const fileName = `${anim.id}.html`;
const createHref = `crear.html?a=${encodeURIComponent(anim.id)}`;

document.title = `Código HTML de ${anim.title} para copiar | ViralCss`;
$('title').textContent = `Código de «${anim.title}»`;
$('back').href = createHref;
$('cta').href = createHref;
$('fileName').textContent = fileName;
renderSupport($('support'));

$('others').replaceChildren(...VISIBLE_ANIMATIONS.filter((a) => a.id !== anim.id).map((a) => {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = `codigo.html?a=${encodeURIComponent(a.id)}`;
  link.textContent = a.title;
  item.append(link);
  return item;
}));

const codeEl = $('code');
const buttons = ['copy', 'download', 'try'].map($);
let html = '';

try {
  html = await buildStandaloneHtml(anim, card);
  codeEl.textContent = html;
  for (const button of buttons) button.disabled = false;
} catch (err) {
  console.error('No se pudo generar el código', err);
  codeEl.textContent = 'No se pudo cargar el código. Recarga la página.';
}

const htmlBlobUrl = () => URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));

function flash(button, text) {
  const original = button.textContent;
  button.textContent = text;
  setTimeout(() => { button.textContent = original; }, 2000);
}

$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(html);
  } catch {
    const range = document.createRange();
    range.selectNodeContents(codeEl);
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    document.execCommand('copy');
  }
  flash($('copy'), '¡Copiado!');
});

$('download').addEventListener('click', () => {
  const url = htmlBlobUrl();
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  flash($('download'), '¡Descargado!');
});

$('try').addEventListener('click', () => {
  const url = htmlBlobUrl();
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});
