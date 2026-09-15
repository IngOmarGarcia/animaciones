import {
  TAU, clamp, rand, easeOutCubic, easeOutBack, qpoint, qderiv, strokePartialCurve, drawLeaf,
} from './util.js';

const TULIP_COLORS = [['#ffe066', '#f59f00'], ['#ffd43b', '#e67700'], ['#fff3bf', '#fab005']];

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);
  const ground = h * 0.9;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#1b1446');
  bg.addColorStop(0.55, '#5b2a5e');
  bg.addColorStop(1, '#e8793a');

  const tulips = Array.from({ length: 5 }, (_, i) => {
    const u = (i + 0.5) / 5;
    return {
      x: w * (0.12 + 0.76 * u) + rand(-6, 6),
      height: S * (0.95 - Math.abs(u - 0.5) * 0.7) * rand(0.85, 1),
      delay: 0.2 + Math.abs(i - 2) * 0.3 + rand(0, 0.15),
      lean: (u - 0.5) * 0.18 + rand(-0.04, 0.04),
      size: S * rand(0.075, 0.095),
      colors: TULIP_COLORS[i % TULIP_COLORS.length],
      phase: rand(0, TAU),
    };
  });

  const motes = Array.from({ length: 40 }, () => ({
    x: rand(0, w), y: rand(0, h), r: rand(0.8, 2.2), speed: rand(8, 22), phase: rand(0, TAU),
  }));

  return (t) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Sol que sale detrás de las flores
    const sunY = h * (1.02 - 0.22 * easeOutCubic(clamp(t / 4)));
    const sun = ctx.createRadialGradient(w / 2, sunY, 0, w / 2, sunY, S * 0.95);
    sun.addColorStop(0, 'rgba(255, 236, 153, 0.95)');
    sun.addColorStop(0.2, 'rgba(255, 196, 90, 0.55)');
    sun.addColorStop(1, 'rgba(255, 160, 60, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#fff3bf';
    for (const m of motes) {
      const y = (((m.y - t * m.speed) % h) + h) % h;
      ctx.globalAlpha = 0.2 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + m.phase));
      ctx.beginPath();
      ctx.arc(m.x + Math.sin(t * 0.8 + m.phase) * 10, y, m.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#1d4a2c';
    ctx.fillRect(0, ground, w, h - ground);

    for (const tp of tulips) {
      const grow = easeOutCubic(clamp((t - tp.delay) / 1.4));
      if (grow <= 0) continue;
      const sway = Math.sin(t * 0.9 + tp.phase) * 0.05;
      const base = { x: tp.x, y: ground + 6 };
      const tip = { x: tp.x + (tp.lean + sway) * tp.height, y: ground - tp.height };
      const ctrl = { x: tp.x - tp.lean * tp.height * 0.3, y: ground - tp.height * 0.55 };

      ctx.lineCap = 'round';
      ctx.strokeStyle = '#2f9e44';
      ctx.lineWidth = Math.max(2, tp.size * 0.16);
      strokePartialCurve(ctx, base, ctrl, tip, grow);

      for (const [u, side] of [[0.22, -1], [0.4, 1]]) {
        const leaf = easeOutBack(clamp((grow - u) / 0.4));
        if (leaf <= 0.01) continue;
        const p = qpoint(base, ctrl, tip, u);
        const d = qderiv(base, ctrl, tip, u);
        drawLeaf(ctx, p.x, p.y, tp.size * 2.6 * leaf, Math.atan2(d.y, d.x) + side * 0.45, '#40c057');
      }

      const bloom = easeOutBack(clamp((t - tp.delay - 1.1) / 0.8));
      if (bloom > 0.01) {
        const head = qpoint(base, ctrl, tip, grow);
        const d = qderiv(base, ctrl, tip, grow);
        const open = easeOutCubic(clamp((t - tp.delay - 1.6) / 1.4));
        drawTulip(ctx, head.x, head.y, tp.size * bloom, Math.atan2(d.y, d.x) + Math.PI / 2, tp.colors, open);
      }
    }
  };
}

// Tulipán de tres pétalos; los laterales se separan al abrirse.
function drawTulip(ctx, x, y, size, angle, [light, dark], open) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.rotate(side * (0.12 + 0.38 * open));
    drawPetal(ctx, size, dark);
    ctx.restore();
  }
  drawPetal(ctx, size * 1.05, light);
  ctx.restore();
}

function drawPetal(ctx, s, color) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(s * 0.8, -s * 0.1, s * 0.75, -s * 1.3, s * 0.28, -s * 1.75);
  ctx.quadraticCurveTo(0, -s * 1.45, -s * 0.28, -s * 1.75);
  ctx.bezierCurveTo(-s * 0.75, -s * 1.3, -s * 0.8, -s * 0.1, 0, 0);
  ctx.fillStyle = color;
  ctx.fill();
}
