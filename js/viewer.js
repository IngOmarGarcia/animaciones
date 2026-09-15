import { ANIMATIONS, getAnimation } from './catalog.js';
import { decodeCard } from './share.js';
import { fillOverlay } from './overlay.js';
import { renderGallery } from './gallery.js';
import { createPlayer } from './anim/engine.js';
import { renderGifts, renderSupport } from './extras.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const card = decodeCard(params.get('s')) || { a: params.get('a') || '', p: '', m: '', d: '' };
const anim = getAnimation(card.a) || ANIMATIONS[0];

const overlay = $('overlay');
const gate = $('gate');
const replay = $('replay');
const hint = $('hint');

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
      overlay.classList.add('show');
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

if (params.has('autoplay')) {
  gate.classList.add('hide');
  start();
}

renderSupport($('support'));
renderGifts($('gifts'), anim.category);
renderGallery($('more'), ANIMATIONS.filter((a) => a.id !== anim.id));
