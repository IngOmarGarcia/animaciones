import {
  TAU, clamp, rand, pick, lerp, easeInOut, rgbaOf, glow, sparkle, softBackdrop, makeLayer, makeVignette, makeStars, drawStars,
} from './util.js';

// ✏️ Colores del cielo y de las estrellas fugaces
const METEOR_TINTS = [[210, 230, 255], [255, 230, 190], [190, 255, 220], [255, 200, 230]];
const FIREBALL = [255, 210, 150];

// Guion (segundos)
const SHOWER = 1.5; // empieza la lluvia de estrellas
const FIRE = 4.4; // gran bólido: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const ridge = h * 0.8;
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const radiant = { x: w * 0.85, y: h * 0.05 };

  // Cielo con la Vía Láctea
  const sky = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#01020a');
    grad.addColorStop(0.7, '#0b1430');
    grad.addColorStop(1, '#2a2a4a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.save();
    g.translate(w / 2, h * 0.4);
    g.rotate(-0.9);
    for (let i = 0; i < 16; i++) {
      g.fillStyle = rgbaOf([[150, 160, 220], [220, 190, 200], [120, 140, 200]][i % 3], rand(0.08, 0.2));
      g.beginPath();
      g.ellipse(rand(-h * 0.6, h * 0.6), rand(-S * 0.06, S * 0.06), S * rand(0.2, 0.45), S * rand(0.05, 0.12), 0, 0, TAU);
      g.fill();
    }
    g.restore();
  }, 7);
  const milky = makeLayer(w, h, dpr, (g) => {
    g.save();
    g.translate(w / 2, h * 0.4);
    g.rotate(-0.9);
    for (let i = 0; i < 1800; i++) {
      const x = rand(-h * 0.7, h * 0.7);
      const y = (Math.random() + Math.random() - 1) * S * 0.16;
      g.fillStyle = `rgba(255, 255, 255, ${rand(0.15, 0.7)})`;
      g.fillRect(x, y, rand(0.5, 1.3), rand(0.5, 1.3));
    }
    g.restore();
  });
  const stars = makeStars(w, ridge, Math.round((w * h) / 2800));

  const land = makeLayer(w, h, dpr, (g) => {
    g.fillStyle = '#04050b';
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w + 10; x += 10) {
      g.lineTo(x, ridge - h * 0.04 * Math.sin(x * 0.008 + 1) - h * 0.02 * Math.sin(x * 0.03));
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    // Árbol solitario
    const tx = w * 0.28;
    const ty = ridge - h * 0.03;
    g.strokeStyle = '#04050b';
    g.lineCap = 'round';
    const branch = (x, y, len, a, width, depth) => {
      if (depth === 0 || len < 2) return;
      const x2 = x + Math.cos(a) * len;
      const y2 = y + Math.sin(a) * len;
      g.lineWidth = width;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x2, y2);
      g.stroke();
      branch(x2, y2, len * 0.72, a - rand(0.25, 0.55), width * 0.7, depth - 1);
      branch(x2, y2, len * 0.72, a + rand(0.25, 0.55), width * 0.7, depth - 1);
    };
    branch(tx, ty, S * 0.13, -Math.PI / 2, S * 0.022, 7);
  });
  const vignette = makeVignette(ctx, w, h, 0.55, w / 2, h * 0.45);

  const meteors = [];
  let nextMeteor = SHOWER;
  let fired = false;
  let lastT = 0;
  const spawn = (t, big = false) => {
    const start = { x: rand(w * 0.2, w * 1.1), y: rand(-h * 0.05, h * 0.35) };
    const a = Math.atan2(start.y - radiant.y, start.x - radiant.x) + rand(-0.15, 0.15);
    meteors.push({
      x: start.x, y: start.y, a, born: t, dur: big ? 1.4 : rand(0.45, 0.9),
      len: S * (big ? 0.9 : rand(0.25, 0.5)), speed: S * (big ? 0.9 : rand(1.2, 2)),
      tint: big ? FIREBALL : pick(METEOR_TINTS), big,
    });
  };

  return (t) => {
    if (t < lastT) {
      meteors.length = 0;
      nextMeteor = SHOWER;
      fired = false;
    }
    lastT = t;
    const intro = clamp(t / 1.5);
    const intensity = easeInOut(clamp((t - SHOWER) / 2.5));
    if (t >= nextMeteor) {
      spawn(t);
      nextMeteor = t + lerp(0.8, calm ? 0.6 : 0.18, t < FIRE + 1.5 ? intensity : 0.3) * rand(0.6, 1.4);
    }
    if (!fired && t >= FIRE) {
      fired = true;
      spawn(t, true);
    }
    const wow = t > FIRE ? Math.exp(-((t - FIRE - 0.7) ** 2) * 3) : 0;

    ctx.drawImage(sky, 0, 0, w, h);
    ctx.globalAlpha = intro;
    ctx.drawImage(milky, 0, 0, w, h);
    drawStars(ctx, stars, t);
    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = 'lighter';
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      const k = (t - m.born) / m.dur;
      if (k >= 1) {
        meteors.splice(i, 1);
        continue;
      }
      const travel = m.speed * m.dur * k;
      const hx = m.x + Math.cos(m.a) * travel;
      const hy = m.y + Math.sin(m.a) * travel;
      const fade = Math.sin(k * Math.PI);
      const tail = m.len * (0.4 + 0.6 * fade);
      const g = ctx.createLinearGradient(hx, hy, hx - Math.cos(m.a) * tail, hy - Math.sin(m.a) * tail);
      g.addColorStop(0, rgbaOf(m.tint, 0.95 * fade));
      g.addColorStop(1, rgbaOf(m.tint, 0));
      ctx.strokeStyle = g;
      ctx.lineCap = 'round';
      ctx.lineWidth = m.big ? S * 0.012 : 1.6;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx - Math.cos(m.a) * tail, hy - Math.sin(m.a) * tail);
      ctx.stroke();
      glow(ctx, hx, hy, m.big ? S * 0.12 : S * 0.025, m.tint, fade);
      if (m.big && k > 0.55) {
        for (let s = 0; s < 10; s++) {
          const a = m.a + Math.PI + rand(-0.8, 0.8);
          const d = S * rand(0.05, 0.3) * (k - 0.55);
          sparkle(ctx, hx + Math.cos(a) * d * 3, hy + Math.sin(a) * d * 3, S * rand(0.006, 0.014), FIREBALL, fade * rand(0.3, 1));
        }
      }
    }
    // El bólido ilumina el paisaje
    if (wow > 0.01) glow(ctx, w * 0.5, ridge, S * 1.6, FIREBALL, 0.35 * wow);
    ctx.globalCompositeOperation = 'source-over';

    ctx.drawImage(land, 0, 0, w, h);
    if (wow > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      const lit = ctx.createLinearGradient(0, ridge - h * 0.08, 0, h);
      lit.addColorStop(0, rgbaOf(FIREBALL, 0));
      lit.addColorStop(0.2, rgbaOf(FIREBALL, 0.1 * wow));
      lit.addColorStop(1, rgbaOf(FIREBALL, 0));
      ctx.fillStyle = lit;
      ctx.fillRect(0, ridge - h * 0.08, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    if (intro < 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - intro})`;
      ctx.fillRect(0, 0, w, h);
    }
  };
}
