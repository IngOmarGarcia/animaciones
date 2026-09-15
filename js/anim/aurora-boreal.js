import {
  TAU, clamp, rand, lerp, easeInOut, rgbaOf, glow, sparkle, softBackdrop, makeLayer, makeVignette, makeStars, drawStars,
} from './util.js';

// ✏️ Colores de la aurora (base y bordes)
const AURORA_LOW = [80, 255, 170];
const AURORA_HIGH = [170, 110, 255];
const EDGE = [255, 110, 200];

// Guion (segundos)
const RISE = 3.5; // las cortinas terminan de subir
const CORONA = 4.6; // la aurora estalla en intensidad: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const shore = h * 0.68;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sky = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, shore);
    grad.addColorStop(0, '#01030a');
    grad.addColorStop(1, '#0c2230');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const stars = makeStars(w, shore, Math.round((w * h) / 2600));

  // Tira vertical de luz pre-renderizada: se repite a lo largo de la cortina
  const strip = makeLayer(8, 256, 1, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, rgbaOf(AURORA_HIGH, 0));
    grad.addColorStop(0.35, rgbaOf(AURORA_HIGH, 0.5));
    grad.addColorStop(0.75, rgbaOf(AURORA_LOW, 0.9));
    grad.addColorStop(0.9, rgbaOf(AURORA_LOW, 1));
    grad.addColorStop(1, rgbaOf(EDGE, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 8, 256);
  });

  const land = makeLayer(w, h, dpr, (g) => {
    const peaks = (base, height, color, seed) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, shore);
      for (let x = 0; x <= w + 8; x += 8) {
        const n = Math.abs(Math.sin(x * 0.01 + seed)) * 0.6 + Math.abs(Math.sin(x * 0.027 + seed * 2)) * 0.4;
        g.lineTo(x, base - height * n);
      }
      g.lineTo(w, shore);
      g.closePath();
      g.fill();
    };
    peaks(shore, h * 0.2, '#0e1a26', 1);
    peaks(shore, h * 0.11, '#070d15', 4);
    // Luz fría sobre las cimas lejanas
    const rim = g.createLinearGradient(0, shore - h * 0.2, 0, shore - h * 0.1);
    rim.addColorStop(0, 'rgba(170, 230, 210, 0.1)');
    rim.addColorStop(1, 'rgba(170, 230, 210, 0)');
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = rim;
    g.fillRect(0, shore - h * 0.2, w, h * 0.1);
    g.globalCompositeOperation = 'source-over';
    // Cabaña con luz cálida
    const cx = w * 0.72;
    g.fillStyle = '#05080d';
    g.fillRect(cx - S * 0.05, shore - S * 0.05, S * 0.1, S * 0.05);
    g.beginPath();
    g.moveTo(cx - S * 0.065, shore - S * 0.05);
    g.lineTo(cx, shore - S * 0.09);
    g.lineTo(cx + S * 0.065, shore - S * 0.05);
    g.fill();
    g.fillStyle = '#ffb35c';
    g.fillRect(cx - S * 0.015, shore - S * 0.035, S * 0.02, S * 0.018);
  });
  const vignette = makeVignette(ctx, w, h, 0.6, w / 2, h * 0.45);
  const curtains = [
    { base: 0.42, height: 0.36, freq: 1.6, speed: 0.25, phase: 0, alpha: 1 },
    { base: 0.5, height: 0.28, freq: 2.3, speed: -0.18, phase: 2, alpha: 0.75 },
    { base: 0.34, height: 0.22, freq: 3.1, speed: 0.32, phase: 4, alpha: 0.5 },
  ];
  const stripGap = Math.max(3, Math.round(w / 110));

  const drawCurtains = (t, grow, power, mirror) => {
    for (const c of curtains) {
      for (let x = -10; x < w + 10; x += stripGap) {
        const u = x / w;
        const wave = Math.sin(u * TAU * c.freq + t * c.speed * TAU + c.phase) * 0.5 + Math.sin(u * TAU * c.freq * 2.3 - t * 0.7 + c.phase) * 0.25;
        const bottom = h * (c.base + wave * 0.05);
        const height = h * c.height * grow * (0.6 + 0.4 * Math.abs(Math.sin(u * 17 + t * 0.9 + c.phase)));
        const flicker = 0.55 + 0.45 * Math.sin(u * 40 + t * 3 + c.phase);
        const alpha = c.alpha * flicker * power * 0.32;
        if (alpha <= 0.01) continue;
        ctx.globalAlpha = Math.min(1, alpha);
        if (mirror) {
          const y = shore + (shore - bottom);
          ctx.drawImage(strip, x + Math.sin(t * 2 + u * 30) * 2, y + height, stripGap + 1, -height * 0.8);
        } else {
          ctx.drawImage(strip, x, bottom - height, stripGap + 1, height);
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  return (t) => {
    const intro = clamp(t / 1.5);
    const grow = easeInOut(clamp((t - 0.8) / (RISE - 0.8)));
    const wow = t > CORONA ? Math.exp(-(t - CORONA) * 1.6) : 0;
    const power = (0.35 + 0.65 * grow) * (1 + 0.8 * wow) * (calm ? 0.8 : 1);

    ctx.drawImage(sky, 0, 0, w, h);
    ctx.globalAlpha = intro;
    drawStars(ctx, stars, t);
    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, w / 2, shore, S * 1.4, AURORA_LOW, 0.12 * power);
    drawCurtains(t, grow, power, false);
    if (wow > 0.01) {
      glow(ctx, w / 2, h * 0.25, S * 1.3, EDGE, 0.3 * wow);
      for (let i = 0; i < 10; i++) {
        const tw = 0.5 + 0.5 * Math.sin(t * 5 + i * 2.1);
        sparkle(ctx, rand(0, w), rand(h * 0.1, h * 0.45), S * 0.012, [220, 255, 240], wow * tw);
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // Lago congelado con reflejo
    const lake = ctx.createLinearGradient(0, shore, 0, h);
    lake.addColorStop(0, '#0a1a24');
    lake.addColorStop(1, '#02060a');
    ctx.fillStyle = lake;
    ctx.fillRect(0, shore, w, h - shore);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, shore, w, h - shore);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5;
    drawCurtains(t, grow, power * 0.45, true);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(200, 235, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const y = shore + ((i + 0.5) / 14) * (h - shore);
      ctx.moveTo(lerp(0, w * 0.2, (i * 37) % 10 / 10), y);
      ctx.lineTo(lerp(w * 0.5, w, (i * 53) % 10 / 10), y);
    }
    ctx.stroke();

    ctx.drawImage(land, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, w * 0.72, shore - S * 0.03, S * 0.08, [255, 180, 90], 0.5 + 0.1 * Math.sin(t * 7));
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
