import {
  TAU, clamp, rand, lerp, easeOutBack, rgbaOf, glow, softBackdrop, makeVignette,
} from './util.js';

// ✏️ Colores del arcade y del corazón pixelado
const HEART_COLORS = ['#ff2d6f', '#ff5c8a', '#e0115f'];
const NEON = [80, 240, 255];

// Mapa del corazón (X = bloque)
const MAP = [
  '..XXX...XXX..',
  '.XXXXX.XXXXX.',
  'XXXXXXXXXXXXX',
  'XXXXXXXXXXXXX',
  'XXXXXXXXXXXXX',
  '.XXXXXXXXXXX.',
  '..XXXXXXXXX..',
  '...XXXXXXX...',
  '....XXXXX....',
  '.....XXX.....',
  '......X......',
];

// Guion (segundos)
const START = 0.9; // empiezan a caer los bloques
const BUILD = 3.4; // tiempo para completar el corazón
const PERFECT = START + BUILD + 0.3; // "PERFECT!": momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const cols = MAP[0].length;
  const rows = MAP.length;
  const px = Math.floor(Math.min((w * 0.84) / cols, (h * 0.42) / rows));
  const ox = Math.round(w / 2 - (cols * px) / 2);
  const oy = Math.round(h * 0.56 - (rows * px) / 2);

  const screen = softBackdrop(w, h, dpr, (g) => {
    const base = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
    base.addColorStop(0, '#141032');
    base.addColorStop(1, '#030208');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
  });
  const vignette = makeVignette(ctx, w, h, 0.85);
  const stars = Array.from({ length: 50 }, () => ({ x: rand(0, w), y: rand(0, h), speed: rand(20, 80), size: rand(1, 3) }));

  // Bloques de abajo hacia arriba, con un orden algo aleatorio dentro de cada fila
  const blocks = [];
  for (let r = rows - 1; r >= 0; r--) {
    const cells = [];
    for (let c = 0; c < cols; c++) if (MAP[r][c] === 'X') cells.push(c);
    cells.sort(() => Math.random() - 0.5);
    for (const c of cells) blocks.push({ r, c, color: HEART_COLORS[(r + c) % HEART_COLORS.length] });
  }
  blocks.forEach((b, i) => { b.at = START + (i / blocks.length) * BUILD; });
  const debris = Array.from({ length: 60 }, () => ({ a: rand(0, TAU), v: rand(0.3, 1.2) * S, size: Math.max(2, px * rand(0.25, 0.5)), color: HEART_COLORS[Math.floor(rand(0, 3))] }));

  const drawBlock = (x, y, size, color, flash) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(x, y, size, size * 0.18);
    ctx.fillRect(x, y, size * 0.18, size);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x, y + size * 0.82, size, size * 0.18);
    ctx.fillRect(x + size * 0.82, y, size * 0.18, size);
    if (flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
      ctx.fillRect(x, y, size, size);
    }
  };

  return (t) => {
    const intro = clamp(t / 0.6);
    const wow = t > PERFECT ? Math.exp(-(t - PERFECT) * 2) : 0;
    const pulse = t > PERFECT ? 1 + 0.06 * Math.pow(Math.max(0, Math.sin(t * 5)), 8) : 1;
    const placed = blocks.filter((b) => t >= b.at + 0.18).length;

    ctx.drawImage(screen, 0, 0, w, h);
    ctx.fillStyle = 'rgba(160, 200, 255, 0.5)';
    for (const s of stars) {
      const y = (s.y + t * s.speed) % h;
      ctx.fillRect(Math.round(s.x), Math.round(y), s.size, s.size);
    }

    // Cuadrícula del campo de juego
    ctx.strokeStyle = rgbaOf(NEON, 0.08);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      ctx.moveTo(ox + c * px + 0.5, oy - px * 2);
      ctx.lineTo(ox + c * px + 0.5, oy + rows * px);
    }
    ctx.stroke();
    ctx.strokeStyle = rgbaOf(NEON, 0.6);
    ctx.lineWidth = 2;
    ctx.strokeRect(ox - 4, oy - px * 2 - 4, cols * px + 8, rows * px + px * 2 + 8);

    // Bloques cayendo y encajando
    ctx.save();
    ctx.translate(w / 2, oy + (rows * px) / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-w / 2, -(oy + (rows * px) / 2));
    for (const b of blocks) {
      if (t < b.at - 0.3) continue;
      const k = clamp((t - b.at + 0.3) / 0.48);
      const ty = oy + b.r * px;
      const y = lerp(oy - px * 2, ty, easeOutBack(k));
      const land = t >= b.at + 0.18 ? Math.exp(-(t - b.at - 0.18) * 10) : 0;
      drawBlock(ox + b.c * px, Math.round(y), px, b.color, 0.5 * land + wow * 0.8);
    }
    ctx.restore();

    ctx.globalCompositeOperation = 'lighter';
    if (wow > 0.01) {
      glow(ctx, w / 2, oy + (rows * px) / 2, S * 1.1, [255, 80, 140], 0.5 * wow);
      for (const d of debris) {
        const k = 1 - wow;
        ctx.fillStyle = d.color;
        ctx.fillRect(w / 2 + Math.cos(d.a) * d.v * k, oy + (rows * px) / 2 + Math.sin(d.a) * d.v * k, d.size, d.size);
      }
    }
    if (t > PERFECT) glow(ctx, w / 2, oy + (rows * px) / 2, S * 0.8, [255, 60, 130], 0.12 * pulse);
    ctx.globalCompositeOperation = 'source-over';

    // Marcador y textos del arcade
    ctx.font = `700 ${Math.max(10, Math.round(S * 0.045))}px "Courier New", monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = rgbaOf(NEON, 0.9 * intro);
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${String(placed * 100).padStart(6, '0')}`, ox - 4, oy - px * 2 - S * 0.09);
    ctx.textAlign = 'right';
    ctx.fillText(`LOVE ${Math.round((placed / blocks.length) * 100)}%`, ox + cols * px + 4, oy - px * 2 - S * 0.09);
    if (t > PERFECT) {
      const pop = easeOutBack(clamp((t - PERFECT) / 0.5));
      ctx.save();
      ctx.translate(w / 2, oy + rows * px + S * 0.1);
      ctx.scale(pop, pop);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${Math.round(S * 0.1)}px "Courier New", monospace`;
      ctx.fillStyle = '#7048e8';
      ctx.fillText('PERFECT!', 3, 3);
      ctx.fillStyle = Math.sin(t * 12) > 0 ? '#ffe066' : '#ffffff';
      ctx.fillText('PERFECT!', 0, 0);
      ctx.restore();
      if (Math.sin(t * 4) > 0) {
        ctx.textAlign = 'center';
        ctx.font = `700 ${Math.max(9, Math.round(S * 0.04))}px "Courier New", monospace`;
        ctx.fillStyle = rgbaOf(NEON, 0.8);
        ctx.fillText('PLAYER 2 READY?', w / 2, oy + rows * px + S * 0.2);
      }
    }

    // Líneas de barrido de monitor CRT
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  };
}
