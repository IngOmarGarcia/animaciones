export function fillOverlay(el, card, anim) {
  el.classList.remove('pos-top', 'pos-center', 'pos-below');
  el.classList.add(`pos-${anim.textPosition}`);
  const isGalaxy = anim.id === 'galaxia-de-flores';
  el.classList.toggle('galaxy-copy', isGalaxy);
  el.classList.toggle('galaxy-copy-long', isGalaxy && (card.m || anim.defaultMessage).length > 80);
  // nameInScene: la escena ya escribe el nombre, no se repite arriba
  setText(el.querySelector('.ov-to'), card.p && !anim.nameInScene ? `Para ${card.p}` : '');
  setText(el.querySelector('.ov-msg'), anim.ownMessage ? '' : card.m || anim.defaultMessage);
  setText(el.querySelector('.ov-from'), card.d ? `Con cariño, ${card.d}` : '');
}

function setText(node, text) {
  node.textContent = text;
  node.hidden = !text;
}
