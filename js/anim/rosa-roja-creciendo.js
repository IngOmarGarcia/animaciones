import {
  TAU, clamp, rand, lerp, easeOutCubic, easeInOut, rgbaOf, glow, sparkle, softBackdrop, makeVignette, makeStars, drawStars,
} from './util.js';

// ✏️ Colores de la rosa y del amanecer
const PETAL_HUE = 350;
const STEM = '#1f5a2c';
const DAWN = [255, 170, 130];

// Guion (segundos)
const GROW = 3.2; // el tallo termina de crecer
const BLOOM_START = 3.4; // empiezan a abrirse los pétalos
const BLOOM = 5.8; // flor abierta: momento WOW
const PETALS = 30;
const SPIRAL = (137.508 * Math.PI) / 180;

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const ground = h * 0.88;
  const R = S * 0.26;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const night = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#03040c');
    grad.addColorStop(1, '#141a33');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const dawn = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2a1640');
    grad.addColorStop(0.55, '#8a3a5c');
    grad.addColorStop(0.85, '#f39070');
    grad.addColorStop(1, '#ffc58f');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      g.fillStyle = `rgba(255, ${Math.round(rand(170, 220))}, 150, ${rand(0.12, 0.3)})`;
      g.beginPath();
      g.arc(rand(0, w), rand(h * 0.4, h), S * rand(0.05, 0.14), 0, TAU);
      g.fill();
    }
  });
  const stars = makeStars(w, h * 0.7, Math.round((w * h) / 3000));
  const vignette = makeVignette(ctx, w, h, 0.6);

  // Camino del tallo en S desde la tierra hasta la flor
  const top = { x: w * 0.52, y: h * 0.4 };
  const path = Array.from({ length: 60 }, (_, i) => {
    const u = i / 59;
    return { x: lerp(w * 0.48, top.x, u) + Math.sin(u * Math.PI * 1.6) * S * 0.07 * (1 - u * 0.6), y: lerp(ground + 4, top.y, u) };
  });
  const leaves = [[0.28, -1, 0.26], [0.46, 1, 0.22], [0.62, -1, 0.18]];
  const thorns = [0.18, 0.36, 0.54, 0.72, 0.84];
  const petals = Array.from({ length: PETALS }, (_, i) => {
    const k = (i + 1) / PETALS;
    return { angle: i * SPIRAL + rand(-0.08, 0.08), dist: R * 0.4 * Math.sqrt(k), len: R * (0.3 + 0.62 * k), wide: R * (0.2 + 0.34 * k), k, delay: BLOOM_START + (1 - k) * 1.8, hue: rand(-4, 4) };
  }).reverse();
  const grass = Array.from({ length: Math.round(w / 5) }, () => ({ x: rand(0, w), len: rand(6, 22), lean: rand(-0.4, 0.4), phase: rand(0, TAU) }));
  const falling = Array.from({ length: calm ? 2 : 6 }, (_, i) => ({ start: BLOOM + 1 + i * 1.3, dx: rand(-1, 1), spin: rand(-3, 3), size: rand(0.8, 1.2) }));

  const pointAt = (u) => {
    const f = clamp(u) * (path.length - 1);
    const i = Math.min(path.length - 2, Math.floor(f));
    const k = f - i;
    return { x: lerp(path[i].x, path[i + 1].x, k), y: lerp(path[i].y, path[i + 1].y, k), dx: path[i + 1].x - path[i].x, dy: path[i + 1].y - path[i].y };
  };

  return (t, dt) => {
    const grow = easeInOut(clamp((t - 0.3) / GROW));
    const sky = easeInOut(clamp(t / BLOOM));
    const sway = Math.sin(t * 0.9) * S * 0.01 * grow;
    const wow = t > BLOOM ? Math.exp(-(t - BLOOM) * 2) : 0;

    ctx.drawImage(night, 0, 0, w, h);
    ctx.globalAlpha = sky;
    ctx.drawImage(dawn, 0, 0, w, h);
    ctx.globalAlpha = 1 - sky * 0.9;
    drawStars(ctx, stars, t);
    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, w * 0.5, ground, S * 1.2, DAWN, 0.25 * sky);
    glow(ctx, top.x, top.y, R * 3, [255, 120, 150], 0.12 * clamp((t - BLOOM_START) / 2) + 0.4 * wow);
    ctx.globalCompositeOperation = 'source-over';

    // Tallo que crece con luz lateral
    const tipCount = Math.max(2, Math.round(grow * (path.length - 1)));
    for (const [color, width, offset] of [[STEM, S * 0.024, 0], ['rgba(140, 210, 120, 0.5)', S * 0.007, -S * 0.006]]) {
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < tipCount; i++) {
        const u = i / (path.length - 1);
        ctx.lineWidth = width * (1 - u * 0.45);
        ctx.beginPath();
        ctx.moveTo(path[i - 1].x + offset + sway * (u - 0.02), path[i - 1].y);
        ctx.lineTo(path[i].x + offset + sway * u, path[i].y);
        ctx.stroke();
      }
    }
    for (const [u, side] of thorns.map((u, i) => [u, i % 2 ? 1 : -1])) {
      if (grow < u) continue;
      const p = pointAt(u);
      const a = Math.atan2(p.dy, p.dx) + side * 1.3;
      ctx.fillStyle = '#2e4a1e';
      ctx.beginPath();
      ctx.moveTo(p.x + sway * u - Math.sin(a) * S * 0.006, p.y + Math.cos(a) * S * 0.006);
      ctx.lineTo(p.x + sway * u + Math.cos(a) * S * 0.03, p.y + Math.sin(a) * S * 0.03);
      ctx.lineTo(p.x + sway * u + Math.sin(a) * S * 0.006, p.y - Math.cos(a) * S * 0.006);
      ctx.fill();
    }
    for (const [u, side, size] of leaves) {
      const open = easeOutCubic(clamp((grow - u) / 0.25));
      if (open <= 0.01) continue;
      const p = pointAt(u);
      drawLeafSerrated(ctx, p.x + sway * u, p.y, S * size * open, Math.atan2(p.dy, p.dx) + side * (0.5 + 0.5 * open), side);
    }

    // Tierra y pasto
    const soil = ctx.createLinearGradient(0, ground - 6, 0, h);
    soil.addColorStop(0, '#1b120c');
    soil.addColorStop(1, '#060403');
    ctx.fillStyle = soil;
    ctx.fillRect(0, ground, w, h - ground);
    ctx.strokeStyle = `rgba(${Math.round(lerp(20, 60, sky))}, ${Math.round(lerp(50, 90, sky))}, 30, 0.9)`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const b of grass) {
      const bend = b.lean + Math.sin(t * 1.4 + b.phase) * 0.12;
      ctx.moveTo(b.x, ground + 2);
      ctx.quadraticCurveTo(b.x + bend * b.len * 0.3, ground - b.len * 0.5, b.x + bend * b.len, ground - b.len);
    }
    ctx.stroke();

    // Capullo y flor
    const tip = { x: top.x + sway, y: top.y };
    if (grow > 0.9) {
      const bud = clamp((grow - 0.9) / 0.1);
      ctx.save();
      ctx.translate(tip.x, tip.y);
      ctx.scale(1, 0.82);
      ctx.fillStyle = '#23501f';
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate(Math.PI / 2 + (i - 2) * 0.5);
        ctx.beginPath();
        ctx.moveTo(0, -R * 0.08);
        ctx.quadraticCurveTo(R * 0.3, 0, R * 0.55 * bud, 0);
        ctx.quadraticCurveTo(R * 0.3, R * 0.05, 0, R * 0.08);
        ctx.fill();
        ctx.restore();
      }
      for (const p of petals) {
        const open = easeOutCubic(clamp((t - p.delay) / 1.4));
        drawVelvetPetal(ctx, p, p.len * (0.3 + 0.7 * open) * bud, p.dist * (0.35 + 0.65 * open), p.wide * (0.7 + 0.3 * open) * bud);
      }
      ctx.restore();
    }

    // Momento WOW y pétalos que caen
    ctx.globalCompositeOperation = 'lighter';
    if (wow > 0.02) {
      glow(ctx, tip.x, tip.y, R * 4, [255, 200, 210], 0.5 * wow);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + t;
        const d = R * (1.2 + (1 - wow) * 2);
        sparkle(ctx, tip.x + Math.cos(a) * d, tip.y + Math.sin(a) * d * 0.8, S * 0.02, [255, 210, 220], wow);
      }
    }
    if (t > BLOOM) {
      for (let i = 0; i < 6; i++) {
        const tw = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.9);
        const a = i + t * 0.25;
        sparkle(ctx, tip.x + Math.cos(a) * R * 1.8, tip.y + Math.sin(a) * R * 1.2, S * 0.01 * tw, [255, 220, 200], 0.6 * tw);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const f of falling) {
      const life = ((t - f.start) % 8 + 8) % 8;
      if (t < f.start || life > 4) continue;
      const x = tip.x + f.dx * R * 0.6 + Math.sin(life * 2) * S * 0.05;
      const y = tip.y + R * 0.3 + life * life * S * 0.06;
      if (y > ground) continue;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(life * f.spin);
      ctx.scale(Math.cos(life * 3) * f.size, f.size);
      ctx.fillStyle = `hsl(${PETAL_HUE}, 80%, 38%)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, S * 0.02, S * 0.012, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (dt !== undefined && t < 0.8) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - t / 0.8})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}

// Pétalo de terciopelo: base casi negra, cuerpo carmín y borde con luz.
function drawVelvetPetal(ctx, p, len, dist, wide) {
  if (len < 0.5) return;
  ctx.save();
  ctx.rotate(p.angle);
  ctx.translate(dist, 0);
  const g = ctx.createLinearGradient(-len * 0.25, 0, len, 0);
  g.addColorStop(0, `hsl(${PETAL_HUE + p.hue}, 85%, ${12 + 8 * p.k}%)`);
  g.addColorStop(0.55, `hsl(${PETAL_HUE + p.hue}, 88%, ${30 + 8 * p.k}%)`);
  g.addColorStop(1, `hsl(${PETAL_HUE + 4 + p.hue}, 90%, ${48 + 10 * p.k}%)`);
  ctx.beginPath();
  ctx.moveTo(-len * 0.25, -wide * 0.25);
  ctx.bezierCurveTo(len * 0.2, -wide * 1.05, len * 0.85, -wide * 0.95, len, -wide * 0.15);
  ctx.quadraticCurveTo(len * 1.06, 0, len, wide * 0.15);
  ctx.bezierCurveTo(len * 0.85, wide * 0.95, len * 0.2, wide * 1.05, -len * 0.25, wide * 0.25);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 170, 180, ${0.2 + 0.35 * p.k})`;
  ctx.lineWidth = Math.max(0.8, len * 0.03);
  ctx.beginPath();
  ctx.moveTo(len * 0.5, -wide * 0.92);
  ctx.bezierCurveTo(len * 0.85, -wide * 0.9, len * 1.05, -wide * 0.2, len, 0);
  ctx.stroke();
  ctx.restore();
}

function drawLeafSerrated(ctx, x, y, len, angle, side) {
  if (len < 1) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const wide = len * 0.36;
  const teeth = 8;
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
  const g = ctx.createLinearGradient(0, -wide * side, 0, wide * side);
  g.addColorStop(0, '#5c9a42');
  g.addColorStop(1, '#173d1d');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(190, 230, 150, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len * 0.95, 0);
  ctx.stroke();
  ctx.restore();
}
