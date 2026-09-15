import {
  TAU, clamp, rand, lerp, easeInOut, rgbaOf, glow, heartPoint, softBackdrop, makeLayer, makeVignette,
} from './util.js';

// ✏️ Colores del cerezo y del cielo
const BLOSSOM = [[255, 183, 206], [255, 206, 222], [248, 160, 190], [255, 228, 236]];
const BARK = '#3b2630';

// Guion (segundos)
const BLOOM = 3; // el árbol termina de florecer
const GUST = 3.6; // ráfaga de viento
const HEART = 5; // los pétalos forman un corazón: momento WOW
const RELEASE = 7.4; // se dispersan

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ground = h * 0.86;

  const sky = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#6f79b8');
    grad.addColorStop(0.5, '#e7a7c1');
    grad.addColorStop(1, '#ffd9c7');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255, 245, 235, 0.55)';
    g.beginPath();
    g.arc(w * 0.72, h * 0.3, S * 0.12, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(150, 140, 190, 0.55)';
    g.beginPath();
    g.moveTo(w * 0.2, h * 0.72);
    g.lineTo(w * 0.62, h * 0.4);
    g.lineTo(w * 1.1, h * 0.72);
    g.closePath();
    g.fill();
  }, 5);

  // Árbol pre-renderizado: ramas recursivas y racimos de flores en dos capas
  const branches = [];
  const grow = (x, y, len, a, width, depth) => {
    if (depth === 0) return;
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    branches.push({ x, y, x2, y2, width, depth });
    const splits = depth > 5 ? 2 : 3;
    for (let i = 0; i < splits; i++) grow(x2, y2, len * rand(0.62, 0.8), a + rand(-0.7, 0.7), width * 0.66, depth - 1);
  };
  grow(w * 0.42, ground, S * 0.3, -Math.PI / 2 - 0.08, S * 0.07, 7);
  const tips = branches.filter((b) => b.depth <= 3);

  const tree = makeLayer(w, h, dpr, (g) => {
    g.lineCap = 'round';
    for (const b of branches) {
      g.strokeStyle = BARK;
      g.lineWidth = b.width;
      g.beginPath();
      g.moveTo(b.x, b.y);
      g.quadraticCurveTo((b.x + b.x2) / 2 + b.width, (b.y + b.y2) / 2, b.x2, b.y2);
      g.stroke();
      g.strokeStyle = 'rgba(255, 210, 220, 0.18)';
      g.lineWidth = b.width * 0.3;
      g.beginPath();
      g.moveTo(b.x - b.width * 0.25, b.y);
      g.lineTo(b.x2 - b.width * 0.25, b.y2);
      g.stroke();
    }
  });
  const flowers = [0, 1].map((layer) => makeLayer(w, h, dpr, (g) => {
    for (const b of tips) {
      if ((b.depth + layer) % 2) continue;
      const clusters = Math.round(rand(2, 5));
      for (let c = 0; c < clusters; c++) {
        const cx = lerp(b.x, b.x2, rand(0.3, 1)) + rand(-S * 0.04, S * 0.04);
        const cy = lerp(b.y, b.y2, rand(0.3, 1)) + rand(-S * 0.04, S * 0.03);
        const r = S * rand(0.035, 0.07);
        for (let k = 0; k < 26; k++) {
          const a = rand(0, TAU);
          const d = Math.sqrt(Math.random()) * r;
          const color = BLOSSOM[Math.floor(rand(0, BLOSSOM.length))];
          g.fillStyle = rgbaOf(color, rand(0.6, 0.95));
          g.beginPath();
          g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, S * rand(0.007, 0.013), 0, TAU);
          g.fill();
        }
      }
    }
  }));

  const count = calm ? 60 : Math.round(clamp((w * h) / 1400, 90, 220));
  const petals = Array.from({ length: count }, (_, i) => {
    const tip = tips[i % tips.length];
    return {
      x0: tip.x2 + rand(-S * 0.05, S * 0.05), y0: tip.y2 + rand(-S * 0.05, S * 0.05),
      slot: i / count, phase: rand(0, TAU), spin: rand(-4, 4), size: S * rand(0.018, 0.03),
      drift: rand(0.6, 1.4), color: BLOSSOM[i % BLOSSOM.length], delay: rand(0, 0.8),
    };
  });
  // Debajo de la copa, sobre el cielo, para que el corazón de pétalos contraste
  const heart = { x: w * 0.56, y: h * 0.66, size: S * 0.7 };
  const vignette = makeVignette(ctx, w, h, 0.35);

  // Posición de un pétalo: cae con viento, se arremolina en corazón y vuelve a volar
  const petalAt = (p, t) => {
    const life = Math.max(0, t - GUST + p.delay);
    const windX = life * S * 0.45 * p.drift + Math.sin(life * 1.5 + p.phase) * S * 0.08;
    const fallY = life * S * 0.12 + Math.cos(life * 2 + p.phase) * S * 0.04;
    let x = p.x0 + windX;
    let y = p.y0 + fallY;
    x = ((x % (w + S * 0.2)) + w + S * 0.2) % (w + S * 0.2) - S * 0.1;
    const form = easeInOut(clamp((t - HEART + 0.6) / 1)) * (1 - easeInOut(clamp((t - RELEASE) / 1.2)));
    if (form > 0) {
      const target = heartPoint((p.slot + t * 0.02) % 1, heart.size * (1 + 0.04 * Math.sin(t * 5)));
      x = lerp(x, heart.x + target.x + Math.sin(t * 2 + p.phase) * S * 0.01, form);
      y = lerp(y, heart.y + target.y + Math.cos(t * 2 + p.phase) * S * 0.01, form);
    }
    return { x, y, form };
  };

  return (t) => {
    const bloom = easeInOut(clamp((t - 0.4) / (BLOOM - 0.4)));
    const wind = Math.sin(t * 0.8) * 0.004 + (t > GUST && t < GUST + 1.5 ? Math.sin((t - GUST) * 6) * 0.01 * (1 - (t - GUST) / 1.5) : 0);
    const wow = t > HEART ? Math.exp(-(t - HEART) * 1.8) : 0;

    ctx.drawImage(sky, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, w * 0.72, h * 0.3, S * 0.6, [255, 230, 220], 0.35);
    ctx.globalCompositeOperation = 'source-over';

    const grass = ctx.createLinearGradient(0, ground - 10, 0, h);
    grass.addColorStop(0, '#9a6f8f');
    grass.addColorStop(1, '#4a3048');
    ctx.fillStyle = grass;
    ctx.fillRect(0, ground - 4, w, h - ground + 4);

    // Árbol con vaivén desde el tronco; las flores aparecen poco a poco
    ctx.save();
    ctx.translate(w * 0.42, ground);
    ctx.rotate(wind);
    ctx.translate(-w * 0.42, -ground);
    ctx.drawImage(tree, 0, 0, w, h);
    ctx.globalAlpha = bloom;
    ctx.drawImage(flowers[0], 0, 0, w, h);
    ctx.restore();
    ctx.save();
    ctx.translate(w * 0.42, ground);
    ctx.rotate(wind * 1.6);
    ctx.translate(-w * 0.42, -ground);
    ctx.globalAlpha = clamp(bloom * 1.3 - 0.3);
    ctx.drawImage(flowers[1], 0, 0, w, h);
    ctx.restore();
    ctx.globalAlpha = 1;

    // Pétalos al viento
    if (t > GUST - 0.8) {
      for (const p of petals) {
        const appear = clamp((t - GUST + 0.8 - p.delay) / 0.6);
        if (appear <= 0) continue;
        const { x, y, form } = petalAt(p, t);
        const flip = Math.cos(t * p.spin + p.phase);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * p.spin * 0.5 + p.phase);
        ctx.scale(1, Math.max(0.2, Math.abs(flip)));
        ctx.fillStyle = rgbaOf(p.color, 0.9 * appear);
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(p.size * 0.9, -p.size * 0.2, 0, p.size);
        ctx.quadraticCurveTo(-p.size * 0.9, -p.size * 0.2, 0, -p.size);
        ctx.fill();
        ctx.strokeStyle = rgbaOf([190, 70, 120], 0.45 * appear);
        ctx.lineWidth = Math.max(0.6, p.size * 0.12);
        ctx.stroke();
        if (form > 0.8) {
          ctx.fillStyle = rgbaOf([255, 255, 255], 0.3 * form);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    if (wow > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, heart.x, heart.y, S * 0.9, [255, 200, 220], 0.35 * wow);
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
