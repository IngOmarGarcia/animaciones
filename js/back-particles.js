import {passingParticles,paintPassingParticles} from './header-particles.js';
export function backParticles(button) {
  const canvas = document.createElement('canvas');canvas.setAttribute('aria-hidden', 'true');button.prepend(canvas);
  const dpr = Math.min(devicePixelRatio || 1, 1.5);canvas.width = canvas.height = 54 * dpr;
  const ctx = canvas.getContext('2d');ctx.scale(dpr, dpr);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const points=passingParticles(54,54,14);
  let visible = false, raf = 0, last=0;
  function paint(ms = 0) {
    const dt=last?Math.min((ms-last)/1000,.05):0;last=ms;
    paintPassingParticles(ctx,points,54,54,reduced.matches?0:ms,dt,reduced.matches);
    if (visible && !document.hidden && !reduced.matches) raf = requestAnimationFrame(paint);
  }
  function update() { cancelAnimationFrame(raf);last=0;if (visible && !document.hidden) paint(); }
  document.addEventListener('visibilitychange', update);reduced.addEventListener('change', update);
  return { setVisible(value) { visible = value;update(); } };
}
