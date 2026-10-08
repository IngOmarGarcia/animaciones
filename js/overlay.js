import { textFamily } from './anim/text-style.js';
export function fillOverlay(el, card, anim) {
  el.style.setProperty('--message-font', textFamily(card.f));
  const noText = (anim.seasonalText || anim.cinematic) && card.tm === 'none';
  let accessible=el.parentElement.querySelector('[data-accessible-dedication]');
  if(!accessible){accessible=document.createElement('div');accessible.className='sr-only';accessible.dataset.accessibleDedication='';accessible.hidden=true;accessible.setAttribute('role','status');accessible.setAttribute('aria-live',document.body.hasAttribute('data-focused-flow')?'off':'polite');accessible.setAttribute('aria-atomic','true');el.parentElement.append(accessible);}
  const canvasText=anim.nameInScene||anim.ownMessage||anim.letterFields||anim.turtleIndex!==undefined;
  accessible.dataset.hasText=String(!!canvasText&&!noText);
  accessible.textContent=canvasText&&!noText?[card.p,card.m||((anim.seasonalText||anim.cinematic)&&card.tm?'':anim.defaultMessage),card.d?`Firma: ${card.d}`:'',card.lt,card.l,card.mem?.split('|').map(s=>s.replace('~',': ')).join('. ')].filter(Boolean).join('. '):'';
  accessible.hidden=accessible.dataset.hasText!=='true'||accessible.dataset.ready!=='true';
  el.classList.remove('pos-top', 'pos-center', 'pos-below');
  el.classList.add(`pos-${anim.textPosition}`);
  const isGalaxy = anim.id === 'galaxia-de-flores';
  el.classList.toggle('galaxy-copy', isGalaxy);
  el.classList.toggle('galaxy-copy-long', isGalaxy && (card.m || anim.defaultMessage).length > 80);
  // nameInScene: la escena ya escribe el nombre, no se repite arriba
  setText(el.querySelector('.ov-to'), !noText && card.p && !anim.nameInScene ? (anim.seasonalText ? card.p : `Para ${card.p}`) : '');
  setText(el.querySelector('.ov-msg'), noText || anim.ownMessage ? '' : anim.seasonalText && card.tm ? card.m : card.m || anim.defaultMessage);
  setText(el.querySelector('.ov-from'), !noText && !anim.cinematic && card.d && anim.turtleIndex === undefined ? (anim.seasonalText ? card.d : `Con cariño, ${card.d}`) : '');
}
export function setAccessibleReveal(el,visible){const node=el.parentElement.querySelector('[data-accessible-dedication]');if(node){node.dataset.ready=String(visible);node.hidden=!visible||node.dataset.hasText!=='true';}}

function setText(node, text) {
  node.textContent = text;
  node.hidden = !text;
}
