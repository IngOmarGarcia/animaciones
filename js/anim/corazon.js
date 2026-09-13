import { TAU, clamp, lerp, rand, pick, easeOutCubic, drawMiniFlower } from './util.js';

const COLORS = ['#ffd43b', '#fcc419', '#fab005', '#ffe066'];
const DURATION = 1.7;

// Curva clásica del corazón: x ∈ [-16, 16], y ∈ [-17, 12].
const heart = (a) => ({
  x: 16 * Math.sin(a) ** 3,
  y: 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a),
});

const outline = Array.from({ length: 120 }, (_, i) => heart((i / 120) * TAU));

function insideHeart(x, y) {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i];
    const b = outline[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export default function create(ctx, w, h) {
  const k = Math.min(w * 0.8, h * 0.52) / 34;
  const hx = w / 2;
  const hy = h * 0.6;
  const toScreen = (x, y) => ({ x: hx + x * k, y: hy - (y + 2.5) * k });

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#140b26');
  bg.addColorStop(1, '#3b1e3f');

  const glowGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, k * 26);
  glowGrad.addColorStop(0, 'rgba(255, 196, 0, 0.35)');
  glowGrad.addColorStop(1, 'rgba(255, 196, 0, 0)');

  const targets = [];
  const OUTLINE_COUNT = 56;
  for (let i = 0; i < OUTLINE_COUNT; i++) {
    const p = heart((i / OUTLINE_COUNT) * TAU);
    targets.push({ ...toScreen(p.x, p.y), size: 1.35, delay: 0.3 + (i / OUTLINE_COUNT) * 1.4 });
  }
  for (let y = -15; y <= 11; y += 3.2) {
    for (let x = -15; x <= 15; x += 3.2) {
      const jx = x + rand(-0.6, 0.6);
      const jy = y + rand(-0.6, 0.6);
      if (insideHeart(jx / 0.86, jy / 0.86)) {
        targets.push({ ...toScreen(jx, jy), size: 1.1, delay: rand(1.2, 2.6) });
      }
    }
  }

  const flowers = targets.map((tg) => ({
    ...tg,
    sx: rand(-0.1, 1.1) * w,
    sy: h + rand(20, h * 0.4),
    arc: rand(-1, 1) * k * 8,
    rotation: rand(0, TAU),
    spin: rand(3, 7) * (Math.random() < 0.5 ? -1 : 1),
    color: pick(COLORS),
  }));

  const petals = Array.from({ length: 26 }, () => ({
    x: rand(0, w), y: rand(0, h), speed: rand(30, 70), phase: rand(0, TAU), size: rand(3, 6),
  }));

  return (t) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffd43b';
    for (const p of petals) {
      const y = ((p.y + t * p.speed) % (h + 40)) - 20;
      const x = p.x + Math.sin(t * 1.3 + p.phase) * 25;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.ellipse(x, y, p.size, p.size * 0.55, t * 2 + p.phase, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const assembled = easeOutCubic(clamp((t - 4) / 1));
    if (assembled > 0) {
      ctx.globalAlpha = assembled;
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // Latido suave una vez formado
    const beat = 1 + assembled * Math.pow(Math.max(0, Math.sin(t * 2.4)), 12) * 0.05;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(beat, beat);
    ctx.translate(-hx, -hy);
    for (const f of flowers) {
      const p = clamp((t - f.delay) / DURATION);
      if (p <= 0) continue;
      const e = easeOutCubic(p);
      const x = lerp(f.sx, f.x, e) + Math.sin(p * Math.PI) * f.arc;
      const y = lerp(f.sy, f.y, e);
      const rotation = f.rotation + (1 - e) * f.spin + t * 0.3;
      drawMiniFlower(ctx, x, y, f.size * k * 1.05 * (0.4 + 0.6 * e), rotation, f.color, '#e8590c');
    }
    ctx.restore();
  };
}
