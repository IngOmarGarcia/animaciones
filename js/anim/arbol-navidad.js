import {
  TAU, clamp, rand, pick, lerp, easeInOut, easeOutCubic, rgbaOf, glow, sparkle, softBackdrop, makeLayer, makeVignette,
} from './util.js';

// ✏️ Colores de las luces, esferas y estrella
const BULBS = [[255, 80, 80], [255, 210, 80], [90, 220, 130], [100, 170, 255], [255, 130, 220]];
const STAR = [255, 225, 130];

// Guion (segundos)
const LIGHTS = 1.2; // las luces empiezan a encenderse de abajo hacia arriba
const STAR_ON = 4.2; // se enciende la estrella: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const cx = w / 2;
  const base = h * 0.82;
  const topY = h * 0.26;
  const width = S * 0.62;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const night = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#050b1f');
    grad.addColorStop(0.7, '#15254a');
    grad.addColorStop(1, '#28365a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = `rgba(255, ${Math.round(rand(170, 220))}, 120, ${rand(0.12, 0.3)})`;
      g.beginPath();
      g.arc(rand(0, w), rand(h * 0.6, h * 0.85), S * rand(0.02, 0.05), 0, TAU);
      g.fill();
    }
  });

  // Árbol pre-renderizado en pisos con agujas y nieve en las puntas
  const tree = makeLayer(w, h, dpr, (g) => {
    g.fillStyle = '#4a2c1a';
    g.fillRect(cx - S * 0.04, base - S * 0.05, S * 0.08, S * 0.1);
    const tiers = 5;
    for (let k = 0; k < tiers; k++) {
      const u0 = k / tiers;
      const top = lerp(topY, base - S * 0.05, u0 * 0.85);
      const bottom = lerp(topY, base - S * 0.05, (k + 1) / tiers);
      const half = width * 0.5 * ((k + 1) / tiers);
      const grad = g.createLinearGradient(cx - half, 0, cx + half, 0);
      grad.addColorStop(0, '#0f3d24');
      grad.addColorStop(0.45, '#1f6b3d');
      grad.addColorStop(1, '#0a2a19');
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(cx, top - S * 0.03);
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        g.lineTo(cx + half * (u * 2 - 1), bottom + (i % 2 ? -S * 0.02 : S * 0.01));
      }
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(120, 190, 140, 0.25)';
      g.lineWidth = 1;
      for (let n = 0; n < 60; n++) {
        const v = Math.random();
        const x = cx + (Math.random() * 2 - 1) * half * v;
        const y = lerp(top, bottom, v);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + rand(-4, 4), y + rand(3, 7));
        g.stroke();
      }
      g.fillStyle = 'rgba(240, 246, 255, 0.85)';
      for (let i = 0; i <= 12; i += 2) {
        const u = i / 12;
        g.beginPath();
        g.ellipse(cx + half * (u * 2 - 1), bottom + S * 0.006, S * 0.02, S * 0.007, 0, 0, TAU);
        g.fill();
      }
    }
    const snow = g.createLinearGradient(0, base, 0, h);
    snow.addColorStop(0, '#d8e2f2');
    snow.addColorStop(1, '#8394b8');
    g.fillStyle = snow;
    g.beginPath();
    g.ellipse(cx, base + S * 0.08, w * 0.9, S * 0.14, 0, Math.PI, TAU);
    g.lineTo(w * 2, h);
    g.lineTo(-w, h);
    g.fill();
    g.fillRect(0, base + S * 0.06, w, h);
    for (const [x, gw, color, ribbon] of [[-0.3, 0.14, '#c92a2a', '#ffd43b'], [0.28, 0.12, '#1c7ed6', '#ffffff'], [0.05, 0.1, '#7048e8', '#ffd43b']]) {
      const gx = cx + x * S;
      const size = S * gw;
      g.fillStyle = color;
      g.fillRect(gx - size / 2, base - size * 0.6, size, size * 0.9);
      g.fillStyle = ribbon;
      g.fillRect(gx - size * 0.07, base - size * 0.6, size * 0.14, size * 0.9);
    }
  });

  // Espiral de foquitos alrededor del árbol, en orden de abajo hacia arriba
  const bulbs = [];
  const turns = 5.5;
  for (let i = 0; i < 70; i++) {
    const u = i / 69;
    const y = lerp(base - S * 0.08, topY + S * 0.06, u);
    const half = width * 0.5 * (1 - u) * 0.92;
    const a = u * turns * TAU;
    bulbs.push({ x: cx + Math.sin(a) * half, y: y + Math.cos(a) * S * 0.015, front: Math.cos(a) > -0.2, color: BULBS[i % BULBS.length], order: 1 - u, phase: rand(0, TAU) });
  }
  const ornaments = Array.from({ length: 12 }, (_, i) => {
    const u = rand(0.1, 0.85);
    const half = width * 0.5 * u * 0.8;
    return { x: cx + rand(-half, half), y: lerp(topY, base - S * 0.08, u), r: S * rand(0.018, 0.03), color: pick(BULBS) };
  });
  const snowfall = Array.from({ length: calm ? 40 : 100 }, () => ({ x: rand(0, w), y: rand(-h, h), speed: rand(20, 50), size: rand(0.8, 2.2), phase: rand(0, TAU) }));
  const vignette = makeVignette(ctx, w, h, 0.6, cx, h * 0.55);

  return (t, dt) => {
    const intro = clamp(t / 1);
    const wave = easeInOut(clamp((t - LIGHTS) / (STAR_ON - LIGHTS - 0.2)));
    const star = t > STAR_ON ? easeOutCubic(clamp((t - STAR_ON) / 0.7)) : 0;
    const wow = t > STAR_ON ? Math.exp(-(t - STAR_ON) * 1.6) : 0;
    const snowOn = clamp((t - STAR_ON) / 1.5);

    ctx.drawImage(night, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, cx, h * 0.55, S * 1.1, [255, 190, 120], 0.12 + 0.25 * wave);
    ctx.globalCompositeOperation = 'source-over';

    const drawBulbs = (front) => {
      for (const b of bulbs) {
        if (b.front !== front) continue;
        const on = clamp((wave - b.order * 0.95) / 0.06);
        const twinkle = t > STAR_ON ? 0.65 + 0.35 * Math.sin(t * 4 + b.phase) : 1;
        const light = on * twinkle * (front ? 1 : 0.5);
        ctx.fillStyle = rgbaOf(on > 0 ? b.color : [40, 50, 40], 0.4 + 0.6 * light);
        ctx.beginPath();
        ctx.arc(b.x, b.y, S * 0.008, 0, TAU);
        ctx.fill();
        if (light > 0.02) {
          ctx.globalCompositeOperation = 'lighter';
          glow(ctx, b.x, b.y, S * 0.045, b.color, 0.6 * light);
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    };

    drawBulbs(false);
    ctx.drawImage(tree, 0, 0, w, h);
    for (const o of ornaments) {
      const g = ctx.createRadialGradient(o.x - o.r * 0.35, o.y - o.r * 0.35, o.r * 0.1, o.x, o.y, o.r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, rgbaOf(o.color, 1));
      g.addColorStop(1, rgbaOf([o.color[0] * 0.3, o.color[1] * 0.3, o.color[2] * 0.3], 1));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, TAU);
      ctx.fill();
    }
    drawBulbs(true);

    // Estrella de la punta
    const sx = cx;
    const sy = topY - S * 0.05;
    ctx.globalCompositeOperation = 'lighter';
    if (star > 0) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(t * 0.15);
      ctx.fillStyle = rgbaOf(STAR, 0.07 * star + 0.1 * wow);
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, S * (1 + wow), (i / 12) * TAU, (i / 12) * TAU + 0.12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      glow(ctx, sx, sy, S * (0.35 + 0.6 * wow), STAR, 0.6 * star + 0.4 * wow);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = star > 0 ? rgbaOf(STAR, 0.6 + 0.4 * star) : '#6b5a2a';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? S * 0.025 : S * 0.06;
      const a = (i / 10) * TAU - Math.PI / 2;
      ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    if (wow > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const d = S * (0.1 + (1 - wow) * 0.5);
        sparkle(ctx, sx + Math.cos(a) * d, sy + Math.sin(a) * d, S * 0.02, STAR, wow);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    if (snowOn > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * snowOn})`;
      for (const f of snowfall) {
        f.y += f.speed * dt;
        if (f.y > h) f.y = -10;
        ctx.beginPath();
        ctx.arc(f.x + Math.sin(t + f.phase) * 12, f.y, f.size, 0, TAU);
        ctx.fill();
      }
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
