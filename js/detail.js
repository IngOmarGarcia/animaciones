import { getAnimation } from './catalog.js';
import { createPlayer } from './anim/engine.js';
import { fillOverlay, setAccessibleReveal } from './overlay.js';
import { enhanceGallery, setGalleryPaused } from './gallery.js';
const $=id=>document.getElementById(id);
const anim=getAnimation(document.body.dataset.animation);
const button=$('detail-play'), pause=$('detail-pause'), replay=$('detail-replay'), status=$('detail-status'), overlay=$('detail-overlay');
let player, timer, paused=false, visible=true, failed=false;
function resume() {if(player&&!paused&&!document.hidden&&visible)player.play();else player?.pause();}
async function load() {
 button.disabled=true;status.textContent='Cargando escena…';
 try {
  if(!anim||anim.hidden)throw Error('Escena no disponible');
  const mod=await anim.load({retry:failed});
  const card={a:anim.id,p:anim.exampleTitle || 'Tu nombre',m:anim.defaultMessage,d:'Tu firma',f:'clear',...(anim.seasonalText?{tm:'suggest'}:{})};
  fillOverlay(overlay,card,anim);
  player=createPlayer($('detail-canvas'),mod.default,{card});player.restart();resume();failed=false;
  setGalleryPaused(true);button.hidden=true;pause.hidden=false;replay.hidden=false;
  status.textContent='Vista previa en reproducción. Prueba la interacción indicada abajo.';
  pause.textContent=player.motionReduced?'Reproducir con movimiento':'Pausar';
  timer=setInterval(()=>{const ready=player.motionReduced||(anim.interactive?player.stage.revealed:player.time>=anim.textDelay);overlay.classList.toggle('show',ready);setAccessibleReveal(overlay,ready);},150);
 } catch(error) {player?.destroy();player=null;failed=true;status.textContent='No se pudo cargar la escena. Puedes reintentar o continuar al editor.';button.disabled=false;button.textContent='Reintentar vista previa';console.error(error);}
}
button.addEventListener('click',load);
pause.addEventListener('click',()=>{if(player?.motionReduced){player.enableMotion();paused=false;}else paused=!paused;pause.textContent=paused?'Continuar':'Pausar';status.textContent=paused?'Vista previa pausada.':'Vista previa en reproducción.';resume();});
replay.addEventListener('click',()=>{overlay.classList.remove('show');setAccessibleReveal(overlay,false);player.restart();paused=false;pause.textContent=player.motionReduced?'Reproducir con movimiento':'Pausar';resume();});
document.addEventListener('visibilitychange',resume);
const visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resume();});visibility.observe($('detail-canvas'));
$('detail-canvas').addEventListener('motionpreferencechange',()=>{if(player)pause.textContent=player.motionReduced?'Reproducir con movimiento':paused?'Continuar':'Pausar';});
window.addEventListener('pagehide',event=>{if(event.persisted)player?.pause();else {clearInterval(timer);player?.destroy();visibility.disconnect();}});
window.addEventListener('pageshow',event=>{if(event.persisted)resume();});
for(const gallery of document.querySelectorAll('[data-gallery]'))enhanceGallery(gallery);
