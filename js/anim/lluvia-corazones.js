import { TAU, clamp, rand, pick, easeOutBack } from './util.js';

const HEART_COLORS = ['#ff6b9d', '#ff8fab', '#f06595', '#e64980', '#ffc9de', '#ffffff'];

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);
  const cx = w / 2;
  const cy = h * 0.5;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#240b36');
  bg.addColorStop(0.55, '#5c1a4a');
  bg.addColorStop(1, '#a8325e');

  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.95);
  glow.addColorStop(0, 'rgba(255, 120, 170, 0.5)');
  glow.addColorStop(1, 'rgba(255, 120, 170, 0)');

  const spawn = (first) => ({
    x: rand(0, w),
    y: first ? rand(h * 0.2, h * 1.8) : h + rand(20, 120),
    size: S * rand(0.035, 0.1),
    speed: rand(50, 130),
    wobble: rand(1, 2.4),
    phase: rand(0, TAU),
    color: pick(HEART_COLORS),
    alpha: rand(0.45, 0.95),
  });
  const hearts = Array.from({ length: Math.round(30 + (w * h) / 20000) }, () => spawn(true))
    .sort((a, b) => a.size - b.size);

  return (t, dt) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Corazón grande que late detrás del mensaje
    const appear = easeOutBack(clamp((t - 0.2) / 1.1));
    if (appear > 0.01) {
      const beat = 1 + 0.07 * Math.pow(Math.max(0, Math.sin(t * 6)), 6);
      ctx.globalAlpha = clamp(appear);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      drawHeart(ctx, cx, cy, S * 0.8 * appear * beat, 0, '#e64980');
      ctx.globalAlpha = 1;
    }

    for (const p of hearts) {
      p.y -= p.speed * dt;
      if (p.y < -p.size * 2) Object.assign(p, spawn(false));
      const sway = Math.sin(t * p.wobble + p.phase);
      ctx.globalAlpha = p.alpha;
      drawHeart(ctx, p.x + sway * 14, p.y, p.size, sway * 0.3, p.color);
    }
    ctx.globalAlpha = 1;
  };
}

// Corazón centrado en (x, y); `size` es su ancho aproximado.
function drawHeart(ctx, x, y, size, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(0, -0.22);
  ctx.bezierCurveTo(0, -0.52, -0.5, -0.52, -0.5, -0.17);
  ctx.bezierCurveTo(-0.5, 0.13, 0, 0.38, 0, 0.6);
  ctx.bezierCurveTo(0, 0.38, 0.5, 0.13, 0.5, -0.17);
  ctx.bezierCurveTo(0.5, -0.52, 0, -0.52, 0, -0.22);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}
