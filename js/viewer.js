import { VISIBLE_ANIMATIONS, getAnimation } from './catalog.js';
import { decodeCard } from './share.js';
import { fillOverlay } from './overlay.js';
import { renderGallery } from './gallery.js';
import { createPlayer } from './anim/engine.js';
import { renderGifts, renderSupport } from './extras.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const card = decodeCard(params.get('s')) || { a: params.get('a') || '', p: '', m: '', d: '' };
const anim = getAnimation(card.a) || VISIBLE_ANIMATIONS[0];

const overlay = $('overlay');
const gate = $('gate');
const replay = $('replay');
const hint = $('hint');
const isDana2 = anim.codename === 'Dana2';
if (isDana2) {
  // Dana2 dibuja sus propios textos y su carta dentro del canvas.
  overlay.style.display = 'none';
  hint.textContent = 'Salir';
  hint.href = './';
}

fillOverlay(overlay, card, anim);
document.title = card.p ? `Una sorpresa para ${card.p} 💛` : 'Tienes una sorpresa 💛';
$('gateTo').textContent = card.p ? `Para ${card.p}` : 'Tienes una sorpresa';
$('gateFrom').textContent = card.d ? `${card.d} te envió algo especial` : 'Alguien te envió algo especial';
$('cta').href = `crear.html?a=${encodeURIComponent(anim.id)}`;
// Sin el mensaje de quien la envió: solo la animación.
$('codeLink').href = `codigo.html?a=${encodeURIComponent(anim.id)}`;

const modulePromise = anim.load();
let player = null;
let watcher = 0;
document.addEventListener('visibilitychange', () => {
  if (!player) return;
  if (document.hidden) player.pause();
  else player.play();
});

async function start() {
  let mod;
  try {
    mod = await modulePromise;
  } catch (err) {
    console.error('No se pudo cargar la animación', err);
    overlay.classList.add('show');
    return;
  }
  clearInterval(watcher);
  overlay.classList.remove('show');
  replay.hidden = true;
  hint.hidden = true;
  if (player) {
    player.restart();
  } else {
    player = createPlayer($('scene').querySelector('canvas'), mod.default, { card });
    player.play();
  }
  // Se sigue el tiempo de la animación (no el reloj) para que en celulares lentos
  // el mensaje no aparezca antes de que florezca. Las interactivas avisan con stage.revealed.
  let shownAt = null;
  watcher = setInterval(() => {
    const ready = anim.interactive ? player.stage.revealed : player.time >= anim.textDelay;
    if (ready && shownAt === null) {
      if (!isDana2) overlay.classList.add('show');
      shownAt = player.time;
    }
    if (shownAt !== null && player.time >= shownAt + 2.5) {
      replay.hidden = false;
      hint.hidden = false;
      clearInterval(watcher);
    }
  }, 150);
}

$('openBtn').addEventListener('click', () => {
  gate.classList.add('hide');
  start();
}, { once: true });
replay.addEventListener('click', start);

if (params.has('autoplay') || (anim.codename === 'Dana2' && params.has('s'))) {
  gate.classList.add('hide');
  start();
}

renderSupport($('support'));
renderGifts($('gifts'), anim.category);
const related = VISIBLE_ANIMATIONS.filter((a) => a.id !== anim.id && a.category === anim.category);
renderGallery($('more'), (related.length ? related : VISIBLE_ANIMATIONS.filter((a) => a.id !== anim.id)).slice(0, 8));
