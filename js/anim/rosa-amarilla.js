import { TAU, clamp, rand, easeOutCubic, easeOutBack, qpoint, qderiv, strokePartialCurve } from './util.js';

const PETALS = 34;
const SPIRAL = (137.508 * Math.PI) / 180;

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const scale = Math.min(2, Math.max(1, dpr));
  const cx = w / 2;
  const cy = h * 0.52;
  const R = S * 0.34;

  // Fondo cálido con bokeh, dibujado pequeño y ampliado para que quede desenfocado
  const blur = 6;
  const small = document.createElement('canvas');
  small.width = Math.ceil((w * scale) / blur);
  small.height = Math.ceil((h * scale) / blur);
  const s = small.getContext('2d');
  s.scale(scale / blur, scale / blur);
  const base = s.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.85);
  base.addColorStop(0, '#4a3510');
  base.addColorStop(0.5, '#21180a');
  base.addColorStop(1, '#070503');
  s.fillStyle = base;
  s.fillRect(0, 0, w, h);
  for (let i = 0; i < 30; i++) {
    const x = rand(0, w);
    const y = rand(0, h);
    const r = S * rand(0.05, 0.16);
    const a = rand(0.15, 0.45);
    const warm = Math.random() < 0.7;
    s.fillStyle = warm ? `rgba(255, 196, 80, ${a})` : `rgba(150, 190, 90, ${a * 0.7})`;
    s.beginPath();
    s.arc(x, y, r, 0, TAU);
    s.fill();
  }
  const backdrop = document.createElement('canvas');
  backdrop.width = Math.ceil(w * scale);
  backdrop.height = Math.ceil(h * scale);
  const b = backdrop.getContext('2d');
  b.imageSmoothingQuality = 'high';
  b.drawImage(small, 0, 0, backdrop.width, backdrop.height);

  const petals = Array.from({ length: PETALS }, (_, i) => {
    const k = (i + 1) / PETALS;
    return {
      angle: i * SPIRAL + rand(-0.08, 0.08),
      dist: R * 0.42 * Math.sqrt(k),
      len: R * (0.28 + 0.62 * k),
      wide: R * (0.2 + 0.36 * k),
      k,
      hue: rand(-3, 3),
      delay: 0.5 + (1 - k) * 2.6,
    };
  }).reverse();

  const drops = Array.from({ length: 7 }, () => ({
    petal: Math.floor(rand(0, PETALS * 0.5)), u: rand(0.5, 0.85), side: rand(-0.4, 0.4), r: S * rand(0.006, 0.011), phase: rand(0, TAU),
  }));
  const motes = Array.from({ length: 36 }, () => ({
    x: rand(0, w), y: rand(0, h), r: rand(0.6, 1.8), speed: rand(6, 18), phase: rand(0, TAU),
  }));
  const stemBase = { x: cx + S * 0.06, y: h + 10 };
  const stemCtrl = { x: cx - S * 0.14, y: (h + cy) / 2 };
  const stemTop = { x: cx, y: cy + R * 0.3 };

  const vignette = ctx.createRadialGradient(cx, cy, S * 0.4, cx, cy, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

  return (t) => {
    ctx.drawImage(backdrop, 0, 0, w, h);

    const bloom = easeOutCubic(clamp((t - 0.5) / 3.2));
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.4);
    halo.addColorStop(0, `rgba(255, 210, 90, ${0.3 * bloom})`);
    halo.addColorStop(1, 'rgba(255, 210, 90, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    // Tallo con espinas y hojas
    const grow = easeOutCubic(clamp(t / 1.2));
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1d4a28';
    ctx.lineWidth = S * 0.026;
    strokePartialCurve(ctx, stemBase, stemCtrl, stemTop, grow);
    ctx.save();
    ctx.translate(-S * 0.005, 0);
    ctx.strokeStyle = 'rgba(130, 200, 110, 0.45)';
    ctx.lineWidth = S * 0.007;
    strokePartialCurve(ctx, stemBase, stemCtrl, stemTop, grow);
    ctx.restore();
    [0.3, 0.5, 0.66, 0.82].forEach((u, i) => {
      if (grow < u) return;
      const p = qpoint(stemBase, stemCtrl, stemTop, u);
      const d = qderiv(stemBase, stemCtrl, stemTop, u);
      const a = Math.atan2(d.y, d.x) + (i % 2 ? 1 : -1) * 1.2;
      ctx.fillStyle = '#2c4a1e';
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(a + 1.2) * S * 0.008, p.y + Math.sin(a + 1.2) * S * 0.008);
      ctx.lineTo(p.x + Math.cos(a) * S * 0.03, p.y + Math.sin(a) * S * 0.03);
      ctx.lineTo(p.x + Math.cos(a - 1.2) * S * 0.008, p.y + Math.sin(a - 1.2) * S * 0.008);
      ctx.fill();
    });
    for (const [u, side, len] of [[0.42, -1, S * 0.24], [0.64, 1, S * 0.19]]) {
      const leaf = easeOutBack(clamp((grow - u + 0.15) / 0.35));
      if (leaf <= 0.01) continue;
      const p = qpoint(stemBase, stemCtrl, stemTop, u);
      const d = qderiv(stemBase, stemCtrl, stemTop, u);
      drawRoseLeaf(ctx, p.x, p.y, len * leaf, Math.atan2(d.y, d.x) + side * 0.9);
    }

    // Cabeza de la rosa, vista un poco desde arriba
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 0.8) * 0.03);
    ctx.scale(1, 0.8);
    ctx.fillStyle = '#23421c';
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate(Math.PI / 2 + (i - 2) * 0.45);
      ctx.beginPath();
      ctx.moveTo(0, -R * 0.08);
      ctx.quadraticCurveTo(R * 0.35, R * 0.1, R * 0.62 * (0.6 + 0.4 * bloom), 0);
      ctx.quadraticCurveTo(R * 0.35, -R * 0.1, 0, R * 0.08);
      ctx.fill();
      ctx.restore();
    }
    const placed = [];
    for (const p of petals) {
      const open = easeOutCubic(clamp((t - p.delay) / 1.4));
      const len = p.len * (0.35 + 0.65 * open);
      const dist = p.dist * (0.4 + 0.6 * open);
      const wide = p.wide * (0.75 + 0.25 * open);
      drawRosePetal(ctx, p, len, dist, wide);
      placed.push({ angle: p.angle, len, dist, wide, open });
    }
    ctx.strokeStyle = 'rgba(120, 60, 0, 0.45)';
    ctx.lineWidth = Math.max(1, R * 0.012);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(R * 0.01, 0, R * 0.05 * (k + 1), k * 1.7, k * 1.7 + Math.PI * 1.3);
      ctx.stroke();
    }

    for (const d of drops) {
      const p = placed[d.petal];
      if (!p || p.open < 0.7) continue;
      const along = p.dist + p.len * d.u;
      const across = p.wide * d.side;
      const x = Math.cos(p.angle) * along - Math.sin(p.angle) * across;
      const y = Math.sin(p.angle) * along + Math.cos(p.angle) * across;
      ctx.globalAlpha = clamp((p.open - 0.7) / 0.3);
      drawDew(ctx, x, y, d.r, 0.5 + 0.5 * Math.sin(t * 3 + d.phase));
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#ffe8a3';
    for (const m of motes) {
      const y = (((m.y - t * m.speed) % h) + h) % h;
      ctx.globalAlpha = 0.15 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2 + m.phase));
      ctx.beginPath();
      ctx.arc(m.x + Math.sin(t * 0.7 + m.phase) * 8, y, m.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  };
}

