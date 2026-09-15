import {
  TAU, clamp, rand, lerp, easeInOut, rgbaOf, glow, sparkle, softBackdrop, makeVignette, makeStars, drawStars, textPoints, cardName,
} from './util.js';

// ✏️ Colores de las estrellas y texto por defecto (sin nombre)
const STAR = [210, 225, 255];
const LINE = [150, 190, 255];
const FALLBACK = 'TE AMO';

// Guion (segundos)
const GATHER = 1.2; // las estrellas viajan a formar las letras
const LINK = 2.8; // se trazan las líneas de la constelación
const IGNITE = 4.6; // el nombre se enciende: momento WOW

export default function create(ctx, w, h, dpr = 1, stage) {
  const S = Math.min(w, h * 0.62);
  const sky = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#01020a');
    grad.addColorStop(0.6, '#0a1233');
    grad.addColorStop(1, '#1a1f4a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = rgbaOf([[80, 60, 160], [40, 80, 160], [120, 60, 120]][i % 3], rand(0.1, 0.25));
      g.beginPath();
      g.ellipse(rand(0, w), rand(0, h), S * rand(0.3, 0.6), S * rand(0.1, 0.25), rand(0, TAU), 0, TAU);
      g.fill();
    }
  }, 8);
  const field = makeStars(w, h, Math.round((w * h) / 2200));
  const vignette = makeVignette(ctx, w, h, 0.6);

  let currentName = '';
  let stars = [];
  let edges = [];
  const build = (name) => {
    currentName = name;
    // Muestreo fino del texto y luego adelgazado: estrellas separadas a lo largo de cada trazo
    const fine = Math.max(3, Math.round(S * 0.012));
    const raw = textPoints(name, w * 0.88, S * 0.34, fine, 500);
    // Si salen demasiadas estrellas se separan más (nunca se recorta el texto)
    let gap = Math.max(8, Math.round(S * 0.034));
    let pts = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      pts = [];
      for (const p of raw) {
        if (pts.every((k) => Math.hypot(k.x - p.x, k.y - p.y) >= gap)) pts.push(p);
      }
      if (pts.length <= 220) break;
      gap *= 1.2;
    }
    stars = pts.map((p) => ({
      x: w / 2 + p.x, y: h * 0.48 + p.y, fromX: rand(0, w), fromY: rand(0, h),
      size: rand(1.2, 2.4), phase: rand(0, TAU), delay: rand(0, 0.8),
    }));
    // Cada estrella se une a sus vecinas cercanas, ordenadas de izquierda a derecha
    const seen = new Set();
    edges = [];
    stars.forEach((a, i) => {
      stars
        .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
        .filter((n) => n.j !== i && n.d < gap * 1.6)
        .sort((m, n) => m.d - n.d)
        .slice(0, 2)
        .forEach((n) => {
          const key = i < n.j ? `${i}-${n.j}` : `${n.j}-${i}`;
          if (!seen.has(key)) {
            seen.add(key);
            edges.push({ a: i, b: n.j, order: Math.min(a.x, stars[n.j].x) / w });
          }
        });
    });
  };

  return (t) => {
    const name = cardName(stage, FALLBACK);
    if (name !== currentName) build(name);
    const intro = clamp(t / 1.2);
    const lit = clamp((t - IGNITE) / 0.6);
    const wow = t > IGNITE ? Math.exp(-(t - IGNITE) * 1.7) : 0;
    const link = clamp((t - LINK) / (IGNITE - LINK));

    ctx.drawImage(sky, 0, 0, w, h);
    ctx.globalAlpha = intro * (1 - 0.4 * lit);
    drawStars(ctx, field, t);
    ctx.globalAlpha = 1;

    const pos = stars.map((s) => {
      const k = easeInOut(clamp((t - GATHER - s.delay) / 1.4));
      return {
        x: lerp(s.fromX, s.x, k) + Math.sin(t * 0.8 + s.phase) * (1 - k) * 6,
        y: lerp(s.fromY, s.y, k) + Math.cos(t * 0.7 + s.phase) * (1 - k) * 6,
        k,
      };
    });

    ctx.globalCompositeOperation = 'lighter';
    // Líneas que se dibujan como constelación
    if (link > 0) {
      ctx.strokeStyle = rgbaOf(lit > 0 ? [255, 220, 170] : LINE, 0.35 + 0.35 * lit);
      ctx.lineWidth = 1 + lit;
      ctx.beginPath();
      for (const e of edges) {
        const k = clamp((link * 1.25 - e.order) / 0.25);
        if (k <= 0) continue;
        const a = pos[e.a];
        const b = pos[e.b];
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(lerp(a.x, b.x, k), lerp(a.y, b.y, k));
      }
      ctx.stroke();
    }
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const p = pos[i];
      const tw = 0.6 + 0.4 * Math.sin(t * 3 + s.phase * 2);
      const color = lit > 0 ? [lerp(STAR[0], 255, lit), lerp(STAR[1], 225, lit), lerp(STAR[2], 170, lit)] : STAR;
      glow(ctx, p.x, p.y, s.size * (3.5 + 1.5 * lit), color, (0.28 + 0.17 * lit) * tw * intro);
      ctx.fillStyle = rgbaOf([255, 255, 255], (0.6 + 0.4 * tw) * intro);
      ctx.fillRect(p.x - s.size / 2, p.y - s.size / 2, s.size, s.size);
    }

    if (wow > 0.01) {
      glow(ctx, w / 2, h * 0.48, S * 1.2, [255, 220, 170], 0.18 * wow);
      // Estrella fugaz que subraya el nombre
      const k = 1 - wow;
      const x = lerp(w * 0.05, w * 0.95, k);
      const y = h * 0.48 + S * 0.24 - Math.sin(k * Math.PI) * S * 0.03;
      const tail = ctx.createLinearGradient(x, y, x - S * 0.4, y + S * 0.02);
      tail.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      tail.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = tail;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - S * 0.4, y + S * 0.02);
      ctx.stroke();
      sparkle(ctx, x, y, S * 0.03, [255, 240, 210], wow);
    }
    if (lit > 0) {
      for (let i = 0; i < 6; i++) {
        const s = pos[Math.floor((i * 37 + t * 3) % Math.max(1, pos.length))];
        const tw = 0.5 + 0.5 * Math.sin(t * 5 + i);
        if (s) sparkle(ctx, s.x, s.y, S * 0.02 * tw, [255, 230, 190], tw * lit);
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
