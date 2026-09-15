import {
  TAU, clamp, rand, lerp, easeInOut, rgbaOf, glow, sparkle, heartPoint, softBackdrop, makeVignette,
} from './util.js';

// ✏️ Colores del cristal y del oro
const GLASS = [230, 60, 110];
const GOLD = [255, 200, 90];

// Guion (segundos)
const GATHER = 1.6; // los fragmentos empiezan a volver
const JOINED = 3.6; // el corazón está completo
const GOLDEN = 4.8; // las grietas terminan de llenarse de oro: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const cx = w / 2;
  const cy = h * 0.55;
  const size = S * 0.95;

  const velvet = softBackdrop(w, h, dpr, (g) => {
    const base = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h));
    base.addColorStop(0, '#2c0f1d');
    base.addColorStop(0.6, '#0e050a');
    base.addColorStop(1, '#030103');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
  });
  const vignette = makeVignette(ctx, w, h, 0.75, cx, cy);

  // Contorno del corazón y cortes radiales irregulares desde un centro
  const outline = Array.from({ length: 120 }, (_, i) => heartPoint(i / 120, size));
  const center = { x: 0, y: size * 0.02 };
  const cuts = [];
  let a = 0;
  while (a < 120) {
    cuts.push(a);
    a += Math.round(rand(9, 16));
  }
  const crack = (from) => {
    const end = outline[from % 120];
    const pts = [center];
    for (let k = 1; k < 5; k++) {
      const u = k / 5;
      pts.push({ x: lerp(center.x, end.x, u) + rand(-1, 1) * size * 0.03, y: lerp(center.y, end.y, u) + rand(-1, 1) * size * 0.03 });
    }
    pts.push(end);
    return pts;
  };
  const cracks = cuts.map(crack);
  const shards = cuts.map((start, i) => {
    const stop = i + 1 < cuts.length ? cuts[i + 1] : 120;
    const edge = [];
    for (let j = start; j <= stop; j++) edge.push(outline[j % 120]);
    const next = cracks[(i + 1) % cracks.length];
    const poly = [...cracks[i], ...edge, ...[...next].reverse()];
    const mid = poly.reduce((acc, p) => ({ x: acc.x + p.x / poly.length, y: acc.y + p.y / poly.length }), { x: 0, y: 0 });
    const dir = Math.atan2(mid.y, mid.x) + rand(-0.4, 0.4);
    return {
      poly: poly.map((p) => ({ x: p.x - mid.x, y: p.y - mid.y })),
      home: mid,
      away: { x: mid.x + Math.cos(dir) * S * rand(0.35, 0.7), y: mid.y + Math.sin(dir) * S * rand(0.35, 0.7) },
      spin: rand(-1.5, 1.5),
      delay: rand(0, 0.8),
      phase: rand(0, TAU),
    };
  });

  return (t) => {
    const intro = clamp(t / 1.2);
    const gold = easeInOut(clamp((t - JOINED) / (GOLDEN - JOINED)));
    const wow = t > GOLDEN ? Math.exp(-(t - GOLDEN) * 1.8) : 0;
    const turn = t > GOLDEN ? 0.85 + 0.15 * Math.cos((t - GOLDEN) * 0.8) : 1;
    const breathe = 1 + 0.02 * Math.sin(t * 1.5);

    ctx.drawImage(velvet, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, cx, cy, S * 1.1, GLASS, 0.1 * intro);
    // Pulso dorado de anticipación
    if (t > GATHER - 0.8 && t < JOINED) glow(ctx, cx, cy, S * 0.4 * (1 + Math.sin(t * 6) * 0.1), GOLD, 0.25 * Math.sin(((t - GATHER + 0.8) / (JOINED - GATHER + 0.8)) * Math.PI));
    ctx.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(turn * breathe, breathe);

    for (const s of shards) {
      const k = easeInOut(clamp((t - GATHER - s.delay) / (JOINED - GATHER - 0.5)));
      const float = (1 - k) * S * 0.02;
      const x = lerp(s.away.x, s.home.x, k) + Math.sin(t * 1.3 + s.phase) * float;
      const y = lerp(s.away.y, s.home.y, k) + Math.cos(t * 1.1 + s.phase) * float;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((1 - k) * (s.spin + Math.sin(t * 0.7 + s.phase) * 0.3));
      ctx.beginPath();
      s.poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      const glass = ctx.createLinearGradient(-size * 0.3, -size * 0.3, size * 0.3, size * 0.3);
      glass.addColorStop(0, rgbaOf([255, 170, 200], 0.7 * intro));
      glass.addColorStop(0.5, rgbaOf(GLASS, 0.55 * intro));
      glass.addColorStop(1, rgbaOf([90, 10, 40], 0.7 * intro));
      ctx.fillStyle = glass;
      ctx.fill();
      ctx.strokeStyle = rgbaOf([255, 220, 235], 0.5 * intro * (1 - gold));
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Reflejo que recorre el cristal
    ctx.save();
    ctx.beginPath();
    outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const sweep = ((t * 0.3) % 1.5) - 0.25;
    const streak = ctx.createLinearGradient(-size + sweep * size * 2, -size, -size * 0.6 + sweep * size * 2, size);
    streak.addColorStop(0, 'rgba(255, 255, 255, 0)');
    streak.addColorStop(0.5, `rgba(255, 255, 255, ${0.18 * clamp((t - JOINED + 0.5) / 0.5)})`);
    streak.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = streak;
    ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.restore();

    // Vetas de oro que se llenan desde el centro
    if (gold > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [width, alpha] of [[S * 0.03, 0.18], [S * 0.012, 0.55], [S * 0.005, 1]]) {
        ctx.strokeStyle = rgbaOf(GOLD, alpha * (0.7 + 0.3 * Math.sin(t * 3)));
        ctx.lineWidth = width;
        ctx.beginPath();
        for (const c of cracks) {
          const n = (c.length - 1) * gold;
          ctx.moveTo(c[0].x, c[0].y);
          for (let i = 1; i <= Math.floor(n); i++) ctx.lineTo(c[i].x, c[i].y);
          const f = n - Math.floor(n);
          const i = Math.floor(n);
          if (i < c.length - 1) ctx.lineTo(lerp(c[i].x, c[i + 1].x, f), lerp(c[i].y, c[i + 1].y, f));
        }
        ctx.stroke();
      }
      ctx.strokeStyle = rgbaOf(GOLD, 0.8 * gold);
      ctx.lineWidth = S * 0.006;
      ctx.beginPath();
      outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();

    ctx.globalCompositeOperation = 'lighter';
    if (wow > 0.01) {
      glow(ctx, cx, cy, S * (0.8 + 0.8 * (1 - wow)), GOLD, 0.55 * wow);
      for (let i = 0; i < 16; i++) {
        const an = (i / 16) * TAU;
        const d = S * (0.45 + (1 - wow) * 0.5);
        sparkle(ctx, cx + Math.cos(an) * d, cy + Math.sin(an) * d, S * 0.02, GOLD, wow);
      }
    }
    if (t > GOLDEN) {
      for (let i = 0; i < 6; i++) {
        const c = cracks[i % cracks.length];
        const p = c[Math.floor((t * 2 + i) % c.length)];
        const tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7);
        sparkle(ctx, cx + p.x * turn * breathe, cy + p.y * breathe, S * 0.012 * tw, GOLD, tw * 0.8);
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
