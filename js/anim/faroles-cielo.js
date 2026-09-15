import {
  TAU, clamp, rand, lerp, easeInOut, rgbaOf, glow, sparkle, softBackdrop, makeLayer, makeVignette, makeStars, drawStars,
} from './util.js';

// ✏️ Colores del farol y de la noche
const LANTERN = [255, 170, 80];
const FLAME = [255, 240, 190];

// Guion (segundos)
const FIRST = 0.8; // sube el primer farol
const CROWD = 2.2; // se suman cientos de faroles
const PASS = 5; // un farol pasa frente a la cámara: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const lake = h * 0.7;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const total = calm ? 50 : Math.round(clamp((w * h) / 1600, 70, 160));

  const sky = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, lake);
    grad.addColorStop(0, '#060a24');
    grad.addColorStop(0.7, '#2a1f4a');
    grad.addColorStop(1, '#5a3a55');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const stars = makeStars(w, lake * 0.8, Math.round((w * h) / 3200));
  const hills = makeLayer(w, h, dpr, (g) => {
    g.fillStyle = '#0b0a1c';
    g.beginPath();
    g.moveTo(0, lake);
    for (let x = 0; x <= w + 10; x += 10) g.lineTo(x, lake - h * (0.06 + 0.04 * Math.sin(x * 0.012) + 0.02 * Math.sin(x * 0.04)));
    g.lineTo(w, lake);
    g.closePath();
    g.fill();
    const water = g.createLinearGradient(0, lake, 0, h);
    water.addColorStop(0, '#1a1532');
    water.addColorStop(1, '#05040c');
    g.fillStyle = water;
    g.fillRect(0, lake, w, h - lake);
  });

  // Farol de papel pre-renderizado con llama interior
  const sprite = makeLayer(64, 80, Math.min(2, Math.max(1, dpr)) * 2, (g) => {
    const body = g.createLinearGradient(0, 8, 0, 76);
    body.addColorStop(0, '#ffb070');
    body.addColorStop(0.6, '#ff8a3a');
    body.addColorStop(1, '#ffe2a8');
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(14, 8);
    g.quadraticCurveTo(32, 2, 50, 8);
    g.lineTo(56, 66);
    g.quadraticCurveTo(32, 74, 8, 66);
    g.closePath();
    g.fill();
    const inner = g.createRadialGradient(32, 60, 2, 32, 55, 34);
    inner.addColorStop(0, 'rgba(255, 250, 220, 0.95)');
    inner.addColorStop(1, 'rgba(255, 160, 60, 0)');
    g.fillStyle = inner;
    g.fill();
    g.strokeStyle = 'rgba(160, 70, 20, 0.35)';
    g.lineWidth = 1;
    for (const x of [20, 32, 44]) {
      g.beginPath();
      g.moveTo(x, 6);
      g.lineTo(x + (x - 32) * 0.25, 70);
      g.stroke();
    }
  });
  const vignette = makeVignette(ctx, w, h, 0.55, w / 2, h * 0.5);

  const lanterns = Array.from({ length: total }, (_, i) => {
    const depth = Math.random() ** 1.5;
    return {
      x: rand(-0.1, 1.1),
      start: i === 0 ? FIRST : CROWD + rand(0, 3.5) + (i / total) * 1.2,
      depth,
      speed: lerp(0.07, 0.17, depth),
      sway: rand(0, TAU),
      flicker: rand(5, 9),
    };
  }).sort((a, b) => a.depth - b.depth);
  lanterns[0].x = 0.5;

  const lanternPos = (l, t) => {
    const life = t - l.start;
    const size = S * lerp(0.015, 0.09, l.depth);
    const y = lerp(lake + size, -size * 2, (life * l.speed) % 1.15);
    const x = l.x * w + Math.sin(life * 0.8 + l.sway) * S * 0.03 * l.depth;
    return { x, y, size, life };
  };

  return (t) => {
    const intro = clamp(t / 1.2);
    const crowd = easeInOut(clamp((t - CROWD) / 3));

    ctx.drawImage(sky, 0, 0, w, h);
    drawStars(ctx, stars, t);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, w / 2, lake, S * 1.6, LANTERN, 0.08 + 0.22 * crowd);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(hills, 0, 0, w, h);

    // Faroles y su reflejo en el lago
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lanterns) {
      if (t < l.start) continue;
      const p = lanternPos(l, t);
      const appear = clamp(p.life / 0.8);
      const flick = 0.85 + 0.15 * Math.sin(t * l.flicker + l.sway);
      glow(ctx, p.x, p.y, p.size * 2.6, LANTERN, 0.35 * appear * flick);
      ctx.globalAlpha = appear;
      ctx.drawImage(sprite, p.x - p.size * 0.4, p.y - p.size * 0.5, p.size * 0.8, p.size);
      ctx.globalAlpha = 1;
      const ry = lake + (lake - p.y) * 0.35;
      if (ry < h) {
        ctx.fillStyle = rgbaOf(LANTERN, 0.18 * appear * flick);
        ctx.fillRect(p.x - p.size * 0.35 + Math.sin(t * 3 + l.sway) * 2, ry, p.size * 0.7, Math.max(1, p.size * 0.12));
      }
    }

    // El farol cercano cruza frente a la cámara
    const pass = (t - PASS) / 2.2;
    if (pass > 0 && pass < 1) {
      const size = S * lerp(0.35, 0.6, pass);
      const x = lerp(w * 0.2, w * 0.75, pass);
      const y = lerp(h * 0.95, -size, easeInOut(pass));
      const focus = Math.sin(pass * Math.PI);
      glow(ctx, x, y, size * 2.2, LANTERN, 0.45 * focus);
      glow(ctx, x, y + size * 0.2, size * 0.9, FLAME, 0.35 * focus);
      // El papel se dibuja opaco (en modo aditivo se vería como una caja café)
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.95 * focus;
      ctx.drawImage(sprite, x - size * 0.4, y - size * 0.5, size * 0.8, size);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, y + size * 0.15, size * 0.5, FLAME, 0.5 * focus);
      for (let i = 0; i < 6; i++) {
        const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 2);
        sparkle(ctx, x + Math.cos(i * 1.1 + t) * size * 0.8, y + Math.sin(i * 1.1 + t) * size * 0.8, S * 0.015 * tw, FLAME, focus * tw);
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
