import { TAU, clamp, rand, easeOutCubic } from './util.js';

// ✏️ Colores del cristal, de la luz y de las partículas (r, g, b)
const GLASS_DEEP = [90, 8, 34];
const GLASS = [232, 64, 108];
const GLASS_EDGE = [255, 214, 222];
const LEAF_DEEP = [8, 50, 30];
const LEAF = [60, 190, 120];
const GOLD = [255, 205, 110];

// Guion de la escena (segundos)
const LIGHT_ON = 0.9; // se enciende la luz cálida
const OPEN = 2.3; // empiezan a abrirse los pétalos
const BLOOM = 5.6; // momento WOW: termina de abrirse

const smoothstep = (x) => x * x * (3 - 2 * x);
const rgba = ([r, g, b], a) => `rgba(${r}, ${g}, ${b}, ${Math.max(0, a)})`;
const hash = (n) => {
  const s = Math.sin(n * 91.345) * 47453.5453;
  return s - Math.floor(s);
};

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);
  const cx = w / 2;
  const cy = h * 0.5;
  const RR = S * 0.36; // unidad 3D de la rosa, en píxeles
  const D = S * 3.2; // distancia de la cámara
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const beam = { x: w * 0.08, y: -h * 0.04 };

  // Pétalos: capas de adentro hacia afuera, más sépalos y hojas de cristal verde
  const layers = [
    { n: 3, r0: 0.01, L: 0.3, W: 0.2, closed: -0.3, open: 0.2, delay: 3.9, tint: GLASS, deep: GLASS_DEEP, y0: 0.04 },
    { n: 5, r0: 0.02, L: 0.42, W: 0.24, closed: -0.12, open: 0.4, delay: 3.5, tint: GLASS, deep: GLASS_DEEP, y0: 0 },
    { n: 8, r0: 0.05, L: 0.62, W: 0.34, closed: 0.05, open: 0.75, delay: 2.95, tint: GLASS, deep: GLASS_DEEP, y0: 0 },
    { n: 8, r0: 0.08, L: 0.8, W: 0.42, closed: 0.18, open: 1.1, delay: OPEN, tint: GLASS, deep: GLASS_DEEP, y0: 0 },
    { n: 5, r0: 0.03, L: 0.34, W: 0.12, closed: 1.9, open: 0.35, delay: OPEN, tint: LEAF, deep: LEAF_DEEP, y0: -0.06 },
  ];
  const petals = [];
  layers.forEach((layer, li) => {
    for (let i = 0; i < layer.n; i++) {
      petals.push({
        ...layer,
        phi: (i / layer.n) * TAU + li * 0.7 + rand(-0.12, 0.12),
        delay: layer.delay + i * 0.06 + rand(-0.1, 0.15),
        phase: rand(0, TAU),
        curl: rand(0.18, 0.32),
      });
    }
  });
  for (const phi of [0.4, 3.6]) {
    petals.push({ n: 1, r0: 0.03, L: 0.5, W: 0.2, closed: 1.2, open: 0.12, delay: OPEN, tint: LEAF, deep: LEAF_DEEP, y0: -1.1 - phi * 0.08, phi, phase: rand(0, TAU), curl: 0.3 });
  }

  // Punto de un pétalo en coordenadas de la rosa: u = largo (0..1), v = ancho (-1..1)
  const petalPoint = (p, u, v, k, sway) => {
    const width = p.W * Math.pow(Math.sin(Math.PI * (0.04 + u * 0.92)), 0.7);
    const X = v * width;
    const Y = u * p.L;
    const Z = -v * v * width * 0.55 + u ** 3 * p.L * p.curl * k;
    const th = p.closed + p.open * k + sway;
    const Yr = Y * Math.cos(th) - Z * Math.sin(th);
    const Zr = Z * Math.cos(th) + Y * Math.sin(th) + p.r0;
    return {
      x: Zr * Math.cos(p.phi) - X * Math.sin(p.phi),
      y: Yr + p.y0,
      z: Zr * Math.sin(p.phi) + X * Math.cos(p.phi),
    };
  };

  // Cámara: giro (yaw), inclinación desde arriba (pitch) y perspectiva
  const project = (pt, yaw, pitch) => {
    const x1 = pt.x * Math.cos(yaw) + pt.z * Math.sin(yaw);
    const z1 = -pt.x * Math.sin(yaw) + pt.z * Math.cos(yaw);
    const y2 = pt.y * Math.cos(pitch) - z1 * Math.sin(pitch);
    const z2 = pt.y * Math.sin(pitch) + z1 * Math.cos(pitch);
    const X = x1 * RR;
    const Y = y2 * RR;
    const Z = z2 * RR;
    const f = D / (D + Z);
    return { X, Y, Z, sx: cx + X * f, sy: cy - Y * f, f };
  };

  const lightDir = normalize({ x: -0.55, y: 0.65, z: -0.52 });
  const halfDir = normalize({ x: lightDir.x, y: lightDir.y, z: lightDir.z - 1 });

  const maxParticles = Math.round(Math.min(calm ? 40 : 150, (w * h) / 2200));
  const particles = [];
  const spawn = (burst) => ({
    a: rand(0, TAU),
    r: burst ? rand(0.05, 0.2) : rand(0.15, 0.6),
    y: burst ? rand(0.2, 0.5) : rand(-0.2, 0.5),
    vr: burst ? rand(1.5, 4.2) : rand(0.02, 0.1),
    vy: burst ? rand(-0.4, 1.4) : rand(0.08, 0.28),
    va: rand(-0.7, 0.7),
    life: 0,
    max: burst ? rand(1.8, 3.4) : rand(3, 6),
    size: rand(0.7, 1.9),
  });
  let burstDone = false;

  const dust = Array.from({ length: 34 }, () => ({ u: Math.random(), v: rand(-1, 1), speed: rand(0.01, 0.04), size: rand(0.5, 1.4), phase: rand(0, TAU) }));
  const vignette = ctx.createRadialGradient(cx, cy, S * 0.3, cx, cy, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.75)');

  const drawParticles = (list, yaw, pitch, light) => {
    for (const { p, s } of list) {
      const fade = Math.min(1, p.life / 0.4, (p.max - p.life) / 0.8) * light;
      const size = p.size * s.f * (S / 400);
      ctx.fillStyle = rgba(GOLD, 0.14 * fade);
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, size * 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba([255, 240, 200], 0.95 * fade);
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, size, 0, TAU);
      ctx.fill();
    }
  };

  return (t, dt) => {
    const lit = smoothstep(clamp((t - LIGHT_ON) / 1.5));
    const flash = t > BLOOM ? Math.exp(-(t - BLOOM) * 2.5) : 0;
    const light = lit * (1 + 0.35 * flash) * (0.96 + 0.04 * Math.sin(t * 7.3) * Math.sin(t * 3.1));
    const spin = calm ? 0 : smoothstep(clamp((t - BLOOM) / 1.8)) * TAU;
    const yaw = 0.4 + 0.3 * Math.sin(t * 0.35) + spin;
    const pitch = -0.5 + 0.04 * Math.sin(t * 0.5);
    const center = project({ x: 0, y: 0.25, z: 0 }, yaw, pitch);

    ctx.fillStyle = '#030103';
    ctx.fillRect(0, 0, w, h);

    // Luz cálida volumétrica, reflejo en el piso y polvo en el haz
    ctx.globalCompositeOperation = 'lighter';
    if (lit > 0) {
      const cone = ctx.createLinearGradient(beam.x, beam.y, center.sx, center.sy + RR);
      cone.addColorStop(0, `rgba(255, 196, 130, ${0.22 * lit})`);
      cone.addColorStop(1, 'rgba(255, 170, 110, 0)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(beam.x - S * 0.05, beam.y);
      ctx.lineTo(center.sx - RR * 1.9, h * 0.95);
      ctx.lineTo(center.sx + RR * 1.5, h * 0.8);
      ctx.lineTo(beam.x + S * 0.05, beam.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255, 190, 130, ${0.06 * lit})`;
      ctx.beginPath();
      ctx.moveTo(beam.x - S * 0.12, beam.y);
      ctx.lineTo(center.sx - RR * 2.8, h);
      ctx.lineTo(center.sx + RR * 2.4, h * 0.85);
      ctx.lineTo(beam.x + S * 0.12, beam.y);
      ctx.closePath();
      ctx.fill();
      const ambient = ctx.createRadialGradient(center.sx, center.sy, 0, center.sx, center.sy, RR * 2.6);
      ambient.addColorStop(0, `rgba(255, 120, 120, ${0.16 * light})`);
      ambient.addColorStop(1, 'rgba(255, 120, 120, 0)');
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, w, h);
      const pool = ctx.createRadialGradient(cx, h * 0.9, 0, cx, h * 0.9, RR * 1.7);
      pool.addColorStop(0, `rgba(255, 170, 130, ${0.2 * light})`);
      pool.addColorStop(1, 'rgba(255, 170, 130, 0)');
      ctx.save();
      ctx.translate(cx, h * 0.9);
      ctx.scale(1, 0.22);
      ctx.translate(-cx, -h * 0.9);
      ctx.fillStyle = pool;
      ctx.fillRect(cx - RR * 1.7, h * 0.9 - RR * 1.7, RR * 3.4, RR * 3.4);
      ctx.restore();
      for (const m of dust) {
        const u = (m.u + t * m.speed) % 1;
        const x = beam.x + (center.sx - beam.x) * u + m.v * RR * 1.4 * u + Math.sin(t + m.phase) * 6;
        const y = beam.y + (center.sy + RR * 0.6 - beam.y) * u;
        ctx.fillStyle = rgba([255, 220, 170], (0.35 + 0.3 * Math.sin(t * 2 + m.phase)) * lit * (1 - u * 0.5));
        ctx.beginPath();
        ctx.arc(x, y, m.size, 0, TAU);
        ctx.fill();
      }
    }

    // Rayos después del momento WOW
    if (t > BLOOM && !calm) {
      const rays = smoothstep(clamp((t - BLOOM) / 1.5));
      ctx.save();
      ctx.translate(center.sx, center.sy);
      ctx.rotate(t * 0.08);
      ctx.fillStyle = `rgba(255, 190, 140, ${0.045 * rays})`;
      const far = Math.max(w, h);
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, far, (i * TAU) / 12, (i * TAU) / 12 + 0.12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Tallo de cristal con un brillo que sube durante la anticipación
    const stem = [];
    for (let i = 0; i <= 8; i++) {
      const y = -0.05 - i * 0.3;
      stem.push(project({ x: Math.sin(y * 1.3) * 0.05, y, z: 0 }, yaw * 0.25, pitch));
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(LEAF, 0.3 * light);
    ctx.lineWidth = RR * 0.07;
    ctx.beginPath();
    stem.forEach((p, i) => (i ? ctx.lineTo(p.sx, p.sy) : ctx.moveTo(p.sx, p.sy)));
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(GLASS_EDGE, 0.45 * light);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    stem.forEach((p, i) => (i ? ctx.lineTo(p.sx - RR * 0.02, p.sy) : ctx.moveTo(p.sx - RR * 0.02, p.sy)));
    ctx.stroke();
    if (t > LIGHT_ON && t < OPEN + 0.3) {
      const q = clamp((t - LIGHT_ON) / (OPEN - LIGHT_ON));
      const p = project({ x: 0, y: -2.4 + q * 2.4, z: 0 }, yaw * 0.25, pitch);
      const glint = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, RR * 0.25);
      glint.addColorStop(0, `rgba(255, 240, 210, ${0.8 * Math.sin(q * Math.PI)})`);
      glint.addColorStop(1, 'rgba(255, 240, 210, 0)');
      ctx.fillStyle = glint;
      ctx.fillRect(p.sx - RR * 0.25, p.sy - RR * 0.25, RR * 0.5, RR * 0.5);
    }
    ctx.globalCompositeOperation = 'source-over';

    // Partículas doradas en 3D
    if (t > OPEN) {
      if (particles.length < maxParticles && Math.random() < dt * 40) particles.push(spawn(false));
      if (!burstDone && t > BLOOM) {
        burstDone = true;
        for (let i = 0; i < (calm ? 20 : 70); i++) particles.push(spawn(true));
      }
    }
    const behind = [];
    const front = [];
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life > p.max) {
        particles.splice(i, 1);
        continue;
      }
      p.r += p.vr * dt;
      p.vr *= 1 - Math.min(1, 1.8 * dt);
      p.y += p.vy * dt;
      p.a += p.va * dt;
      const s = project({ x: Math.cos(p.a) * p.r, y: p.y, z: Math.sin(p.a) * p.r }, yaw, pitch);
      (s.Z > 0 ? behind : front).push({ p, s });
    }
    ctx.globalCompositeOperation = 'lighter';
    drawParticles(behind, yaw, pitch, lit);
    ctx.globalCompositeOperation = 'source-over';

    // Pétalos ordenados de atrás hacia adelante
    const items = petals.map((p) => {
      const raw = clamp((t - p.delay) / 2);
      const k = 1 - (1 - raw) ** 3 + Math.sin(raw * Math.PI) * 0.05 + (t > BLOOM ? 0.03 * Math.sin(t * 1.1 + p.phase) : 0);
      const sway = 0.02 * Math.sin(t * 1.7 + p.phase) * (0.3 + raw);
      const at = (u, v) => project(petalPoint(p, u, v, k, sway), yaw, pitch);
      const pts = [];
      for (let i = 0; i <= 8; i++) pts.push(at(i / 8, -1));
      pts.push(at(1, 0));
      for (let i = 8; i >= 0; i--) pts.push(at(i / 8, 1));
      const a = at(0.5, 0);
      const du = at(0.56, 0);
      const dv = at(0.5, 0.12);
      const n = normalize(cross(
        { x: du.X - a.X, y: du.Y - a.Y, z: du.Z - a.Z },
        { x: dv.X - a.X, y: dv.Y - a.Y, z: dv.Z - a.Z },
      ));
      return {
        p, pts, depth: a.Z,
        base: at(0, 0), tip: at(1, 0),
        streak: [0.2, 0.4, 0.6, 0.8, 0.92].map((u) => at(u, -0.35)),
        diffuse: Math.abs(dot(n, lightDir)),
        fresnel: 1 - Math.abs(n.z),
        spec: Math.abs(dot(n, halfDir)) ** 20,
      };
    }).sort((a, b) => b.depth - a.depth);

    for (const it of items) {
      const glass = it.p.tint;
      ctx.beginPath();
      it.pts.forEach((q, i) => (i ? ctx.lineTo(q.sx, q.sy) : ctx.moveTo(q.sx, q.sy)));
      ctx.closePath();
      const body = ctx.createLinearGradient(it.base.sx, it.base.sy, it.tip.sx, it.tip.sy);
      body.addColorStop(0, rgba(it.p.deep, 0.6 * lit));
      body.addColorStop(0.55, rgba(glass, (0.16 + 0.34 * it.diffuse) * light));
      body.addColorStop(1, rgba(GLASS_EDGE, (0.2 + 0.35 * it.fresnel) * light));
      ctx.fillStyle = body;
      ctx.fill();

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(GLASS_EDGE, (0.1 + 0.55 * it.fresnel) * light);
      ctx.lineWidth = Math.max(0.8, 1.3 * it.base.f);
      ctx.stroke();
      // Dispersión: un segundo borde cian apenas desplazado, como luz separándose en el vidrio
      ctx.save();
      ctx.translate(0.8, 0.6);
      ctx.strokeStyle = rgba([120, 220, 255], 0.18 * it.fresnel * light);
      ctx.stroke();
      ctx.restore();
      if (it.spec > 0.02) {
        ctx.beginPath();
        it.streak.forEach((q, i) => (i ? ctx.lineTo(q.sx, q.sy) : ctx.moveTo(q.sx, q.sy)));
        ctx.strokeStyle = rgba([255, 240, 225], it.spec * 0.3 * light);
        ctx.lineWidth = 7 * it.base.f;
        ctx.stroke();
        ctx.strokeStyle = rgba([255, 252, 245], it.spec * light);
        ctx.lineWidth = 2 * it.base.f;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.globalCompositeOperation = 'lighter';
    // Luz cálida atrapada dentro del cristal
    const heart = project({ x: 0, y: 0.18, z: 0 }, yaw, pitch);
    const core = ctx.createRadialGradient(heart.sx, heart.sy, 0, heart.sx, heart.sy, RR * 0.55);
    core.addColorStop(0, `rgba(255, 210, 170, ${(0.35 + 0.1 * Math.sin(t * 2.2)) * light})`);
    core.addColorStop(0.5, `rgba(255, 110, 130, ${0.12 * light})`);
    core.addColorStop(1, 'rgba(255, 90, 120, 0)');
    ctx.fillStyle = core;
    ctx.fillRect(heart.sx - RR * 0.55, heart.sy - RR * 0.55, RR * 1.1, RR * 1.1);
    drawParticles(front, yaw, pitch, lit);

    // Intro: una chispa en la oscuridad
    if (t < LIGHT_ON + 0.6) {
      const spark = Math.sin(clamp(t / (LIGHT_ON + 0.6)) * Math.PI) * (0.7 + 0.3 * Math.sin(t * 20));
      const top = project({ x: 0, y: 0.45, z: 0 }, yaw, pitch);
      const g = ctx.createRadialGradient(top.sx, top.sy, 0, top.sx, top.sy, RR * 0.2);
      g.addColorStop(0, rgba([255, 230, 180], spark));
      g.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = g;
      ctx.fillRect(top.sx - RR * 0.2, top.sy - RR * 0.2, RR * 0.4, RR * 0.4);
    }

    // Momento WOW: destello, onda con dispersión de color y chispazos en las puntas
    if (t > BLOOM && t < BLOOM + 1.3) {
      const q = (t - BLOOM) / 1.3;
      const g = ctx.createRadialGradient(center.sx, center.sy, 0, center.sx, center.sy, RR * 3 * (0.5 + q));
      g.addColorStop(0, `rgba(255, 236, 210, ${0.85 * (1 - q) ** 2})`);
      g.addColorStop(1, 'rgba(255, 180, 140, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      [[255, 90, 90], [90, 255, 170], [120, 150, 255]].forEach((color, ci) => {
        const radius = (0.3 + 3 * easeOutCubic(q)) * (1 + (ci - 1) * 0.04 * q);
        ctx.strokeStyle = rgba(color, 0.55 * (1 - q));
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * TAU;
          const s = project({ x: Math.cos(a) * radius, y: 0.1, z: Math.sin(a) * radius }, 0, pitch);
          if (i) ctx.lineTo(s.sx, s.sy);
          else ctx.moveTo(s.sx, s.sy);
        }
        ctx.stroke();
      });
    }
    if (t > BLOOM - 0.4) {
      const slot = Math.floor(t * 3);
      const it = items.find((item) => item.p.tint === GLASS && hash(slot + item.p.phi) > 0.93) || items[Math.floor(hash(slot) * items.length)];
      const q = (t * 3) % 1;
      const size = Math.sin(q * Math.PI) * RR * 0.1 * light;
      if (it && size > 0.5) {
        ctx.strokeStyle = rgba([255, 250, 240], 0.9);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(it.tip.sx - size, it.tip.sy);
        ctx.lineTo(it.tip.sx + size, it.tip.sy);
        ctx.moveTo(it.tip.sx, it.tip.sy - size);
        ctx.lineTo(it.tip.sx, it.tip.sy + size);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  };
}

function normalize(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
