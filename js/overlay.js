import { textFamily } from './anim/text-style.js';
export function fillOverlay(el, card, anim) {
  el.style.setProperty('--message-font', textFamily(card.f));
  const noText = anim.seasonalText && card.tm === 'none';
  el.classList.remove('pos-top', 'pos-center', 'pos-below');
  el.classList.add(`pos-${anim.textPosition}`);
  const isGalaxy = anim.id === 'galaxia-de-flores';
  el.classList.toggle('galaxy-copy', isGalaxy);
  el.classList.toggle('galaxy-copy-long', isGalaxy && (card.m || anim.defaultMessage).length > 80);
  // nameInScene: la escena ya escribe el nombre, no se repite arriba
  setText(el.querySelector('.ov-to'), !noText && card.p && !anim.nameInScene ? (anim.seasonalText ? card.p : `Para ${card.p}`) : '');
  setText(el.querySelector('.ov-msg'), noText || anim.ownMessage ? '' : anim.seasonalText && card.tm ? card.m : card.m || anim.defaultMessage);
  setText(el.querySelector('.ov-from'), !noText && card.d ? (anim.seasonalText ? card.d : `Con cariño, ${card.d}`) : '');
}

function setText(node, text) {
  node.textContent = text;
  node.hidden = !text;
}
