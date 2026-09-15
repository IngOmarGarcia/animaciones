import {
  TAU, clamp, rand, lerp, easeInOut, easeOutBack, rgbaOf, glow, sparkle, softBackdrop, makeVignette,
} from './util.js';

// ✏️ Colores del terciopelo, el oro y el diamante
const VELVET = ['#7a0f2b', '#b3173f', '#4a0718'];
const GOLD = [255, 205, 110];
const RAINBOW = [[255, 120, 120], [255, 220, 120], [140, 255, 170], [120, 190, 255], [220, 140, 255]];

// Guion en segundos desde que se toca la cajita
const LID = 0.7; // la tapa terminó de abrirse
const RISE = 1.3; // el anillo sube
const FLARE = 1.8; // destello del diamante: momento WOW
const REVEAL = 2.3;

export default function create(ctx, w, h, dpr = 1, stage) {
  const S = Math.min(w, h * 0.62);
  const cx = w / 2;
  const cy = h * 0.66;
  const bw = S * 0.52;
  const bh = S * 0.24;
  const autoOpen = stage && !stage.auto ? 6 : 2.5;

  const room = softBackdrop(w, h, dpr, (g) => {
    const base = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h));
    base.addColorStop(0, '#2a0f18');
    base.addColorStop(0.6, '#0d0508');
    base.addColorStop(1, '#020102');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) {
      g.fillStyle = `rgba(255, ${Math.round(rand(150, 210))}, ${Math.round(rand(110, 170))}, ${rand(0.12, 0.32)})`;
      g.beginPath();
      g.arc(rand(0, w), rand(0, h * 0.75), S * rand(0.03, 0.1), 0, TAU);
      g.fill();
    }
  });
  const vignette = makeVignette(ctx, w, h, 0.7, cx, cy);
  const petals = Array.from({ length: 14 }, () => ({ x: rand(-1, 1), y: rand(0.2, 0.5), r: rand(0, TAU), size: rand(0.02, 0.035) }));

  let openAt = null;

  return (t) => {
    if (openAt === null) {
      const tapped = stage && stage.taps.length > 0 && t > 0.3;
      if (tapped || t >= autoOpen) openAt = t;
    }
    if (stage) stage.taps.length = 0;
    const q = openAt === null ? -1 : t - openAt;
    if (stage && q >= REVEAL) stage.revealed = true;

    const intro = clamp(t / 1);
    const lid = easeOutBack(clamp(q / LID));
    const rise = easeInOut(clamp((q - LID + 0.2) / (RISE - LID + 0.2)));
    const flare = q >= FLARE ? Math.exp(-(q - FLARE) * 2) : 0;
    const idle = q < 0 ? Math.sin(t * 1.5) * S * 0.006 : 0;

    ctx.drawImage(room, 0, 0, w, h);

    // Pétalos de rosa sobre la mesa
    for (const p of petals) {
      ctx.save();
      ctx.translate(cx + p.x * S * 0.6, cy + bh * 0.6 + p.y * S * 0.3);
      ctx.rotate(p.r);
      ctx.fillStyle = '#8f1230';
      ctx.beginPath();
      ctx.ellipse(0, 0, S * p.size, S * p.size * 0.6, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + bh * 0.55, bw * 0.65, bh * 0.2, 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy + idle);

    // Tapa abierta (detrás del cuerpo)
    const drawLid = () => {
      ctx.save();
      ctx.translate(0, -bh * 0.1);
      ctx.scale(1, lerp(1, -1.15, lid));
      const g = ctx.createLinearGradient(0, 0, 0, -bh * 0.8);
      g.addColorStop(0, VELVET[2]);
      g.addColorStop(0.5, VELVET[1]);
      g.addColorStop(1, VELVET[0]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-bw / 2, -bh * 0.75, bw, bh * 0.75, [S * 0.05, S * 0.05, 0, 0]);
      ctx.fill();
      if (lid > 0.5) {
        ctx.fillStyle = '#f3e6dc';
        ctx.beginPath();
        ctx.roundRect(-bw * 0.42, -bh * 0.65, bw * 0.84, bh * 0.55, S * 0.02);
        ctx.fill();
      }
      ctx.restore();
    };
    if (lid > 0.5) drawLid();

    const body = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    body.addColorStop(0, VELVET[2]);
    body.addColorStop(0.4, VELVET[1]);
    body.addColorStop(1, VELVET[2]);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh * 0.1, bw, bh * 0.6, [0, 0, S * 0.03, S * 0.03]);
    ctx.fill();
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(-bw / 2, -bh * 0.12, bw, bh * 0.05);

    // Interior con luz y cojín
    if (lid > 0.05) {
      ctx.fillStyle = '#2a0610';
      ctx.fillRect(-bw * 0.44, -bh * 0.1, bw * 0.88, bh * 0.14);
      ctx.globalCompositeOperation = 'lighter';
      const beam = ctx.createLinearGradient(0, 0, 0, -S * 1.2);
      beam.addColorStop(0, rgbaOf(GOLD, 0.35 * lid));
      beam.addColorStop(1, rgbaOf(GOLD, 0));
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.4, -bh * 0.05);
      ctx.lineTo(bw * 0.4, -bh * 0.05);
      ctx.lineTo(bw * 0.9, -S * 1.2);
      ctx.lineTo(-bw * 0.9, -S * 1.2);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    // Anillo: aro dorado con volumen y diamante tallado
    if (lid > 0.3) {
      const ry = -bh * 0.05 - rise * S * 0.22;
      const rr = S * 0.075;
      for (const [width, color] of [[S * 0.028, '#8a5a12'], [S * 0.02, '#e7b449'], [S * 0.007, '#fff1c4']]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.ellipse(0, ry, rr, rr * 0.45, 0, 0, TAU);
        ctx.stroke();
      }
      const dy = ry - rr * 0.5;
      const d = S * 0.055;
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(-d * 0.35, dy, d * 0.7, d * 0.35);
      const facets = [
        [[-d, -d * 0.2], [-d * 0.5, -d * 0.7], [0, -d * 0.2]],
        [[0, -d * 0.2], [-d * 0.5, -d * 0.7], [d * 0.5, -d * 0.7]],
        [[0, -d * 0.2], [d * 0.5, -d * 0.7], [d, -d * 0.2]],
        [[-d, -d * 0.2], [0, -d * 0.2], [0, d * 0.7]],
        [[0, -d * 0.2], [d, -d * 0.2], [0, d * 0.7]],
      ];
      facets.forEach((f, i) => {
        const shimmer = 0.7 + 0.3 * Math.sin(t * 3 + i * 1.3);
        ctx.fillStyle = `rgba(${Math.round(200 + 55 * shimmer)}, ${Math.round(225 + 30 * shimmer)}, 255, ${0.75 + 0.2 * (i % 2)})`;
        ctx.beginPath();
        f.forEach(([x, y], k) => (k ? ctx.lineTo(x, dy + y) : ctx.moveTo(x, dy + y)));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 0, dy - d * 0.2, S * (0.15 + 0.6 * flare), [230, 240, 255], 0.5 * rise + 0.6 * flare);
      if (q > FLARE - 0.3) {
        const k = clamp((q - FLARE + 0.3) / 0.5);
        RAINBOW.forEach((color, i) => {
          const a = t * 0.6 + (i / RAINBOW.length) * TAU;
          const len = S * (0.3 + 0.5 * flare);
          ctx.strokeStyle = rgbaOf(color, 0.35 * k * (0.5 + flare));
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, dy - d * 0.2);
          ctx.lineTo(Math.cos(a) * len, dy - d * 0.2 + Math.sin(a) * len);
          ctx.stroke();
        });
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + t;
          const dist = S * (0.12 + 0.25 * (1 - flare));
          sparkle(ctx, Math.cos(a) * dist, dy + Math.sin(a) * dist, S * 0.015, RAINBOW[i % RAINBOW.length], 0.4 + 0.6 * flare);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (lid <= 0.5) drawLid();
    ctx.restore();

    if (q < 0 && stage && !stage.auto && t > 1) {
      ctx.fillStyle = `rgba(255, 235, 225, ${clamp((t - 1) / 0.6) * (0.6 + 0.4 * Math.sin(t * 3))})`;
      ctx.font = `600 ${Math.round(S * 0.05)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Toca la cajita', cx, Math.min(h - S * 0.05, cy + bh * 1.4));
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
