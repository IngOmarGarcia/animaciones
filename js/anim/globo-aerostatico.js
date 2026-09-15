import {
  TAU, clamp, rand, lerp, easeInOut, easeOutCubic, rgbaOf, glow, sparkle, softBackdrop, makeVignette,
} from './util.js';

// ✏️ Colores de los gajos del globo y del amanecer
const STRIPES = ['#e03131', '#ffd43b', '#1c7ed6', '#f76707', '#12b886', '#ffffff'];
const SUN = [255, 214, 150];

// Guion (segundos)
const RISE = 3.2; // el globo termina de subir entre las nubes
const FLAME = 4.4; // gran llamarada y sale el sol: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const cloudsY = h * 0.72;
  const sunX = w * 0.62;
  const sunY = h * 0.62;

  const sky = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2b3d7a');
    grad.addColorStop(0.45, '#b36c8e');
    grad.addColorStop(0.7, '#ffae7a');
    grad.addColorStop(1, '#ffe2b0');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(90, 70, 120, 0.55)';
    g.beginPath();
    g.moveTo(-10, cloudsY);
    g.lineTo(w * 0.15, h * 0.52);
    g.lineTo(w * 0.32, cloudsY);
    g.moveTo(w * 0.7, cloudsY);
    g.lineTo(w * 0.88, h * 0.48);
    g.lineTo(w * 1.1, cloudsY);
    g.fill();
  }, 4);
  const cloudSprite = softBackdrop(S, S * 0.4, dpr, (g) => {
    for (let k = 0; k < 12; k++) {
      g.fillStyle = `rgba(255, ${Math.round(rand(220, 245))}, ${Math.round(rand(220, 240))}, ${rand(0.5, 0.8)})`;
      g.beginPath();
      g.ellipse(S * rand(0.2, 0.8), S * rand(0.18, 0.26), S * rand(0.1, 0.2), S * rand(0.06, 0.1), 0, 0, TAU);
      g.fill();
    }
  }, 4);
  const cloudRows = [0.62, 0.72, 0.84].map((y, row) => Array.from({ length: 6 }, (_, i) => ({
    x: (i / 5) * w * 1.3 - w * 0.15 + rand(-20, 20), y: h * y + rand(-10, 10), size: S * (0.6 + row * 0.35) * rand(0.8, 1.2), speed: (4 + row * 6) * (row % 2 ? -1 : 1),
  })));
  const far = [{ x: 0.2, y: 0.34, s: 0.07, drift: 0.6 }, { x: 0.82, y: 0.26, s: 0.05, drift: 0.4 }, { x: 0.12, y: 0.55, s: 0.04, drift: 0.8 }];
  const vignette = makeVignette(ctx, w, h, 0.4);

  const drawClouds = (row, t) => {
    for (const c of cloudRows[row]) {
      const span = w + c.size * 2;
      const x = ((((c.x + t * c.speed) % span) + span) % span) - c.size;
      ctx.drawImage(cloudSprite, x - c.size / 2, c.y - c.size * 0.2, c.size, c.size * 0.4);
    }
  };

  // Globo con gajos, sombreado esférico, cuerdas y canasta
  const drawBalloon = (x, y, size, t, flame, detail) => {
    const bw = size;
    const bh = size * 1.2;
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(x, y + bh * 0.55);
      ctx.bezierCurveTo(x - bw * 0.2, y + bh * 0.4, x - bw * 0.62, y + bh * 0.05, x - bw * 0.58, y - bh * 0.2);
      ctx.bezierCurveTo(x - bw * 0.55, y - bh * 0.58, x + bw * 0.55, y - bh * 0.58, x + bw * 0.58, y - bh * 0.2);
      ctx.bezierCurveTo(x + bw * 0.62, y + bh * 0.05, x + bw * 0.2, y + bh * 0.4, x, y + bh * 0.55);
      ctx.closePath();
    };
    ctx.save();
    shape();
    ctx.clip();
    const gores = detail ? 12 : 6;
    const turn = (t * 0.08) % (2 / gores);
    for (let i = -1; i <= gores; i++) {
      const u0 = i / gores + turn;
      const u1 = u0 + 1 / gores;
      const x0 = x + Math.sin((u0 - 0.5) * Math.PI) * bw * 0.6;
      const x1 = x + Math.sin((u1 - 0.5) * Math.PI) * bw * 0.6;
      ctx.fillStyle = STRIPES[((i % STRIPES.length) + STRIPES.length) % STRIPES.length];
      ctx.fillRect(Math.min(x0, x1), y - bh, Math.abs(x1 - x0) + 0.5, bh * 2);
    }
    const shade = ctx.createRadialGradient(x - bw * 0.25, y - bh * 0.25, bw * 0.05, x, y, bw * 0.75);
    shade.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    shade.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(1, 'rgba(40, 10, 30, 0.55)');
    ctx.fillStyle = shade;
    ctx.fillRect(x - bw, y - bh, bw * 2, bh * 2);
    ctx.fillStyle = rgbaOf(SUN, 0.25 * flame);
    ctx.fillRect(x - bw, y, bw * 2, bh);
    ctx.restore();

    const basketY = y + bh * 0.85;
    ctx.strokeStyle = 'rgba(60, 40, 30, 0.8)';
    ctx.lineWidth = Math.max(0.7, size * 0.012);
    ctx.beginPath();
    for (const side of [-1, 1]) {
      ctx.moveTo(x + side * bw * 0.16, y + bh * 0.5);
      ctx.lineTo(x + side * bw * 0.1, basketY);
    }
    ctx.stroke();
    if (flame > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, y + bh * 0.62, size * 0.35 * (0.6 + flame), [255, 180, 80], 0.9 * flame);
      ctx.fillStyle = rgbaOf([255, 230, 170], flame);
      ctx.beginPath();
      ctx.moveTo(x, y + bh * (0.62 - 0.2 * flame));
      ctx.quadraticCurveTo(x + size * 0.05, y + bh * 0.72, x, y + bh * 0.76);
      ctx.quadraticCurveTo(x - size * 0.05, y + bh * 0.72, x, y + bh * (0.62 - 0.2 * flame));
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    const basket = ctx.createLinearGradient(x - bw * 0.12, 0, x + bw * 0.12, 0);
    basket.addColorStop(0, '#6b4424');
    basket.addColorStop(0.5, '#a8743f');
    basket.addColorStop(1, '#5a391e');
    ctx.fillStyle = basket;
    ctx.fillRect(x - bw * 0.11, basketY, bw * 0.22, bh * 0.16);
    if (detail) {
      ctx.strokeStyle = 'rgba(50, 30, 15, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 1; k < 4; k++) {
        ctx.moveTo(x - bw * 0.11, basketY + (bh * 0.16 * k) / 4);
        ctx.lineTo(x + bw * 0.11, basketY + (bh * 0.16 * k) / 4);
      }
      ctx.stroke();
    }
  };

  return (t) => {
    const rise = easeOutCubic(clamp(t / RISE));
    const sunUp = easeInOut(clamp((t - FLAME + 1) / 2.5));
    const burst = t > FLAME && t < FLAME + 1.6 ? Math.sin(((t - FLAME) / 1.6) * Math.PI) : 0;
    const puff = Math.pow(Math.max(0, Math.sin(t * 1.3)), 10) * 0.6;
    const flame = Math.max(burst, puff * clamp(t / RISE));
    const bx = w * 0.46 + Math.sin(t * 0.5) * S * 0.03;
    const by = lerp(h * 1.15, h * 0.4, rise) - (t > FLAME ? (t - FLAME) * S * 0.02 : 0);
    const sy = lerp(sunY + S * 0.25, sunY - S * 0.1, sunUp);

    ctx.drawImage(sky, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, sunX, sy, S * (0.9 + 0.4 * burst), SUN, 0.35 + 0.5 * sunUp);
    glow(ctx, sunX, sy, S * 0.1, [255, 255, 240], sunUp);
    ctx.globalCompositeOperation = 'source-over';
    drawClouds(0, t);

    for (const b of far) {
      const fy = h * b.y - Math.sin(t * 0.3 + b.x * 10) * S * 0.02 - t * S * 0.004 * b.drift;
      ctx.globalAlpha = 0.85;
      drawBalloon(w * b.x + Math.sin(t * 0.4 + b.x) * S * 0.02, fy, S * b.s * 2.2, t, 0, false);
      ctx.globalAlpha = 1;
    }
    drawClouds(1, t);
    drawBalloon(bx, by, S * 0.34, t, flame, true);
    drawClouds(2, t);

    if (burst > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10; i++) {
        const tw = 0.5 + 0.5 * Math.sin(t * 7 + i * 1.9);
        const a = (i / 10) * TAU + t * 0.3;
        sparkle(ctx, bx + Math.cos(a) * S * 0.35, by + Math.sin(a) * S * 0.35, S * 0.014 * tw, SUN, burst * tw);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (t < 1) {
      ctx.fillStyle = `rgba(20, 10, 30, ${1 - t})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
