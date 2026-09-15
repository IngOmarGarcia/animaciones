import {
  TAU, clamp, rand, pick, lerp, easeInOut, rgbaOf, glow, sparkle, softBackdrop, makeVignette,
} from './util.js';

// ✏️ Colores bioluminiscentes
const GLOWS = [[90, 230, 255], [255, 110, 210], [170, 130, 255], [120, 255, 200]];

// Guion (segundos)
const WAKE = 1.4; // las medusas empiezan a encenderse
const QUEEN = 3.4; // sube la medusa grande
const PULSE = 5; // su pulso ilumina el plancton: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sea = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#053040');
    grad.addColorStop(0.45, '#021822');
    grad.addColorStop(1, '#00060a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      g.fillStyle = rgbaOf(pick(GLOWS), rand(0.05, 0.14));
      g.beginPath();
      g.arc(rand(0, w), rand(0, h), S * rand(0.04, 0.12), 0, TAU);
      g.fill();
    }
  }, 8);
  const vignette = makeVignette(ctx, w, h, 0.7, w / 2, h * 0.4);
  const snow = Array.from({ length: calm ? 40 : 110 }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(0.5, 1.6), speed: rand(4, 14), phase: rand(0, TAU) }));

  const jellies = Array.from({ length: 6 }, (_, i) => ({
    x: rand(0.1, 0.9), y: rand(0.25, 0.95), size: S * rand(0.06, 0.13), color: GLOWS[i % GLOWS.length],
    phase: rand(0, TAU), rate: rand(1.3, 2), wake: WAKE + i * 0.3, drift: rand(-0.5, 0.5), rise: rand(8, 18),
  }));
  const queen = { x: 0.5, size: S * 0.26, color: GLOWS[1], phase: 0, rate: 1.4 };

  // Medusa: campana translúcida que late, brazos ondulantes y tentáculos con retardo
  const drawJelly = (x, y, size, color, t, rate, phase, light) => {
    const beat = (Math.sin(t * rate * TAU * 0.5 + phase) + 1) / 2;
    const squeeze = 1 - 0.14 * beat;
    const bw = size * (1 + 0.12 * beat);
    const bh = size * 0.75 * squeeze;
    glow(ctx, x, y, size * 2.4, color, 0.18 * light);

    ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const offset = (k / 7 - 0.5) * bw * 1.3;
      ctx.strokeStyle = rgbaOf(color, 0.35 * light * (k % 2 ? 0.7 : 1));
      ctx.lineWidth = Math.max(0.6, size * (k % 3 === 0 ? 0.03 : 0.015));
      ctx.beginPath();
      ctx.moveTo(x + offset, y);
      const len = size * (k % 3 === 0 ? 2.8 : 1.9);
      for (let s = 1; s <= 12; s++) {
        const u = s / 12;
        const sway = Math.sin(t * 2.2 - u * 4 + phase + k) * size * 0.25 * u;
        ctx.lineTo(x + offset * (1 - u * 0.3) + sway, y + u * len);
      }
      ctx.stroke();
    }

    const bell = ctx.createRadialGradient(x, y - bh * 0.4, size * 0.05, x, y - bh * 0.2, bw);
    bell.addColorStop(0, rgbaOf([255, 255, 255], 0.5 * light));
    bell.addColorStop(0.4, rgbaOf(color, 0.25 * light));
    bell.addColorStop(1, rgbaOf(color, 0.05 * light));
    ctx.fillStyle = bell;
    ctx.beginPath();
    ctx.moveTo(x - bw, y);
    ctx.bezierCurveTo(x - bw, y - bh * 1.35, x + bw, y - bh * 1.35, x + bw, y);
    for (let k = 6; k >= 0; k--) ctx.quadraticCurveTo(x - bw + ((k + 0.5) * 2 * bw) / 7, y + size * 0.08, x - bw + (k * 2 * bw) / 7, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgbaOf(color, 0.8 * light);
    ctx.lineWidth = Math.max(0.8, size * 0.03);
    ctx.stroke();
    glow(ctx, x, y - bh * 0.45, size * 0.45, [255, 255, 255], 0.35 * light * (0.6 + 0.4 * beat));
    return beat;
  };

  return (t, dt) => {
    const intro = clamp(t / 1.5);
    const queenIn = easeInOut(clamp((t - QUEEN) / 1.8));
    const wave = t > PULSE ? (t - PULSE) / 1.6 : -1;
    const wow = wave >= 0 && wave < 1 ? 1 - wave : 0;

    ctx.drawImage(sea, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    // Rayos de luz desde la superficie
    for (let i = 0; i < 4; i++) {
      const x = w * (0.15 + i * 0.25) + Math.sin(t * 0.3 + i) * S * 0.05;
      ctx.fillStyle = `rgba(120, 220, 230, ${0.03 * intro})`;
      ctx.beginPath();
      ctx.moveTo(x - S * 0.04, 0);
      ctx.lineTo(x + S * 0.04, 0);
      ctx.lineTo(x + S * 0.25, h * 0.7);
      ctx.lineTo(x - S * 0.05, h * 0.7);
      ctx.closePath();
      ctx.fill();
    }

    // Nieve marina; la onda del pulso la enciende
    const qx = w * queen.x;
    const qy = lerp(h * 1.2, h * 0.5, queenIn) + Math.sin(t * 0.7) * S * 0.02;
    for (const p of snow) {
      p.y -= p.speed * dt;
      if (p.y < -5) p.y = h + 5;
      const x = p.x + Math.sin(t * 0.5 + p.phase) * 6;
      const dist = Math.hypot(x - qx, p.y - qy);
      const hit = wave >= 0 ? Math.exp(-((dist - wave * S * 1.4) ** 2) / (2 * (S * 0.08) ** 2)) : 0;
      ctx.fillStyle = rgbaOf([180, 240, 255], (0.25 + 0.3 * Math.sin(t * 2 + p.phase)) * intro + hit);
      ctx.fillRect(x, p.y, p.r + hit * 2, p.r + hit * 2);
      if (hit > 0.4) sparkle(ctx, x, p.y, S * 0.012 * hit, GLOWS[0], hit);
    }

    for (const j of jellies) {
      const light = clamp((t - j.wake) / 0.8) * (0.4 + 0.6 * intro) + 0.25 * wow;
      if (light <= 0) continue;
      const x = w * j.x + Math.sin(t * 0.3 + j.phase) * S * 0.05 + j.drift * t * 2;
      const y = ((((h * j.y - t * j.rise) % (h * 1.3)) + h * 1.3) % (h * 1.3)) - h * 0.15;
      drawJelly(x, y, j.size, j.color, t, j.rate, j.phase, light);
    }

    if (queenIn > 0) {
      drawJelly(qx, qy, queen.size, queen.color, t, queen.rate, queen.phase, queenIn * (1 + 0.5 * wow));
      if (wave >= 0 && wave < 1) {
        for (const [color, grow] of [[GLOWS[1], 1], [GLOWS[0], 1.04]]) {
          ctx.strokeStyle = rgbaOf(color, 0.6 * wow);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(qx, qy, wave * S * 1.4 * grow, 0, TAU);
          ctx.stroke();
        }
        glow(ctx, qx, qy, S * 1.2, GLOWS[1], 0.3 * wow);
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