// Pétalo acopado: base oscura, borde claro enrollado y vena tenue.
function drawRosePetal(ctx, p, len, dist, wide) {
  ctx.save();
  ctx.rotate(p.angle);
  ctx.translate(dist, 0);
  const g = ctx.createLinearGradient(-len * 0.25, 0, len, 0);
  g.addColorStop(0, `hsl(${38 + p.hue}, 95%, ${32 + 10 * p.k}%)`);
  g.addColorStop(0.55, `hsl(${45 + p.hue}, 100%, ${54 + 6 * p.k}%)`);
  g.addColorStop(1, `hsl(${50 + p.hue}, 100%, ${73 + 8 * p.k}%)`);
  ctx.beginPath();
  ctx.moveTo(-len * 0.25, -wide * 0.25);
  ctx.bezierCurveTo(len * 0.2, -wide * 1.05, len * 0.85, -wide * 0.95, len, -wide * 0.15);
  ctx.quadraticCurveTo(len * 1.06, 0, len, wide * 0.15);
  ctx.bezierCurveTo(len * 0.85, wide * 0.95, len * 0.2, wide * 1.05, -len * 0.25, wide * 0.25);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  const shadow = ctx.createLinearGradient(-len * 0.25, 0, len * 0.6, 0);
  shadow.addColorStop(0, 'rgba(90, 40, 0, 0.45)');
  shadow.addColorStop(1, 'rgba(90, 40, 0, 0)');
  ctx.fillStyle = shadow;
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 248, 210, ${0.3 + 0.35 * p.k})`;
  ctx.lineWidth = Math.max(1, len * 0.03);
  ctx.beginPath();
  ctx.moveTo(len * 0.5, -wide * 0.92);
  ctx.bezierCurveTo(len * 0.85, -wide * 0.9, len * 1.05, -wide * 0.2, len, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(200, 120, 0, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len * 0.8, 0);
  ctx.stroke();
  ctx.restore();
}

// Hoja aserrada con nervaduras.
function drawRoseLeaf(ctx, x, y, len, angle) {
  if (len < 1) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const wide = len * 0.38;
  const teeth = 9;
  const half = (u) => Math.sin(u * Math.PI) * wide * (1 - u * 0.25);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let i = 1; i <= teeth; i++) {
    const u = i / teeth;
    ctx.lineTo(u * len - (len / teeth) * 0.5, -half(u) * 0.9);
    ctx.lineTo(u * len, -half(u));
  }
  for (let i = teeth; i >= 1; i--) {
    const u = i / teeth;
    ctx.lineTo(u * len, half(u));
    ctx.lineTo(u * len - (len / teeth) * 0.5, half(u) * 0.9);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -wide, 0, wide);
  g.addColorStop(0, '#5a9a42');
  g.addColorStop(0.5, '#2f6b2c');
  g.addColorStop(1, '#173d1d');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(190, 230, 150, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len * 0.95, 0);
  for (let i = 1; i <= 5; i++) {
    const u = i / 6;
    ctx.moveTo(u * len, 0);
    ctx.lineTo(u * len + len * 0.1, -half(u) * 0.7);
    ctx.moveTo(u * len, 0);
    ctx.lineTo(u * len + len * 0.1, half(u) * 0.7);
  }
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.restore();
}

// Gota de rocío con reflejo y cáustica.
function drawDew(ctx, x, y, r, sparkle) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255, 255, 240, 0.55)');
  g.addColorStop(0.5, 'rgba(255, 240, 180, 0.12)');
  g.addColorStop(0.85, 'rgba(120, 70, 0, 0.18)');
  g.addColorStop(1, 'rgba(90, 50, 0, 0.45)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + 0.4 * sparkle})`;
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.38, r * 0.22, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 250, 220, 0.35)';
  ctx.beginPath();
  ctx.arc(x + r * 0.3, y + r * 0.35, r * 0.18, 0, TAU);
  ctx.fill();
}
