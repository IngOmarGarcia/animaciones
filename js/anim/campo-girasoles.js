import { TAU, clamp, rand, easeOutCubic, drawLeaf } from './util.js';

const SEED_ANGLE = (137.508 * Math.PI) / 180;

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const scale = Math.min(2, Math.max(1, dpr));
  const horizon = h * 0.5;
  const sunX = w * 0.7;
  const sunY = horizon - h * 0.05;

  // Cielo, sol, nubes, colinas y campo lejano pre-renderizados
  const backdrop = document.createElement('canvas');
  backdrop.width = Math.ceil(w * scale);
  backdrop.height = Math.ceil(h * scale);
  const b = backdrop.getContext('2d');
  b.scale(scale, scale);

  const sky = b.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#1b2a5e');
  sky.addColorStop(0.4, '#6a3d7a');
  sky.addColorStop(0.75, '#ef8a4c');
  sky.addColorStop(1, '#ffd27a');
  b.fillStyle = sky;
  b.fillRect(0, 0, w, horizon + 1);

  for (let c = 0; c < 7; c++) {
    const x0 = rand(-w * 0.1, w * 1.1);
    const y0 = rand(h * 0.06, horizon * 0.75);
    const size = S * rand(0.12, 0.28);
    const g = b.createLinearGradient(0, y0 - size * 0.4, 0, y0 + size * 0.3);
    g.addColorStop(0, 'rgba(80, 55, 105, 0.35)');
    g.addColorStop(1, 'rgba(255, 165, 110, 0.4)');
    b.fillStyle = g;
    for (let k = 0; k < 9; k++) {
      b.beginPath();
      b.ellipse(x0 + rand(-size, size), y0 + rand(-size * 0.2, size * 0.2), size * rand(0.35, 0.7), size * rand(0.16, 0.28), 0, 0, TAU);
      b.fill();
    }
  }

  b.globalCompositeOperation = 'lighter';
  const glow = b.createRadialGradient(sunX, sunY, 0, sunX, sunY, S * 1.1);
  glow.addColorStop(0, 'rgba(255, 220, 150, 0.9)');
  glow.addColorStop(0.15, 'rgba(255, 180, 90, 0.45)');
  glow.addColorStop(1, 'rgba(255, 120, 60, 0)');
  b.fillStyle = glow;
  b.fillRect(0, 0, w, h);
  b.globalCompositeOperation = 'source-over';
  b.fillStyle = '#fff6dc';
  b.beginPath();
  b.arc(sunX, sunY, S * 0.06, 0, TAU);
  b.fill();

  [[0.05, 'rgba(125, 80, 110, 0.75)'], [0.028, 'rgba(90, 58, 70, 0.9)']].forEach(([lift, color], layer) => {
    b.fillStyle = color;
    b.beginPath();
    b.moveTo(0, horizon);
    for (let x = 0; x <= w + w / 24; x += w / 24) {
      b.lineTo(x, horizon - h * lift * (0.55 + 0.45 * Math.sin(x * 0.013 + layer * 2.3)));
    }
    b.lineTo(w, horizon);
    b.closePath();
    b.fill();
  });

  const field = b.createLinearGradient(0, horizon, 0, h);
  field.addColorStop(0, '#8a6a2a');
  field.addColorStop(0.25, '#5b5a1c');
  field.addColorStop(1, '#1f2e0e');
  b.fillStyle = field;
  b.fillRect(0, horizon, w, h - horizon);
  for (let i = 0; i < 3000; i++) {
    const z = Math.random() ** 2;
    const size = 0.6 + z * 3;
    b.fillStyle = Math.random() < 0.75 ? `rgba(255, ${190 + Math.round(rand(0, 40))}, 60, ${Math.min(1, 0.35 + z)})` : `rgba(40, 30, 10, ${Math.min(1, 0.3 + z)})`;
    b.fillRect(rand(0, w), horizon + z * h * 0.22, size, size * 0.7);
  }
  const haze = b.createLinearGradient(0, horizon - h * 0.04, 0, horizon + h * 0.12);
  haze.addColorStop(0, 'rgba(255, 200, 140, 0)');
  haze.addColorStop(0.4, 'rgba(255, 200, 140, 0.35)');
  haze.addColorStop(1, 'rgba(255, 200, 140, 0)');
  b.fillStyle = haze;
  b.fillRect(0, horizon - h * 0.04, w, h * 0.16);

  const spriteR = Math.round(S * 0.3);
  const sprites = [makeSunflower(spriteR, scale), makeSunflower(spriteR, scale)];
  const mini = sprites.map((sprite) => softened(sprite, 4));
  const blurred = sprites.map((sprite) => softened(sprite, 12));

  const flowers = [
    ...Array.from({ length: 60 }, () => ({ z: Math.random() ** 0.8 * 0.85 + 0.05, x: rand(-w * 0.05, w * 1.05) })),
    { z: 0.8, x: w * 0.2 },
    { z: 0.88, x: w * 0.8 },
    { z: 0.72, x: w * 0.52 },
  ].map((f) => ({ ...f, sprite: Math.floor(rand(0, 2)), tilt: rand(-0.3, 0.3), turn: rand(0.75, 1), phase: rand(0, TAU) }))
    .sort((a, c) => a.z - c.z);

  const birds = Array.from({ length: 5 }, () => ({
    x: rand(-w * 0.6, w * 0.2), y: rand(h * 0.12, h * 0.3), speed: rand(14, 26), phase: rand(0, TAU), size: rand(3, 6),
  }));
  const dust = Array.from({ length: 40 }, () => ({
    x: rand(0, w), y: rand(horizon * 0.6, h), r: rand(0.6, 1.8), speed: rand(4, 12), phase: rand(0, TAU),
  }));
  const vignette = ctx.createRadialGradient(w / 2, h * 0.55, S * 0.4, w / 2, h * 0.55, Math.max(w, h) * 0.8);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(20, 5, 0, 0.55)');

  return (t) => {
    const zoom = 1 + 0.05 * easeOutCubic(clamp(t / 12));
    ctx.save();
    ctx.translate(w / 2, h * 0.6);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h * 0.6);
    ctx.drawImage(backdrop, 0, 0, w, h);

    ctx.strokeStyle = 'rgba(40, 20, 40, 0.7)';
    ctx.lineWidth = 1.2;
    for (const bird of birds) {
      const x = ((bird.x + t * bird.speed) % (w * 1.4)) - w * 0.1;
      const flap = Math.sin(t * 7 + bird.phase) * bird.size * 0.5;
      ctx.beginPath();
      ctx.moveTo(x - bird.size, bird.y - flap);
      ctx.quadraticCurveTo(x - bird.size * 0.4, bird.y - bird.size * 0.2, x, bird.y);
      ctx.quadraticCurveTo(x + bird.size * 0.4, bird.y - bird.size * 0.2, x + bird.size, bird.y - flap);
      ctx.stroke();
    }

    let hazeStep = 0;
    for (const f of flowers) {
      while (hazeStep < 2 && f.z > [0.3, 0.55][hazeStep]) {
        ctx.fillStyle = 'rgba(255, 190, 130, 0.1)';
        ctx.fillRect(0, horizon, w, h - horizon);
        hazeStep++;
      }
      const y = horizon + (h - horizon) * (0.04 + 0.9 * f.z ** 1.7);
      const r = S * (0.01 + 0.2 * f.z ** 2.3);
      const sway = Math.sin(t * 1.3 + f.phase + f.x * 0.01) * 0.06 * (0.3 + f.z);
      const hx = f.x + sway * r * 3;
      ctx.strokeStyle = f.z > 0.5 ? '#2d5016' : 'rgba(70, 70, 25, 0.9)';
      ctx.lineWidth = Math.max(1, r * 0.13);
      ctx.beginPath();
      ctx.moveTo(hx, y + r * 0.5);
      ctx.quadraticCurveTo(f.x + r * 0.2, y + r * 3, f.x, y + r * 7);
      ctx.stroke();
      if (f.z > 0.45) {
        drawLeaf(ctx, f.x + r * 0.1, y + r * 2.4, r * 1.5, -0.4, '#3f6b1f');
        drawLeaf(ctx, f.x, y + r * 3.4, r * 1.3, Math.PI + 0.4, '#355d19');
      }
      ctx.save();
      ctx.translate(hx, y);
      ctx.rotate(f.tilt + sway);
      ctx.scale(f.turn, 1);
      ctx.drawImage(r < 12 ? mini[f.sprite] : sprites[f.sprite], -r, -r, r * 2, r * 2);
      ctx.restore();
    }

    // Rayos dorados y polvo en el aire
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 5; k++) {
      const spread = 0.35 + k * 0.28 + Math.sin(t * 0.3 + k) * 0.03;
      ctx.fillStyle = 'rgba(255, 200, 120, 0.035)';
      ctx.beginPath();
      ctx.moveTo(sunX, sunY);
      ctx.lineTo(sunX - Math.cos(spread) * h * 1.4 - S * 0.08, sunY + Math.sin(spread) * h * 1.4);
      ctx.lineTo(sunX - Math.cos(spread) * h * 1.4 + S * 0.08, sunY + Math.sin(spread) * h * 1.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#ffe8a3';
    for (const m of dust) {
      ctx.globalAlpha = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.8 + m.phase));
      ctx.beginPath();
      ctx.arc(m.x + Math.sin(t * 0.5 + m.phase) * 14, m.y - ((t * m.speed) % (h * 0.5)), m.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Girasol desenfocado en primer plano
    ctx.save();
    ctx.translate(w * 0.08, h * 0.95);
    ctx.rotate(0.3 + Math.sin(t * 0.9) * 0.03);
    ctx.drawImage(blurred[0], -S * 0.36, -S * 0.36, S * 0.72, S * 0.72);
    ctx.restore();
    ctx.restore();

    const fade = 1 - clamp(t / 1.6);
    if (fade > 0) {
      ctx.fillStyle = `rgba(10, 5, 20, ${fade * 0.7})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  };
}

// Girasol detallado en un canvas propio: dos coronas de pétalos y disco de semillas en espiral.
function makeSunflower(radius, scale) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(radius * 2 * scale);
  canvas.height = canvas.width;
  const g = canvas.getContext('2d');
  g.scale(scale, scale);
  g.translate(radius, radius);
  const disk = radius * 0.36;

  for (const [count, len, offset, back] of [[24, radius * 0.98, 0.5, true], [22, radius * 0.9, 0, false]]) {
    for (let i = 0; i < count; i++) {
      const a = ((i + offset + rand(-0.15, 0.15)) / count) * TAU;
      const L = len * rand(0.86, 1);
      const W = radius * rand(0.1, 0.13);
      g.save();
      g.rotate(a);
      const grad = g.createLinearGradient(0, -disk * 0.8, 0, -L);
      grad.addColorStop(0, back ? '#b86a00' : '#e08f00');
      grad.addColorStop(0.4, back ? '#e3a000' : '#ffc21a');
      grad.addColorStop(1, back ? '#f2b705' : '#ffe14d');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(-W * 0.4, -disk * 0.8);
      g.bezierCurveTo(-W * 1.1, -L * 0.45, -W * 0.7, -L * 0.85, rand(-W * 0.2, W * 0.2), -L);
      g.bezierCurveTo(W * 0.7, -L * 0.85, W * 1.1, -L * 0.45, W * 0.4, -disk * 0.8);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(160, 90, 0, 0.25)';
      g.lineWidth = radius * 0.006;
      g.beginPath();
      g.moveTo(0, -disk);
      g.lineTo(0, -L * 0.9);
      g.stroke();
      g.restore();
    }
  }

  const shadow = g.createRadialGradient(0, 0, disk * 0.9, 0, 0, disk * 1.6);
  shadow.addColorStop(0, 'rgba(60, 30, 0, 0.55)');
  shadow.addColorStop(1, 'rgba(60, 30, 0, 0)');
  g.fillStyle = shadow;
  g.beginPath();
  g.arc(0, 0, disk * 1.6, 0, TAU);
  g.fill();

  const face = g.createRadialGradient(-disk * 0.25, -disk * 0.25, disk * 0.1, 0, 0, disk);
  face.addColorStop(0, '#5a3510');
  face.addColorStop(0.6, '#3a200a');
  face.addColorStop(1, '#241305');
  g.fillStyle = face;
  g.beginPath();
  g.arc(0, 0, disk, 0, TAU);
  g.fill();

  const seeds = 520;
  const spacing = (disk * 0.95) / Math.sqrt(seeds);
  for (let i = 0; i < seeds; i++) {
    const rr = spacing * Math.sqrt(i + 0.5);
    const a = i * SEED_ANGLE;
    const rim = i > seeds * 0.85;
    g.fillStyle = rim ? (i % 2 ? '#c77d1a' : '#a8610f') : (i % 3 ? '#2a1606' : '#4a2a0c');
    g.beginPath();
    g.arc(Math.cos(a) * rr, Math.sin(a) * rr, spacing * 0.42, 0, TAU);
    g.fill();
  }
  const shine = g.createRadialGradient(-disk * 0.4, -disk * 0.4, 0, -disk * 0.4, -disk * 0.4, disk);
  shine.addColorStop(0, 'rgba(255, 230, 160, 0.2)');
  shine.addColorStop(1, 'rgba(255, 230, 160, 0)');
  g.fillStyle = shine;
  g.beginPath();
  g.arc(0, 0, disk, 0, TAU);
  g.fill();
  return canvas;
}

// Versión reducida de un sprite; al ampliarla se ve desenfocada.
function softened(sprite, factor) {
  const small = document.createElement('canvas');
  small.width = Math.max(4, Math.round(sprite.width / factor));
  small.height = Math.max(4, Math.round(sprite.height / factor));
  const g = small.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(sprite, 0, 0, small.width, small.height);
  return small;
}
