import { VISIBLE_ANIMATIONS, getAnimation } from './catalog.js';
import { decodeCard,encodeCard } from './share.js';
import { fillOverlay, setAccessibleReveal } from './overlay.js';
import { renderGallery } from './gallery.js';
import { createPlayer } from './anim/engine.js';
import './support.js';
import { relatedAnimations, guideFor } from './scene-guides.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const card = decodeCard(params.get('s')) || { a: params.get('a') || '', p: '', m: '', d: '' };
const anim = getAnimation(card.a) || VISIBLE_ANIMATIONS[0];

const overlay = $('overlay');
const gate = $('gate');
const replay = $('replay');
const hint = $('hint');
const canvas=$('scene').querySelector('canvas');
canvas.removeAttribute('aria-hidden');
canvas.setAttribute('aria-label',`${anim.title}. ${guideFor(anim).interaction}`);
if(anim.interactive&&!anim.cinematic){canvas.tabIndex=0;canvas.setAttribute('role','button');}
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
if (anim.seasonalText || anim.cinematic) {
  document.title = card.tm !== 'none' && card.p ? `${card.p} · ${anim.title}` : anim.title;
  $('gateTo').textContent = card.tm !== 'none' && card.p ? card.p : anim.title;
  $('gateFrom').textContent = anim.category === 'muertos' ? 'Celebra la vida y la memoria' : anim.category === 'halloween' ? 'La noche está llena de magia' : 'Una experiencia creada para compartir';
}
$('cta').href = `crear.html?a=${encodeURIComponent(anim.id)}`;
// Exporta la misma dedicatoria y paleta que se está viendo.
$('codeLink').href = `codigo.html?s=${encodeCard({...card,a:anim.id})}`;
$('codeLink').closest('.after-code').hidden = !!anim.noCode || isDana2;
if(anim.cinematic)document.body.classList.add('cinematic-experience');

let player = null;
canvas.addEventListener('motionpreferencechange',()=>{if(player)$('viewerPause').textContent=player.motionReduced?'Reproducir con movimiento':paused?'Continuar':'Pausar';});
let watcher = 0;
let paused=false, starting=false, failed=false,sceneVisible=true;
const sceneObserver=anim.cinematic?new IntersectionObserver(entries=>{
 sceneVisible=entries[0].isIntersecting;
 if(!sceneVisible)player?.pause();else if(!paused&&!document.hidden)player?.play();
}):null;
sceneObserver?.observe(canvas);
$('viewerPause').addEventListener('click',()=>{
  if(player?.motionReduced){player.enableMotion();paused=false;start();return;}else {paused=!paused;paused?player?.pause():sceneVisible&&!document.hidden&&player?.play();}
  $('viewerPause').textContent=paused?'Continuar':'Pausar';$('viewerStatus').textContent=paused?'Animación pausada.':'Animación en reproducción.';
});
document.addEventListener('visibilitychange', () => {
  if (!player) return;
  if (document.hidden) player.pause();
  else if(!paused&&sceneVisible) player.play();
});

async function start() {
  if (starting) return;
  starting=true; clearInterval(watcher);
  try {
    const mod = await anim.load({retry:failed});
    if (player) player.restart();
    else player=createPlayer(canvas, mod.default, {card});
    paused=false;
    if(!document.hidden&&sceneVisible)player.play();
    failed=false;
  } catch (err) {
    player?.destroy();player=null;failed=true;
    console.error('No se pudo cargar la animación', err);
    $('viewerStatus').className='viewer-error';
    $('viewerStatus').textContent='No se pudo cargar la animación. Pulsa Ver de nuevo para reintentar.';
    replay.hidden=false;
    $('viewerPause').hidden=true;
    return;
  } finally {
    starting=false;
  }
  clearInterval(watcher);
  $('viewerStatus').className='sr-only';$('viewerStatus').textContent='Animación en reproducción.';
  overlay.classList.remove('show');
  setAccessibleReveal(overlay,false);
  replay.hidden = true;
  hint.hidden = true;
  paused=false;$('viewerPause').hidden=false;$('viewerPause').textContent=player.motionReduced?'Reproducir con movimiento':'Pausar';
  // Se sigue el tiempo de la animación (no el reloj) para que en celulares lentos
  // el mensaje no aparezca antes de que florezca. Las interactivas avisan con stage.revealed.
  let shownAt = null;
  watcher = setInterval(() => {
    const ready = player.motionReduced || (anim.interactive ? player.stage.revealed : player.time >= anim.textDelay);
    if (ready && shownAt === null) {
      if (!isDana2) overlay.classList.add('show');
      setAccessibleReveal(overlay,true);
      shownAt = player.time;
    }
    if (shownAt !== null && (player.motionReduced || player.time >= shownAt + 2.5)) {
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

renderGallery($('more'), relatedAnimations(anim, VISIBLE_ANIMATIONS));
window.addEventListener('pagehide',event=>{if(event.persisted)player?.pause();else {clearInterval(watcher);sceneObserver?.disconnect();player?.destroy();}});
window.addEventListener('pageshow',event=>{if(event.persisted&&!paused&&!document.hidden&&sceneVisible)player?.play();});
