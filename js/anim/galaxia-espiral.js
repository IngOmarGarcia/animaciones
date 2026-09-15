import {
  TAU, clamp, rand, lerp, easeInOut, rgbaOf, glow, sparkle, softBackdrop, makeVignette, makeStars, drawStars, project3D,
} from './util.js';

// ✏️ Colores del núcleo y de los brazos
const CORE = [255, 236, 200];
const ARMS = [[140, 170, 255], [255, 140, 210], [190, 150, 255]];

// Guion (segundos)
const FORM = 3.6; // las partículas terminan de formar la galaxia
const NOVA = 4.3; // el núcleo estalla en luz: momento WOW

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = Math.round(clamp((w * h) / 250, 500, calm ? 600 : 1400));

  const backdrop = softBackdrop(w, h, dpr, (g) => {
    g.fillStyle = '#010108';
    g.fillRect(0, 0, w, h);
    const clouds = [[60, 30, 120], [120, 30, 90], [20, 60, 120]];
    for (let i = 0; i < 9; i++) {
      g.fillStyle = rgbaOf(clouds[i % 3], rand(0.18, 0.35));
      g.beginPath();
      g.ellipse(rand(0, w), rand(0, h), S * rand(0.3, 0.7), S * rand(0.15, 0.35), rand(0, TAU), 0, TAU);
      g.fill();
    }
  }, 8);
  const farStars = makeStars(w, h, Math.round((w * h) / 2000));
  const vignette = makeVignette(ctx, w, h, 0.7);

  const stars = Array.from({ length: count }, (_, i) => {
    const r = Math.pow(Math.random(), 0.7);
    const arm = i % 2;
    const spread = (1 - r * 0.6) * rand(-0.5, 0.5);
    return {
      r,
      angle: arm * Math.PI + Math.log(r + 0.08) * 2.4 + spread,
      y: (Math.random() - 0.5) * 0.12 * (1 - r) ** 2,
      chaos: { x: rand(-2.5, 2.5), y: rand(-2, 2), z: rand(-2.5, 2.5) },
      delay: rand(0, 0.8),
      color: r < 0.18 ? CORE : ARMS[i % ARMS.length],
      size: rand(0.6, 1.6) * (r < 0.18 ? 1.3 : 1),
    };
  });

  return (t) => {
    const intro = clamp(t / 1.2);
    const wow = t > NOVA ? Math.exp(-(t - NOVA) * 1.8) : 0;
    const settle = easeInOut(clamp((t - NOVA) / 2.5));
    const cam = {
      cx: w / 2, cy: h * 0.55, U: S * 0.62, D: S * 3,
      yaw: t * 0.05, pitch: lerp(-0.35, -1.05, settle),
    };

    ctx.drawImage(backdrop, 0, 0, w, h);
    drawStars(ctx, farStars, t);
    ctx.globalCompositeOperation = 'lighter';

    // Brazos: rotación diferencial, el centro gira más rápido
    const buckets = new Map();
    for (const s of stars) {
      const k = easeInOut(clamp((t - s.delay) / FORM));
      const spin = t * (0.9 / (s.r + 0.25)) * (0.4 + 0.6 * k);
      const a = s.angle + spin;
      const gx = Math.cos(a) * s.r;
      const gz = Math.sin(a) * s.r;
      const swirl = (1 - k) * t * 1.5;
      const cx = s.chaos.x * Math.cos(swirl) - s.chaos.z * Math.sin(swirl);
      const cz = s.chaos.x * Math.sin(swirl) + s.chaos.z * Math.cos(swirl);
      const p = project3D(cam, lerp(cx, gx, k), lerp(s.chaos.y, s.y, k), lerp(cz, gz, k));
      const alpha = clamp((0.35 + 0.65 * k) * intro * (p.f > 0 ? 1 : 0));
      const key = `${s.color.join(',')}|${alpha > 0.66 ? 3 : alpha > 0.33 ? 2 : 1}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push([p.x, p.y, s.size * p.f]);
    }
    for (const [key, list] of buckets) {
      const [rgb, level] = key.split('|');
      ctx.fillStyle = `rgba(${rgb}, ${Number(level) / 3})`;
      for (const [x, y, size] of list) ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }

    // Núcleo que crece y estalla
    const core = project3D(cam, 0, 0, 0);
    const form = easeInOut(clamp(t / FORM));
    // Polvo luminoso del disco: da densidad a la galaxia
    ctx.save();
    ctx.translate(core.x, core.y);
    ctx.scale(1, Math.max(0.15, Math.abs(Math.sin(cam.pitch))));
    glow(ctx, 0, 0, S * 0.6, [170, 150, 255], 0.22 * form * intro);
    glow(ctx, 0, 0, S * 0.35, [255, 170, 220], 0.18 * form * intro);
    ctx.restore();
    glow(ctx, core.x, core.y, S * (0.2 + 0.25 * form), CORE, (0.3 + 0.5 * form) * intro);
    glow(ctx, core.x, core.y, S * 0.08, [255, 255, 255], 0.9 * form);
    if (t > FORM && t < NOVA) {
      const charge = (t - FORM) / (NOVA - FORM);
      glow(ctx, core.x, core.y, S * 0.15 * (1 + charge), [255, 255, 255], charge);
    }
    if (wow > 0.01) {
      glow(ctx, core.x, core.y, S * (0.6 + (1 - wow) * 1.6), [255, 230, 255], 0.8 * wow);
      [[255, 120, 170], [255, 230, 160], [140, 180, 255]].forEach((color, i) => {
        ctx.strokeStyle = rgbaOf(color, 0.6 * wow);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(core.x, core.y, S * (0.2 + (1 - wow) * 1.3) * (1 + i * 0.03), S * (0.2 + (1 - wow) * 1.3) * 0.45 * (1 + i * 0.03), 0, 0, TAU);
        ctx.stroke();
      });
      ctx.fillStyle = rgbaOf([255, 255, 255], 0.25 * wow);
      ctx.fillRect(0, 0, w, h);
    }
    if (t > NOVA) {
      for (let i = 0; i < 5; i++) {
        const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
        const p = project3D(cam, Math.cos(i * 1.3 + t * 0.2) * 0.9, 0, Math.sin(i * 1.3 + t * 0.2) * 0.9);
        sparkle(ctx, p.x, p.y, S * 0.014 * tw, [220, 200, 255], 0.6 * tw);
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
