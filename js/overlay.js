export function fillOverlay(el, card, anim) {
  el.classList.remove('pos-top', 'pos-center', 'pos-below');
  el.classList.add(`pos-${anim.textPosition}`);
  // nameInScene: la escena ya escribe el nombre, no se repite arriba
  setText(el.querySelector('.ov-to'), card.p && !anim.nameInScene ? `Para ${card.p}` : '');
  setText(el.querySelector('.ov-msg'), card.m || anim.defaultMessage);
  setText(el.querySelector('.ov-from'), card.d ? `Con cariño, ${card.d}` : '');
}

function setText(node, text) {
  node.textContent = text;
  node.hidden = !text;
}
