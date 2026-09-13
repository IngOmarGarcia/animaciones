export function fillOverlay(el, card, anim) {
  el.classList.remove('pos-top', 'pos-center');
  el.classList.add(`pos-${anim.textPosition}`);
  setText(el.querySelector('.ov-to'), card.p ? `Para ${card.p}` : '');
  setText(el.querySelector('.ov-msg'), card.m || anim.defaultMessage);
  setText(el.querySelector('.ov-from'), card.d ? `Con cariño, ${card.d}` : '');
}

function setText(node, text) {
  node.textContent = text;
  node.hidden = !text;
}
