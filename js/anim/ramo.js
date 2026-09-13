import {
  TAU, clamp, rand, easeOutCubic, easeOutBack,
  qpoint, qderiv, strokePartialCurve, makeStars, drawStars, drawLeaf,
} from './util.js';

const GROW = 1.5;
const BLOOM = 1.1;

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.78);
  const cx = w / 2;
  const baseY = h * 0.9;
  const stemWidth = Math.max(2, S * 0.008);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#070b1f');
  bg.addColorStop(0.6, '#1a1238');
  bg.addColorStop(1, '#2d1840');

  const stars = makeStars(w, h * 0.75, Math.round((w * h) / 7000));
  const fireflies = Array.from({ length: 16 }, () => ({
    x: rand(0, w), y: rand(0, h), speed: rand(10, 26), phase: rand(0, TAU), size: rand(1.2, 2.6),
  }));

  const flowers = [];
  const addRow = (count, spread, length, size, delayBase) => {
    for (let i = 0; i < count; i++) {
      const f = i / (count - 1);
      const angle = (f - 0.5) * spread + rand(-0.05, 0.05);
      const len = S * (length + rand(-0.025, 0.025));
      const base = { x: cx + (f - 0.5) * S * 0.05, y: baseY };
      const tip = { x: cx + Math.sin(angle) * len, y: baseY - Math.cos(angle) * len };
      const bend = rand(-0.12, 0.12);
      flowers.push({
        base,
        tip,
        ctrl: {
          x: (base.x + tip.x) / 2 + Math.cos(angle) * len * bend,
          y: (base.y + tip.y) / 2 + Math.sin(angle) * len * bend,
        },
        r: S * 0.07 * size * rand(0.9, 1.1),
        delay: delayBase + Math.abs(f - 0.5) * 1.2 + rand(0, 0.25),
        rotation: rand(0, TAU),
        side: i % 2 ? 1 : -1,
        phase: rand(0, TAU),
      });
    }
  };
  addRow(5, 1.15, 0.56, 1.05, 0.2); // fila trasera, tallos largos
  addRow(4, 0.95, 0.38, 0.9, 0.9); // fila delantera

  return (t) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    drawStars(ctx, stars, t);

    ctx.fillStyle = '#ffe066';
    for (const ff of fireflies) {
      const y = (((ff.y - t * ff.speed) % h) + h) % h;
      const x = ff.x + Math.sin(t * 0.8 + ff.phase) * 18;
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + ff.phase);
      ctx.beginPath();
      ctx.arc(x, y, ff.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const states = flowers.map((fl) => {
      const grow = easeOutCubic(clamp((t - fl.delay) / GROW));
      const sway = Math.sin(t * 1.2 + fl.phase) * S * 0.01 * grow;
      return {
        fl,
        grow,
        tip: { x: fl.tip.x + sway, y: fl.tip.y },
        ctrl: { x: fl.ctrl.x + sway * 0.4, y: fl.ctrl.y },
      };
    });

    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2f9e44';
    ctx.lineWidth = stemWidth;
    for (const s of states) {
      if (s.grow > 0) strokePartialCurve(ctx, s.fl.base, s.ctrl, s.tip, s.grow);
    }

    for (const s of states) {
      const leaf = easeOutBack(clamp((s.grow - 0.5) / 0.4));
      if (leaf <= 0.01) continue;
      const p = qpoint(s.fl.base, s.ctrl, s.tip, 0.45);
      const d = qderiv(s.fl.base, s.ctrl, s.tip, 0.45);
      drawLeaf(ctx, p.x, p.y, S * 0.075 * leaf, Math.atan2(d.y, d.x) + s.fl.side * 0.8);
    }

    drawWrap(ctx, cx, baseY, S, clamp(t / 0.8));

    for (const s of states) {
      const bloom = easeOutBack(clamp((t - s.fl.delay - GROW * 0.85) / BLOOM));
      if (bloom > 0.01) {
        drawFlower(ctx, s.tip.x, s.tip.y, s.fl.r, bloom, s.fl.rotation + Math.sin(t * 0.6 + s.fl.phase) * 0.1);
      }
    }
  };
}

function drawFlower(ctx, x, y, r, bloom, rotation) {
  const petals = 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  for (let layer = 0; layer < 2; layer++) {
    const pr = r * (layer ? 0.82 : 1) * bloom;
    const grad = ctx.createLinearGradient(0, 0, 0, -pr);
    grad.addColorStop(0, layer ? '#ffb700' : '#f08c00');
    grad.addColorStop(1, layer ? '#ffe066' : '#ffc300');
    ctx.fillStyle = grad;
    for (let k = 0; k < petals; k++) {
      ctx.save();
      ctx.rotate((k * TAU) / petals + (layer * TAU) / (2 * petals));
      ctx.beginPath();
      ctx.ellipse(0, -pr * 0.55, pr * 0.2, pr * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  const cr = r * 0.3 * bloom;
  const center = ctx.createRadialGradient(-cr * 0.3, -cr * 0.3, 0, 0, 0, cr);
  center.addColorStop(0, '#b5651d');
  center.addColorStop(1, '#5c2c06');
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, cr, 0, TAU);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 210, 120, 0.7)';
  for (let k = 0; k < 7; k++) {
    const a = (k * TAU) / 7;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * cr * 0.55, Math.sin(a) * cr * 0.55, cr * 0.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// Papel de envoltura con moño.
function drawWrap(ctx, cx, baseY, S, alpha) {
  if (alpha <= 0) return;
  const top = baseY - S * 0.17;
  const half = S * 0.2;
  const bottom = baseY + S * 0.3;

  ctx.save();
  ctx.globalAlpha = alpha;

  const paper = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
  paper.addColorStop(0, '#9d4edd');
  paper.addColorStop(0.5, '#e0aaff');
  paper.addColorStop(1, '#7b2cbf');
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.moveTo(cx - half, top);
  ctx.quadraticCurveTo(cx - half * 0.5, top + S * 0.04, cx, top);
  ctx.quadraticCurveTo(cx + half * 0.5, top + S * 0.04, cx + half, top);
  ctx.lineTo(cx + S * 0.04, bottom);
  ctx.lineTo(cx - S * 0.04, bottom);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.beginPath();
  ctx.moveTo(cx - half, top);
  ctx.lineTo(cx - S * 0.01, bottom);
  ctx.lineTo(cx - S * 0.04, bottom);
  ctx.closePath();
  ctx.fill();

  const bowY = baseY + S * 0.06;
  ctx.fillStyle = '#ffd43b';
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + dir * S * 0.04, bowY, S * 0.042, S * 0.022, dir * 0.45, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#ffd43b';
  ctx.lineWidth = Math.max(2, S * 0.01);
  ctx.beginPath();
  ctx.moveTo(cx, bowY);
  ctx.lineTo(cx - S * 0.03, bowY + S * 0.08);
  ctx.moveTo(cx, bowY);
  ctx.lineTo(cx + S * 0.035, bowY + S * 0.075);
  ctx.stroke();
  ctx.fillStyle = '#fab005';
  ctx.beginPath();
  ctx.arc(cx, bowY, S * 0.016, 0, TAU);
  ctx.fill();

  ctx.restore();
}
