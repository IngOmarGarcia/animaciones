import {
  TAU, clamp, rand, easeOutCubic, easeOutBack,
  qpoint, qderiv, strokePartialCurve, makeStars, drawStars, drawLeaf,
} from './util.js';

const SEEDS = 420;
const GOLDEN_ANGLE = (137.508 * Math.PI) / 180;
const PETALS = 24;

export default function create(ctx, w, h) {
  const D = Math.min(w * 0.17, h * 0.12); // radio del disco central
  const PL = D * 1.15; // largo de pétalo
  const cx = w / 2;
  const cy = h * 0.58;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0f1b3d');
  bg.addColorStop(0.55, '#2a2358');
  bg.addColorStop(1, '#51306b');

  const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, D * 3.8);
  glowGrad.addColorStop(0, 'rgba(255, 210, 80, 0.45)');
  glowGrad.addColorStop(1, 'rgba(255, 210, 80, 0)');

  const outerGrad = ctx.createLinearGradient(0, 0, 0, -PL);
  outerGrad.addColorStop(0, '#f59f00');
  outerGrad.addColorStop(0.4, '#ffc300');
  outerGrad.addColorStop(1, '#ffe066');
  const innerGrad = ctx.createLinearGradient(0, 0, 0, -PL);
  innerGrad.addColorStop(0, '#e67700');
  innerGrad.addColorStop(1, '#fab005');

  const stars = makeStars(w, h * 0.7, Math.round((w * h) / 9000));
  const pollen = Array.from({ length: 36 }, () => ({
    x: rand(0, w), y: rand(0, h), speed: rand(12, 30), phase: rand(0, TAU), r: rand(1, 2.4),
  }));

  const spacing = (D * 0.92) / Math.sqrt(SEEDS);
  const seeds = Array.from({ length: SEEDS }, (_, i) => {
    const rr = spacing * Math.sqrt(i + 0.5);
    const a = i * GOLDEN_ANGLE;
    const edge = i > SEEDS * 0.82;
    return {
      x: Math.cos(a) * rr,
      y: Math.sin(a) * rr,
      r: spacing * (0.42 + 0.18 * (i / SEEDS)),
      color: edge ? (i % 2 ? '#b5651d' : '#9c5518') : (i % 2 ? '#4a2c12' : '#6b3e17'),
    };
  });

  const stemBase = { x: cx, y: h + 10 };

  return (t) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    drawStars(ctx, stars, t);

    const glow = easeOutCubic(clamp((t - 2.5) / 2));
    if (glow > 0) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.08);
      ctx.fillStyle = `rgba(255, 214, 90, ${0.06 * glow})`;
      const far = Math.max(w, h);
      for (let k = 0; k < 14; k++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, far, (k * TAU) / 14, (k * TAU) / 14 + TAU / 28);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = glow;
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#ffe8a3';
    for (const p of pollen) {
      const y = (((p.y - t * p.speed) % h) + h) % h;
      ctx.globalAlpha = 0.25 + 0.3 * Math.sin(t * 1.7 + p.phase);
      ctx.beginPath();
      ctx.arc(p.x + Math.sin(t + p.phase) * 12, y, p.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const fx = cx + Math.sin(t * 0.7) * D * 0.08;
    const fy = cy + Math.sin(t * 1.1) * D * 0.04;

    // Tallo y hojas
    const grow = easeOutCubic(clamp(t / 1.2));
    const tip = { x: fx, y: fy };
    const ctrl = { x: cx - D * 0.3, y: (stemBase.y + fy) / 2 };
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2b8a3e';
    ctx.lineWidth = D * 0.16;
    if (grow > 0) strokePartialCurve(ctx, stemBase, ctrl, tip, grow);
    for (const [u, side] of [[0.3, -1], [0.55, 1]]) {
      const leaf = easeOutBack(clamp((grow - u - 0.1) / 0.3));
      if (leaf <= 0.01) continue;
      const p = qpoint(stemBase, ctrl, tip, u);
      const d = qderiv(stemBase, ctrl, tip, u);
      drawLeaf(ctx, p.x, p.y, D * 0.95 * leaf, Math.atan2(d.y, d.x) + side * 0.9, '#40a34f');
    }

    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(Math.sin(t * 0.5) * 0.06);

    for (let k = 0; k < PETALS; k++) {
      const p = easeOutBack(clamp((t - 2.6 - k * 0.025) / 0.7));
      if (p > 0.01) drawPetal(ctx, (k * TAU) / PETALS, D * 0.88, PL * p, D * 0.26, outerGrad);
    }
    for (let k = 0; k < PETALS; k++) {
      const p = easeOutBack(clamp((t - 3.0 - k * 0.025) / 0.7));
      if (p > 0.01) drawPetal(ctx, ((k + 0.5) * TAU) / PETALS, D * 0.85, PL * 0.78 * p, D * 0.22, innerGrad);
    }

    const disk = easeOutCubic(clamp((t - 0.9) / 0.5));
    if (disk > 0) {
      ctx.fillStyle = '#3b2210';
      ctx.beginPath();
      ctx.arc(0, 0, D * disk, 0, TAU);
      ctx.fill();
    }

    for (let i = 0; i < SEEDS; i++) {
      const q = clamp((t - 1.1 - (i / SEEDS) * 1.6) / 0.3);
      if (q <= 0) break;
      const s = seeds[i];
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * q, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };
}

function drawPetal(ctx, angle, offset, length, width, fill) {
  ctx.save();
  ctx.rotate(angle);
  ctx.translate(0, -offset);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(width, -length * 0.25, width * 0.6, -length * 0.85, 0, -length);
  ctx.bezierCurveTo(-width * 0.6, -length * 0.85, -width, -length * 0.25, 0, 0);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 110, 0, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -length * 0.8);
  ctx.stroke();
  ctx.restore();
}
