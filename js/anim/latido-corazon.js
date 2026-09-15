import {
  TAU, clamp, rand, lerp, easeInOut, rgbaOf, glow, sparkle, heartPath, heartPoint, softBackdrop, makeVignette,
} from './util.js';

// ✏️ Colores del trazo y del corazón
const LINE = [80, 255, 190];
const HEART = [255, 70, 130];

// Guion (segundos)
const SWEEP = 2.2; // una pasada del monitor
const FLAT = 3.1; // línea plana: anticipación
const DRAW = 4.4; // el trazo dibuja un corazón
const WOW = 5.3; // el corazón se enciende y late

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const base = h * 0.66;
  const amp = S * 0.16;
  const heart = { x: w / 2, y: base - S * 0.36, size: S * 0.62 };
  const step = 2;
  const columns = Math.ceil(w / step) + 1;
  const trace = Array.from({ length: columns }, () => ({ y: base, at: -99 }));

  const backdrop = softBackdrop(w, h, dpr, (g) => {
    const bg = g.createRadialGradient(w / 2, base, 0, w / 2, base, Math.max(w, h));
    bg.addColorStop(0, '#0a1f1c');
    bg.addColorStop(0.6, '#03080a');
    bg.addColorStop(1, '#000000');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
  });
  const grid = document.createElement('canvas');
  grid.width = Math.ceil(w * Math.min(2, dpr));
  grid.height = Math.ceil(h * Math.min(2, dpr));
  const gg = grid.getContext('2d');
  gg.scale(Math.min(2, dpr), Math.min(2, dpr));
  gg.strokeStyle = 'rgba(80, 255, 190, 0.05)';
  gg.lineWidth = 1;
  gg.beginPath();
  for (let x = 0; x < w; x += S * 0.08) {
    gg.moveTo(x, 0);
    gg.lineTo(x, h);
  }
  for (let y = 0; y < h; y += S * 0.08) {
    gg.moveTo(0, y);
    gg.lineTo(w, y);
  }
  gg.stroke();
  const vignette = makeVignette(ctx, w, h, 0.75, w / 2, base);
  const embers = Array.from({ length: 30 }, () => ({ a: rand(0, TAU), r: rand(0.5, 1.2), speed: rand(0.2, 0.6), phase: rand(0, TAU) }));

  // Onda PQRST de un latido; `p` de 0 a 1
  const wave = (p) => {
    const bump = (c, width, height) => height * Math.exp(-((p - c) ** 2) / (2 * width * width));
    return bump(0.18, 0.03, 0.12) - bump(0.36, 0.012, 0.25) + bump(0.4, 0.014, 1.6) - bump(0.44, 0.014, 0.45) + bump(0.66, 0.05, 0.3);
  };
  let lastHead = 0;
  let lastT = 0;

  return (t) => {
    if (t < lastT) {
      for (const c of trace) c.at = -99;
      lastHead = 0;
    }
    lastT = t;
    const intro = clamp(t / 0.8);
    const bpm = t > WOW ? 1.25 : 1;
    const head = Math.floor((((t % SWEEP) / SWEEP) * w) / step);
    const flat = t > FLAT && t < DRAW - 0.1;
    const heartDrawing = t >= DRAW - 0.1 && t < WOW;

    // Escribe las columnas que recorrió la cabeza desde el cuadro anterior
    let c = lastHead;
    let guard = 0;
    while (c !== head && guard++ < columns) {
      c = (c + 1) % columns;
      const x = c * step;
      const phase = ((t * bpm) / (SWEEP / 2)) % 1;
      const local = (phase + x / w) % 1;
      let y = base;
      if (!flat && !(heartDrawing && Math.abs(x - heart.x) < heart.size * 0.55)) y = base - wave(local) * amp;
      trace[c] = { y, at: t };
    }
    lastHead = head;
    const beat = t > WOW ? Math.pow(Math.max(0, Math.sin(((t - WOW) / (SWEEP / 2)) * Math.PI * bpm)), 12) : 0;

    ctx.drawImage(backdrop, 0, 0, w, h);
    ctx.drawImage(grid, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    // Trazo con desvanecido detrás de la cabeza
    for (const [width, alpha] of [[S * 0.03, 0.1], [S * 0.012, 0.3], [2, 1]]) {
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      for (let bucket = 0; bucket < 4; bucket++) {
        ctx.strokeStyle = rgbaOf(t > WOW ? [lerp(LINE[0], HEART[0], 0.7), lerp(LINE[1], HEART[1], 0.7), lerp(LINE[2], HEART[2], 0.7)] : LINE, alpha * (1 - bucket / 4) * intro);
        ctx.beginPath();
        let open = false;
        for (let i = 0; i < columns; i++) {
          const age = t - trace[i].at;
          const b = Math.floor(clamp(age / SWEEP, 0, 0.999) * 4);
          if (b !== bucket || age > SWEEP) {
            open = false;
            continue;
          }
          const x = i * step;
          if (open) ctx.lineTo(x, trace[i].y);
          else ctx.moveTo(x, trace[i].y);
          open = true;
        }
        ctx.stroke();
      }
    }
    const hx = head * step;
    glow(ctx, hx, trace[head] ? trace[head].y : base, S * 0.08, [200, 255, 230], 0.8 * intro);

    // El trazo dibuja el corazón
    if (t >= DRAW - 0.1) {
      const k = easeInOut(clamp((t - DRAW + 0.1) / 0.9));
      const scale = 1 + 0.08 * beat;
      for (const [width, alpha] of [[S * 0.04, 0.12], [S * 0.014, 0.35], [2.2, 1]]) {
        ctx.strokeStyle = rgbaOf(HEART, alpha);
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i <= 100 * k; i++) {
          const p = heartPoint((0.5 + i / 100) % 1, heart.size * scale);
          if (i) ctx.lineTo(heart.x + p.x, heart.y + p.y);
          else ctx.moveTo(heart.x + p.x, heart.y + p.y);
        }
        ctx.stroke();
      }
      if (t > WOW) {
        const fill = clamp((t - WOW) / 0.5);
        heartPath(ctx, heart.x, heart.y - heart.size * 0.03, heart.size * 0.92 * scale);
        const g = ctx.createRadialGradient(heart.x - heart.size * 0.15, heart.y - heart.size * 0.2, 0, heart.x, heart.y, heart.size);
        g.addColorStop(0, rgbaOf([255, 190, 210], 0.45 * fill));
        g.addColorStop(1, rgbaOf(HEART, 0.12 * fill));
        ctx.fillStyle = g;
        ctx.fill();
        glow(ctx, heart.x, heart.y, S * (0.9 + 0.3 * beat), HEART, 0.18 * fill + 0.35 * beat);
        const flash = Math.exp(-(t - WOW) * 2.5);
        glow(ctx, heart.x, heart.y, S * 1.4, [255, 220, 235], 0.5 * flash);
        ctx.strokeStyle = rgbaOf([255, 150, 190], 0.6 * beat);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(heart.x, heart.y, S * (0.55 + 0.5 * (1 - beat)), 0, TAU);
        ctx.stroke();
        for (const e of embers) {
          const a = e.a + t * e.speed;
          const tw = 0.5 + 0.5 * Math.sin(t * 3 + e.phase);
          sparkle(ctx, heart.x + Math.cos(a) * heart.size * e.r, heart.y + Math.sin(a) * heart.size * e.r * 0.8, S * 0.01 * tw, [255, 200, 220], 0.6 * tw * fill);
        }
      }
    }

    // Lectura del monitor
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgbaOf(t > WOW ? HEART : LINE, 0.85 * intro);
    ctx.font = `700 ${Math.round(S * 0.045)}px ui-monospace, Consolas, monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(flat ? '— — —' : `♥ ${t > WOW ? 150 : 72} BPM`, w - S * 0.05, base + amp * 1.3);

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (flat) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, w, h);
    }
  };
}
