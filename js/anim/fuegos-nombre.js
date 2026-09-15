import {
  TAU, clamp, rand, pick, lerp, easeOutCubic, easeInOut, rgbaOf, glow, softBackdrop, makeLayer, makeVignette,
  makeStars, drawStars, textPoints, cardName, heartPoint,
} from './util.js';

// ✏️ Paletas de fuegos y texto por defecto (sin nombre)
const PALETTES = [
  [[255, 214, 110], [255, 170, 80]],
  [[255, 110, 160], [255, 200, 230]],
  [[120, 200, 255], [220, 240, 255]],
  [[170, 255, 170], [255, 255, 200]],
  [[200, 150, 255], [255, 220, 255]],
];
const NAME_COLOR = [255, 220, 150];
const FALLBACK = 'TE AMO';

// Guion (segundos)
const LAUNCH = 2.4; // salen los cohetes del nombre
const BURST = 3.3; // estallan y vuelan a formar letras
const HOLD = 7.2; // las letras se deshacen como sauce dorado

export default function create(ctx, w, h, dpr = 1, stage) {
  const S = Math.min(w, h * 0.62);
  const water = h * 0.84;
  const small = S < 300;

  const sky = softBackdrop(w, h, dpr, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#02030d');
    grad.addColorStop(0.65, '#0d1030');
    grad.addColorStop(1, '#2a1a3a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const stars = makeStars(w, h * 0.6, Math.round((w * h) / 3200));
  const city = makeLayer(w, h, dpr, (g) => {
    const blocks = [];
    for (let x = -10; x < w + 10;) {
      const bw = S * rand(0.06, 0.13);
      blocks.push({ x, bw, bh: h * rand(0.05, 0.17) });
      x += bw + rand(0, 3);
    }
    for (const b of blocks) {
      g.fillStyle = '#05060f';
      g.fillRect(b.x, water - b.bh, b.bw, b.bh);
      for (let wy = water - b.bh + 5; wy < water - 4; wy += 7) {
        for (let wx = b.x + 3; wx < b.x + b.bw - 3; wx += 6) {
          if (Math.random() < 0.35) {
            g.fillStyle = `rgba(255, ${Math.round(rand(180, 230))}, 120, ${rand(0.4, 0.9)})`;
            g.fillRect(wx, wy, 2, 3);
          }
        }
      }
    }
    const river = g.createLinearGradient(0, water, 0, h);
    river.addColorStop(0, '#0a0c22');
    river.addColorStop(1, '#020309');
    g.fillStyle = river;
    g.fillRect(0, water, w, h - water);
    g.save();
    g.globalAlpha = 0.18;
    g.translate(0, water * 2);
    g.scale(1, -1);
    for (const b of blocks) {
      g.fillStyle = '#1a1c3a';
      g.fillRect(b.x, water - b.bh, b.bw, b.bh);
    }
    g.restore();
  });
  const vignette = makeVignette(ctx, w, h, 0.55, w / 2, h * 0.45);

  const sparks = [];
  const flashes = [];
  const rockets = [];

  const burst = (x, y, palette, count, speed, opts = {}) => {
    flashes.push({ x, y, color: palette[0], born: opts.t, power: opts.power || 1 });
    for (let i = 0; i < count; i++) {
      let vx;
      let vy;
      if (opts.heart) {
        const p = heartPoint(i / count, speed * 1.6);
        vx = p.x * rand(0.95, 1.05);
        vy = p.y * rand(0.95, 1.05);
      } else {
        const a = rand(0, TAU);
        const v = speed * Math.sqrt(rand(0.15, 1));
        vx = Math.cos(a) * v;
        vy = Math.sin(a) * v;
      }
      sparks.push({
        x, y, px: x, py: y, vx, vy, life: 0, max: rand(1.1, 1.9) * (opts.long || 1),
        color: pick(palette), drag: opts.heart ? 0.9 : 1.6, grav: S * 0.25, width: rand(1.2, 2.2),
      });
    }
  };
  const launch = (x, apex, palette, t, onBurst) => {
    rockets.push({ x, y0: h * 0.98, apex, born: t, dur: rand(0.8, 1.05), palette, onBurst, wobble: rand(0, TAU) });
  };

  // Letras del nombre: se recalculan si cambia (en crear se escribe en vivo)
  let currentName = '';
  let letters = [];
  const buildLetters = (name) => {
    currentName = name;
    const gap = Math.max(3, Math.round(S * 0.012));
    let pts = textPoints(name, w * 0.9, S * 0.26, gap);
    const cap = small ? 260 : 520;
    if (pts.length > cap) {
      const keep = cap / pts.length;
      pts = pts.filter((_, i) => (i * keep) % 1 < keep);
    }
    const origins = [{ x: w * 0.25, y: h * 0.3 }, { x: w * 0.5, y: h * 0.24 }, { x: w * 0.75, y: h * 0.3 }];
    letters = pts.map((p) => {
      const tx = w / 2 + p.x;
      const ty = h * 0.4 + p.y;
      const origin = origins[Math.min(2, Math.floor((tx / w) * 3))];
      const a = rand(0, TAU);
      const v = S * rand(0.3, 1.2);
      return { tx, ty, ox: origin.x, oy: origin.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, phase: rand(0, TAU), fall: rand(0.6, 1.4), drift: rand(-1, 1) };
    });
  };

  const letterAt = (l, t) => {
    const local = t - BURST;
    const free = { x: l.ox + (l.vx * (1 - Math.exp(-local * 3))) / 3, y: l.oy + (l.vy * (1 - Math.exp(-local * 3))) / 3 + S * 0.1 * local * local };
    const k = easeInOut(clamp((local - 0.2) / 1));
    let x = lerp(free.x, l.tx + Math.sin(t * 2 + l.phase) * 0.8, k);
    let y = lerp(free.y, l.ty + Math.cos(t * 1.7 + l.phase) * 0.8, k);
    const drop = t - HOLD;
    if (drop > 0) {
      y += S * 0.35 * l.fall * drop * drop;
      x += l.drift * S * 0.05 * drop;
    }
    return { x, y };
  };

  let scheduled = [0.4, 1.1, 1.75];
  let nextAmbient = HOLD + 1.6;
  let lastT = 0;
  const events = { name: false, heart: false };

  return (t, dt) => {
    const name = cardName(stage, FALLBACK);
    if (name !== currentName) buildLetters(name);
    if (t < lastT) {
      sparks.length = 0;
      rockets.length = 0;
      flashes.length = 0;
      scheduled = [0.4, 1.1, 1.75];
      events.name = false;
      events.heart = false;
      nextAmbient = HOLD + 1.6;
    }
    lastT = t;

    // Programa de lanzamientos
    while (scheduled.length && t >= scheduled[0]) {
      const at = scheduled.shift();
      const palette = pick(PALETTES);
      launch(rand(w * 0.2, w * 0.8), h * rand(0.18, 0.4), palette, at, (x, y, now) => burst(x, y, palette, small ? 70 : 120, S * rand(0.5, 0.75), { t: now }));
    }
    if (!events.name && t >= LAUNCH) {
      events.name = true;
      for (const x of [0.25, 0.5, 0.75]) launch(w * x, x === 0.5 ? h * 0.24 : h * 0.3, [NAME_COLOR], LAUNCH, (bx, by, now) => flashes.push({ x: bx, y: by, color: NAME_COLOR, born: now, power: 1.5 }));
    }
    if (!events.heart && t >= HOLD + 0.8) {
      events.heart = true;
      launch(w / 2, h * 0.32, PALETTES[1], t, (x, y, now) => burst(x, y, PALETTES[1], small ? 90 : 150, S * 0.55, { t: now, heart: true, long: 1.4, power: 1.3 }));
    }
    if (t >= nextAmbient) {
      nextAmbient = t + rand(0.9, 1.6);
      const palette = pick(PALETTES);
      launch(rand(w * 0.15, w * 0.85), h * rand(0.15, 0.45), palette, t, (x, y, now) => burst(x, y, palette, small ? 60 : 100, S * rand(0.45, 0.7), { t: now }));
    }

    ctx.drawImage(sky, 0, 0, w, h);
    drawStars(ctx, stars, t);

    // Luz de los estallidos sobre el cielo
    ctx.globalCompositeOperation = 'lighter';
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      const age = t - f.born;
      if (age > 1.2) {
        flashes.splice(i, 1);
        continue;
      }
      glow(ctx, f.x, f.y, S * (0.6 + age) * f.power, f.color, 0.35 * (1 - age / 1.2) * f.power);
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.drawImage(city, 0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    // Cohetes subiendo con estela
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      const k = (t - r.born) / r.dur;
      if (k >= 1) {
        const x = r.x + Math.sin(r.wobble + 3) * 4;
        r.onBurst(x, r.apex, t);
        rockets.splice(i, 1);
        continue;
      }
      const y = lerp(r.y0, r.apex, easeOutCubic(k));
      const x = r.x + Math.sin(r.wobble + k * 3) * 4;
      const tail = lerp(r.y0, r.apex, easeOutCubic(Math.max(0, k - 0.12)));
      ctx.strokeStyle = rgbaOf(r.palette[0], 0.6);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.sin(r.wobble + k * 3) * 2, tail);
      ctx.stroke();
      glow(ctx, x, y, S * 0.03, [255, 240, 200], 0.9);
    }

    // Chispas agrupadas por color para dibujar rápido
    const groups = new Map();
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life += dt;
      if (p.life > p.max) {
        sparks.splice(i, 1);
        continue;
      }
      p.px = p.x;
      p.py = p.y;
      const drag = 1 - Math.min(1, p.drag * dt);
      p.vx *= drag;
      p.vy = p.vy * drag + p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const fade = 1 - p.life / p.max;
      const key = `${p.color.join(',')}|${fade > 0.66 ? 3 : fade > 0.33 ? 2 : 1}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    for (const [key, list] of groups) {
      const [rgb, level] = key.split('|');
      ctx.strokeStyle = `rgba(${rgb}, ${Number(level) / 3})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (const p of list) {
        ctx.moveTo(p.px - (p.x - p.px) * 2, p.py - (p.y - p.py) * 2);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Nombre formado con chispas doradas: momento WOW
    if (t >= BURST && t < HOLD + 2.5) {
      const fade = t > HOLD ? clamp(1 - (t - HOLD) / 2.3) : 1;
      const formed = clamp((t - BURST - 0.8) / 0.6);
      ctx.fillStyle = rgbaOf(NAME_COLOR, 0.95 * fade);
      for (const l of letters) {
        const p = letterAt(l, t);
        const twinkle = 0.6 + 0.4 * Math.sin(t * 9 + l.phase * 3);
        ctx.fillRect(p.x - 1, p.y - 1, 2 + twinkle, 2 + twinkle);
      }
      if (formed > 0 && t < HOLD + 0.5) {
        const centerGlow = formed * (t < HOLD ? 1 : 1 - (t - HOLD) / 0.5);
        glow(ctx, w / 2, h * 0.4, S * 0.8, NAME_COLOR, 0.12 * centerGlow + 0.25 * Math.exp(-(t - BURST - 1.2) * 3) * (t > BURST + 1.2 ? 1 : 0));
      }
    }

    // Reflejo de los estallidos en el río
    for (const f of flashes) {
      const age = t - f.born;
      ctx.fillStyle = rgbaOf(f.color, 0.18 * (1 - age / 1.2) * f.power);
      for (let i = 0; i < 6; i++) {
        const y = water + 6 + i * ((h - water) / 6);
        const width = S * (0.08 + i * 0.03);
        ctx.fillRect(f.x - width / 2 + Math.sin(t * 3 + i) * 4, y, width, 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  };
}
