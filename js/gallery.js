import { getAnimation } from './catalog.js';
import { createPlayer } from './anim/engine.js';
import { guideFor, modeLabelFor } from './scene-guides.js';

const players = new Map();
const visible = new Set();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches;
let motionRequested=false;
const observer = new IntersectionObserver(entries => {
  for (const e of entries) e.isIntersecting && !e.target.hidden ? visible.add(e.target) : visible.delete(e.target);
  schedule();
}, {rootMargin:'0px'});
function schedule() {
  const active = [...visible].filter(c=>c.isConnected&&!c.hidden).slice(0,matchMedia('(max-width:719px)').matches?2:4);
  for(const [card,player] of players) if(paused||document.hidden||!active.includes(card)) player.pause();
  for(const card of visible) if(card.isConnected&&!card.hidden) activate(card);
  if(players.size>8) for(const [card,player] of players) {
    if(!visible.has(card)) {player.destroy();players.delete(card);if(players.size<=8)break;}
  }
}
async function activate(card) {
  let player=players.get(card);
  if(!player) {
    if(card.dataset.loading || card.dataset.failed) return;
    card.dataset.loading='1';
    try {
      const anim=getAnimation(card.dataset.id), mod=await anim.load();
      if(!card.isConnected) return;
      player=createPlayer(card.querySelector('canvas'),mod.default,{loop:anim.previewLoop,preview:true});
      players.set(card,player);
      if(motionRequested&&player.motionReduced)player.enableMotion();
      player.restart();
    } catch(error) {
      card.dataset.failed='1';
      const notice=document.createElement('span'); notice.className='preview-unavailable'; notice.textContent='Abre la ficha para cargar la escena';
      card.querySelector('.thumb').append(notice);
      console.error('Vista previa no disponible',card.dataset.id,error);
    } finally {delete card.dataset.loading;}
  }
  if(player && !paused && !document.hidden && [...visible].filter(c=>c.isConnected&&!c.hidden).slice(0,matchMedia('(max-width:719px)').matches?2:4).includes(card)) player.play();
}
export function setGalleryPaused(value,{userInitiated=false}={}) {paused=value;if(userInitiated&&!value){motionRequested=true;for(const player of players.values())if(player.motionReduced)player.enableMotion();}schedule();}
export function galleryPaused() {return paused;}
export function enhanceGallery(container) {for(const card of container.querySelectorAll('.card[data-id]')) observer.observe(card);}
export function refreshGallery(container) {for(const card of container.querySelectorAll('.card[data-id]')) {if(card.hidden)visible.delete(card);observer.unobserve(card);observer.observe(card);}schedule();}
document.addEventListener('visibilitychange',schedule);
reduced.addEventListener('change',()=>{motionRequested=false;setGalleryPaused(reduced.matches);});
window.addEventListener('pagehide',event=>{
  for(const player of players.values())event.persisted?player.pause():player.destroy();
  if(!event.persisted){players.clear();visible.clear();}
});
window.addEventListener('pageshow',event=>{if(event.persisted)schedule();});

function createCard(anim) {
 const card=document.createElement('article'); card.className='card'; card.dataset.id=anim.id;
 const preview=document.createElement('a'); preview.className='card-preview-link'; preview.href=`/animaciones/${anim.id}.html`; preview.setAttribute('aria-label',`Ver ${anim.title}`);
 const thumb=document.createElement('div');thumb.className='thumb';
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
 const badge=document.createElement('span');badge.className='badge';badge.textContent=modeLabelFor(anim);thumb.append(canvas,badge);preview.append(thumb);
 const body=document.createElement('div');body.className='card-body';
 const title=document.createElement('h3'), link=document.createElement('a');link.href=preview.href;link.textContent=anim.title;title.append(link);
 const desc=document.createElement('p');desc.textContent=anim.description;
 const features=document.createElement('p');features.className='card-options';features.textContent=`${anim.seasonalText?'Frases o sin texto':anim.letterFields?'Carta y recuerdos':'Nombre y mensaje'}${anim.colorDefaults?' · Dos colores':''}`;
 const links=document.createElement('div');links.className='card-links';const detail=document.createElement('a');detail.href=preview.href;detail.textContent='Ver escena y detalles';
 const editor=document.createElement('a');editor.href=`/crear.html?a=${anim.id}`;editor.textContent='Personalizar →';editor.setAttribute('aria-label',`Personalizar ${anim.title}`);links.append(detail,editor);
 body.append(title,desc,features,links);card.append(preview,body);return card;
}
export function clearGallery(container) {
 for(const card of container.querySelectorAll('.card')) {observer.unobserve(card);visible.delete(card);players.get(card)?.destroy();players.delete(card);}
 container.replaceChildren();schedule();
}
export function appendGallery(container,animations) {container.append(...animations.map(createCard));enhanceGallery(container);}
export function renderGallery(container,animations) {clearGallery(container);appendGallery(container,animations);}
