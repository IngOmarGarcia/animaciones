import { TAU, clamp, rand, easeOutCubic } from './util.js';

const smoothstep = (x) => x * x * (3 - 2 * x);

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const scale = Math.min(2, Math.max(1, dpr));

  // Fondo verde y dorado dibujado chico y ampliado: bokeh de cámara macro
  const blur = 7;
  const small = document.createElement('canvas');
  small.width = Math.ceil((w * scale) / blur);
  small.height = Math.ceil((h * scale) / blur);
  const s = small.getContext('2d');
  s.scale(scale / blur, scale / blur);
  const base = s.createRadialGradient(w * 0.35, h * 0.3, 0, w * 0.35, h * 0.3, Math.max(w, h));
  base.addColorStop(0, '#7d8a2e');
  base.addColorStop(0.45, '#34461a');
  base.addColorStop(1, '#0c1407');
  s.fillStyle = base;
  s.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) {
    s.fillStyle = `rgba(20, 45, 15, ${rand(0.3, 0.6)})`;
    s.beginPath();
    s.ellipse(rand(0, w), rand(0, h), S * rand(0.1, 0.25), S * rand(0.4, 0.8), rand(-1, 1), 0, TAU);
    s.fill();
  }
  for (let i = 0; i < 34; i++) {
    const tone = Math.random();
    const a = rand(0.2, 0.55);
    s.fillStyle = tone < 0.5 ? `rgba(255, 214, 90, ${a})` : tone < 0.8 ? `rgba(170, 205, 90, ${a})` : `rgba(255, 250, 220, ${a})`;
    s.beginPath();
    s.arc(rand(0, w), rand(0, h), S * rand(0.03, 0.12), 0, TAU);
    s.fill();
  }
  const backdrop = document.createElement('canvas');
  backdrop.width = Math.ceil(w * scale);
  backdrop.height = Math.ceil(h * scale);
  const b = backdrop.getContext('2d');
  b.imageSmoothingQuality = 'high';
  b.drawImage(small, 0, 0, backdrop.width, backdrop.height);

  const R = S * 0.42;
  const sprite = makeGerbera(R, scale);
  const soft = softened(sprite, 9);
  const softer = softened(sprite, 18);

  const main = { x: w * 0.52, y: h * 0.58, r: R, tilt: -0.15 };
  const back = { x: w * 0.14, y: h * 0.3, r: R * 0.55, tilt: 0.4 };
  const front = { x: w * 0.96, y: h * 0.97, r: R * 1.1, tilt: -0.6 };

  const drops = Array.from({ length: 11 }, () => ({
    a: rand(0, TAU), u: rand(0.45, 0.9), r: S * rand(0.008, 0.02), phase: rand(0, TAU),
  }));
  const fallAngle = Math.PI / 2 + 0.35;
  const motes = Array.from({ length: 30 }, () => ({
    x: rand(0, w), y: rand(0, h), r: rand(0.6, 1.6), speed: rand(4, 12), phase: rand(0, TAU),
  }));
  const vignette = ctx.createRadialGradient(main.x, main.y, S * 0.35, main.x, main.y, Math.max(w, h) * 0.8);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.55)');

  // Dibuja la flor mezclando la versión nítida y la desenfocada según `focus` (1 = nítida).
  const drawFlower = (f, focus, zoom = 1, spin = 0) => {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.tilt + spin);
    ctx.scale(zoom, zoom * 0.9);
    if (focus < 1) {
      ctx.globalAlpha = 1 - focus;
      ctx.drawImage(soft, -f.r, -f.r, f.r * 2, f.r * 2);
    }
    if (focus > 0) {
      ctx.globalAlpha = focus;
      ctx.drawImage(sprite, -f.r, -f.r, f.r * 2, f.r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  return (t) => {
    ctx.drawImage(backdrop, 0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) {
      const x = w * (0.55 + k * 0.18) + Math.sin(t * 0.25 + k) * S * 0.04;
      ctx.fillStyle = 'rgba(255, 240, 180, 0.05)';
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.lineTo(x + S * 0.12, -10);
      ctx.lineTo(x - w * 0.6 + S * 0.2, h + 10);
      ctx.lineTo(x - w * 0.6, h + 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Cambio de enfoque: primero la flor del fondo, luego la principal
    const focus = smoothstep(clamp((t - 1.6) / 1.6));

    ctx.strokeStyle = 'rgba(45, 80, 25, 0.8)';
    ctx.lineWidth = S * 0.02;
    ctx.beginPath();
    ctx.moveTo(back.x, back.y);
    ctx.quadraticCurveTo(back.x - S * 0.05, h * 0.6, back.x - S * 0.1, h + 10);
    ctx.stroke();
    drawFlower(back, 1 - focus);

    const stem = ctx.createLinearGradient(main.x - S * 0.03, 0, main.x + S * 0.03, 0);
    stem.addColorStop(0, '#5c8f35');
    stem.addColorStop(1, '#1e3d12');
    ctx.strokeStyle = stem;
    ctx.lineWidth = S * 0.045;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(main.x, main.y);
    ctx.quadraticCurveTo(main.x + S * 0.06, h * 0.82, main.x + S * 0.02, h + 10);
    ctx.stroke();

    const zoom = 0.9 + 0.1 * easeOutCubic(clamp(t / 3));
    const spin = t * 0.01;
    drawFlower(main, focus, zoom, spin);

    // Gotas de rocío sobre la flor principal
    ctx.save();
    ctx.translate(main.x, main.y);
    ctx.rotate(main.tilt + spin);
    ctx.scale(zoom, zoom * 0.9);
    ctx.globalAlpha = 0.4 + 0.6 * focus;
    for (const d of drops) {
      const x = Math.cos(d.a) * d.u * R;
      const y = Math.sin(d.a) * d.u * R;
      const sparkle = 0.5 + 0.5 * Math.sin(t * 2.5 + d.phase);
      drawDew(ctx, x, y, d.r, sparkle);
      if (sparkle > 0.9 && focus > 0.5) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255, 255, 240, ${(sparkle - 0.9) * 8})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - d.r * 0.35 - d.r * 1.6, y - d.r * 0.38);
        ctx.lineTo(x - d.r * 0.35 + d.r * 1.6, y - d.r * 0.38);
        ctx.moveTo(x - d.r * 0.35, y - d.r * 0.38 - d.r * 1.6);
        ctx.lineTo(x - d.r * 0.35, y - d.r * 0.38 + d.r * 1.6);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // Una gota se forma en la punta de un pétalo y cae
    const cycle = (t - 4) % 4;
    if (t > 4 && cycle < 2) {
      const tipX = Math.cos(fallAngle) * R * 0.97;
      const tipY = Math.sin(fallAngle) * R * 0.97;
      const form = clamp(cycle / 1.2);
      const r = S * 0.016 * (0.4 + 0.6 * form);
      const fall = Math.max(0, cycle - 1.2);
      const y = tipY + r + fall * fall * S * 1.6;
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(tipX, y);
      ctx.scale(1, 1 + Math.min(0.6, fall * 3));
      drawDew(ctx, 0, 0, r, 1);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Flor muy desenfocada en primer plano
    ctx.save();
    ctx.translate(front.x, front.y);
    ctx.rotate(front.tilt + Math.sin(t * 0.6) * 0.02);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(softer, -front.r, -front.r, front.r * 2, front.r * 2);
    ctx.restore();
    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#fff3bf';
    for (const m of motes) {
      const y = (((m.y - t * m.speed) % h) + h) % h;
      ctx.globalAlpha = 0.15 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2 + m.phase));
      ctx.beginPath();
      ctx.arc(m.x + Math.sin(t * 0.6 + m.phase) * 10, y, m.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  };
}

// Gerbera amarilla: tres capas de pétalos con surcos, anillo de flósculos y centro texturizado.
function makeGerbera(radius, scale) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(radius * 2 * scale);
  canvas.height = canvas.width;
  const g = canvas.getContext('2d');
  g.scale(scale, scale);
  g.translate(radius, radius);
  const core = radius * 0.24;
  const layers = [
    { count: 30, len: 0.98, width: 0.085, colors: ['#e67700', '#fcc419', '#fff3bf'], offset: 0 },
    { count: 26, len: 0.8, width: 0.08, colors: ['#d9480f', '#fab005', '#ffe066'], offset: 0.5 },
    { count: 22, len: 0.52, width: 0.06, colors: ['#c2410c', '#f59f00', '#ffd43b'], offset: 0.25 },
  ];

  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      const a = ((i + layer.offset + rand(-0.15, 0.15)) / layer.count) * TAU;
      const L = radius * layer.len * rand(0.9, 1);
      const W = radius * layer.width * rand(0.85, 1.15);
      g.save();
      g.rotate(a);
      const grad = g.createLinearGradient(0, -core, 0, -L);
      grad.addColorStop(0, layer.colors[0]);
      grad.addColorStop(0.35, layer.colors[1]);
      grad.addColorStop(1, layer.colors[2]);
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(-W * 0.35, -core * 0.8);
      g.bezierCurveTo(-W * 1.05, -L * 0.35, -W * 0.95, -L * 0.8, -W * 0.5, -L * 0.98);
      g.lineTo(0, -L * 0.93);
      g.lineTo(W * 0.5, -L * 0.98);
      g.bezierCurveTo(W * 0.95, -L * 0.8, W * 1.05, -L * 0.35, W * 0.35, -core * 0.8);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(170, 90, 0, 0.22)';
      g.lineWidth = radius * 0.004;
      g.beginPath();
      for (const side of [-0.3, 0.3]) {
        g.moveTo(W * side, -core * 1.1);
        g.lineTo(W * side * 0.8, -L * 0.9);
      }
      g.stroke();
      g.strokeStyle = 'rgba(255, 255, 230, 0.28)';
      g.lineWidth = radius * 0.005;
      g.beginPath();
      g.moveTo(-W * 0.95, -L * 0.45);
      g.lineTo(-W * 0.55, -L * 0.95);
      g.stroke();
      g.restore();
    }
    const shadow = g.createRadialGradient(0, 0, core, 0, 0, radius * layer.len * 0.75);
    shadow.addColorStop(0, 'rgba(80, 40, 0, 0.35)');
    shadow.addColorStop(1, 'rgba(80, 40, 0, 0)');
    g.fillStyle = shadow;
    g.beginPath();
    g.arc(0, 0, radius * layer.len * 0.75, 0, TAU);
    g.fill();
  }

  for (let i = 0; i < 180; i++) {
    const a = rand(0, TAU);
    const d = core * rand(0.85, 1.35);
    g.fillStyle = Math.random() < 0.5 ? '#ff9f1c' : '#ffc43d';
    g.beginPath();
    g.arc(Math.cos(a) * d, Math.sin(a) * d, radius * rand(0.008, 0.016), 0, TAU);
    g.fill();
  }
  const center = g.createRadialGradient(-core * 0.3, -core * 0.3, core * 0.1, 0, 0, core);
  center.addColorStop(0, '#6b6a1e');
  center.addColorStop(0.6, '#3d3f10');
  center.addColorStop(1, '#5c4a0c');
  g.fillStyle = center;
  g.beginPath();
  g.arc(0, 0, core * 0.85, 0, TAU);
  g.fill();
  for (let i = 0; i < 160; i++) {
    const rr = core * 0.8 * Math.sqrt(i / 160);
    const a = i * 2.39996;
    g.fillStyle = i % 2 ? 'rgba(20, 20, 0, 0.5)' : 'rgba(180, 170, 60, 0.35)';
    g.beginPath();
    g.arc(Math.cos(a) * rr, Math.sin(a) * rr, radius * 0.006, 0, TAU);
    g.fill();
  }
  return canvas;
}

function softened(sprite, factor) {
  const small = document.createElement('canvas');
  small.width = Math.max(4, Math.round(sprite.width / factor));
  small.height = Math.max(4, Math.round(sprite.height / factor));
  const g = small.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(sprite, 0, 0, small.width, small.height);
  return small;
}

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
