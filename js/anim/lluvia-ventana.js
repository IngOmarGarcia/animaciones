import {
  TAU, clamp, rand, pick, lerp, easeInOut, rgbaOf, glow, heartPoint, softBackdrop, makeLayer, makeVignette,
} from './util.js';

// ✏️ Colores de las luces de la ciudad y del corazón
const CITY = [[255, 170, 80], [255, 120, 90], [120, 170, 255], [255, 220, 150], [200, 120, 255]];
const WARM = [255, 190, 130];

// Guion (segundos)
const DRAW = 2.6; // empieza a dibujarse el corazón en el vaho
const DONE = 4.6; // corazón terminado
const LIGHTNING = 4.9; // relámpago: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const scale = Math.min(2, Math.max(1, dpr));
  const heart = { x: w / 2, y: h * 0.5, size: S * 0.72 };

  const city = softBackdrop(w, h, dpr, (g) => {
    const base = g.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#0b0f1e');
    base.addColorStop(1, '#1c1420');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = rgbaOf(pick(CITY), rand(0.25, 0.7));
      g.beginPath();
      g.arc(rand(0, w), rand(h * 0.25, h), S * rand(0.02, 0.09), 0, TAU);
      g.fill();
    }
  }, 9);

  // Gotas quietas pegadas al vidrio: borde oscuro abajo, reflejo arriba
  const droplets = makeLayer(w, h, dpr, (g) => {
    for (let i = 0; i < Math.round((w * h) / 900); i++) {
      const x = rand(0, w);
      const y = rand(0, h);
      const r = rand(0.8, 3.2) * (S / 380);
      g.fillStyle = 'rgba(255, 255, 255, 0.06)';
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      g.lineWidth = r * 0.35;
      g.beginPath();
      g.arc(x, y, r * 0.8, 0.2, Math.PI - 0.2);
      g.stroke();
      g.fillStyle = 'rgba(255, 255, 255, 0.55)';
      g.beginPath();
      g.arc(x - r * 0.3, y - r * 0.35, r * 0.25, 0, TAU);
      g.fill();
    }
  });

  // Vaho del vidrio en su propio canvas: el dedo y las gotas lo borran
  const fog = document.createElement('canvas');
  fog.width = Math.ceil(w * scale);
  fog.height = Math.ceil(h * scale);
  const f = fog.getContext('2d');
  f.scale(scale, scale);
  const fillFog = () => {
    f.globalCompositeOperation = 'source-over';
    f.clearRect(0, 0, w, h);
    const g = f.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(190, 200, 220, 0.2)');
    g.addColorStop(1, 'rgba(190, 200, 220, 0.34)');
    f.fillStyle = g;
    f.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) {
      f.fillStyle = `rgba(220, 225, 240, ${rand(0.02, 0.06)})`;
      f.beginPath();
      f.arc(rand(0, w), rand(0, h), S * rand(0.02, 0.08), 0, TAU);
      f.fill();
    }
  };
  fillFog();

  const makeRunner = () => ({ x: rand(0, w), y: rand(-h * 0.3, h * 0.3), speed: rand(20, 60), r: rand(2.5, 4.5) * (S / 380), pause: rand(0, 2), wobble: rand(0, TAU) });
  const runners = Array.from({ length: 9 }, makeRunner);
  const rain = Array.from({ length: 70 }, () => ({ x: rand(0, w), y: rand(0, h), len: rand(8, 18), speed: rand(500, 800) }));
  const vignette = makeVignette(ctx, w, h, 0.6);

  let drawn = 0;
  let lastT = 0;

  return (t, dt) => {
    if (t < lastT) {
      fillFog();
      drawn = 0;
      runners.forEach((r) => Object.assign(r, makeRunner()));
    }
    lastT = t;
    const intro = clamp(t / 1.2);
    const flash = t > LIGHTNING ? Math.max(0, Math.exp(-(t - LIGHTNING) * 5) + 0.6 * Math.exp(-((t - LIGHTNING - 0.25) ** 2) * 80)) : 0;

    ctx.drawImage(city, 0, 0, w, h);
    if (flash > 0.01) {
      ctx.fillStyle = `rgba(210, 225, 255, ${0.5 * flash})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Lluvia afuera, detrás del vidrio
    ctx.strokeStyle = 'rgba(200, 215, 240, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of rain) {
      d.y += d.speed * dt;
      d.x -= d.speed * 0.12 * dt;
      if (d.y > h) {
        d.y = -20;
        d.x = rand(0, w * 1.1);
      }
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.len * 0.12, d.y - d.len);
    }
    ctx.stroke();

    // El dedo dibuja el corazón borrando el vaho
    const target = easeInOut(clamp((t - DRAW) / (DONE - DRAW)));
    f.globalCompositeOperation = 'destination-out';
    f.lineCap = 'round';
    f.lineJoin = 'round';
    f.lineWidth = S * 0.045;
    f.strokeStyle = 'rgba(0, 0, 0, 1)';
    if (target > drawn) {
      f.beginPath();
      const steps = Math.max(1, Math.ceil((target - drawn) * 120));
      for (let i = 0; i <= steps; i++) {
        const u = lerp(drawn, target, i / steps);
        const p = heartPoint((0.5 + u) % 1, heart.size);
        if (i) f.lineTo(heart.x + p.x, heart.y + p.y);
        else f.moveTo(heart.x + p.x, heart.y + p.y);
      }
      f.stroke();
      drawn = target;
    }

    // Gotas que resbalan y limpian su camino
    f.lineWidth = 1;
    for (const r of runners) {
      if (r.pause > 0) {
        r.pause -= dt;
      } else {
        const oy = r.y;
        r.y += r.speed * dt * (0.5 + Math.abs(Math.sin(t * 1.7 + r.wobble)));
        r.x += Math.sin(t * 3 + r.wobble) * 0.3;
        f.lineWidth = r.r * 0.9;
        f.beginPath();
        f.moveTo(r.x, oy);
        f.lineTo(r.x, r.y);
        f.stroke();
        if (Math.random() < dt * 0.6) r.pause = rand(0.2, 1);
      }
      if (r.y > h + 10) Object.assign(r, makeRunner(), { y: -10 });
    }
    f.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = intro;
    ctx.drawImage(fog, 0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.drawImage(droplets, 0, 0, w, h);

    for (const r of runners) {
      const g = ctx.createRadialGradient(r.x - r.r * 0.3, r.y - r.r * 0.4, 0, r.x, r.y, r.r);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      g.addColorStop(0.6, 'rgba(255, 255, 255, 0.08)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.r * 0.85, r.r, 0, 0, TAU);
      ctx.fill();
    }

    // Brillo cálido del corazón terminado
    if (t > DONE) {
      const k = clamp((t - DONE) / 0.8);
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, heart.x, heart.y, S * 0.7, WARM, (0.15 + 0.35 * flash) * k);
      ctx.strokeStyle = rgbaOf(WARM, (0.25 + 0.5 * flash) * k);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 90; i++) {
        const p = heartPoint(i / 90, heart.size * 1.04);
        if (i) ctx.lineTo(heart.x + p.x, heart.y + p.y);
        else ctx.moveTo(heart.x + p.x, heart.y + p.y);
      }
      ctx.stroke();
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
