import {
  TAU, clamp, rand, pick, lerp, easeInOut, rgbaOf, glow, sparkle, heartPath, heartPoint, softBackdrop, makeVignette,
} from './util.js';

// ✏️ Colores neón de las mariposas
const NEON = [[255, 80, 200], [80, 230, 255], [180, 120, 255], [255, 150, 90]];

// Guion (segundos)
const GATHER = 3.2; // vuelan a formar el corazón
const IGNITE = 5; // el corazón se enciende: momento WOW
const TRAIL = 10;

export default function create(ctx, w, h, dpr = 1) {
  const S = Math.min(w, h * 0.62);
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const count = Math.round(clamp((w * h) / 9000, 12, calm ? 12 : 26));
  const heart = { x: w / 2, y: h * 0.56, size: S * 0.9 };

  const backdrop = softBackdrop(w, h, dpr, (g) => {
    const base = g.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h));
    base.addColorStop(0, '#1a0a2e');
    base.addColorStop(0.6, '#07030f');
    base.addColorStop(1, '#010005');
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 20; i++) {
      g.fillStyle = rgbaOf(pick(NEON), rand(0.06, 0.18));
      g.beginPath();
      g.arc(rand(0, w), rand(0, h), S * rand(0.05, 0.15), 0, TAU);
      g.fill();
    }
  });
  const vignette = makeVignette(ctx, w, h, 0.7, w / 2, h * 0.55);

  const flies = Array.from({ length: count }, (_, i) => ({
    color: NEON[i % NEON.length],
    size: S * rand(0.045, 0.075),
    seed: rand(0, 100),
    speed: rand(0.6, 1.1),
    slot: (i + 0.5) / count,
    flap: rand(9, 14),
    trail: [],
    x: rand(0, w),
    y: rand(h * 0.2, h),
  }));

  // Vuelo libre con ruido suave, luego cada una va a su lugar en el contorno del corazón
  const wander = (f, t) => ({
    x: w / 2 + Math.sin(t * 0.37 * f.speed + f.seed) * w * 0.42 + Math.sin(t * 1.1 + f.seed * 2) * S * 0.05,
    y: h * 0.55 + Math.cos(t * 0.29 * f.speed + f.seed * 1.7) * h * 0.3 + Math.sin(t * 0.9 + f.seed) * S * 0.05,
  });
  const onHeart = (f, t) => {
    const p = heartPoint(f.slot + Math.sin(t * 0.2 + f.seed) * 0.01, heart.size);
    return { x: heart.x + p.x + Math.sin(t * 2 + f.seed) * S * 0.008, y: heart.y + p.y + Math.cos(t * 1.7 + f.seed) * S * 0.008 };
  };

  return (t) => {
    const intro = clamp(t / 1.2);
    const gather = easeInOut(clamp((t - GATHER - lerp(0, 0.6, 0)) / 1.6));
    const lit = clamp((t - IGNITE) / 0.6);
    const wow = t > IGNITE ? Math.exp(-(t - IGNITE) * 2) : 0;
    const beat = t > IGNITE ? 1 + 0.05 * Math.pow(Math.max(0, Math.sin(t * 5)), 10) : 1;

    ctx.drawImage(backdrop, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    // Corazón de neón que se traza y enciende
    if (t > IGNITE - 0.6) {
      const draw = clamp((t - IGNITE + 0.6) / 0.6);
      ctx.lineCap = 'round';
      for (const [width, alpha] of [[S * 0.05, 0.08], [S * 0.02, 0.25], [S * 0.006, 0.95]]) {
        ctx.strokeStyle = rgbaOf([255, 120, 210], alpha * draw);
        ctx.lineWidth = width;
        ctx.beginPath();
        for (let i = 0; i <= 90 * draw; i++) {
          const p = heartPoint(i / 90, heart.size * beat);
          if (i) ctx.lineTo(heart.x + p.x, heart.y + p.y);
          else ctx.moveTo(heart.x + p.x, heart.y + p.y);
        }
        ctx.stroke();
      }
      glow(ctx, heart.x, heart.y, S * 0.9, [255, 90, 190], 0.12 * lit + 0.45 * wow);
      if (lit > 0) {
        heartPath(ctx, heart.x, heart.y - heart.size * 0.03, heart.size * 0.92 * beat);
        ctx.fillStyle = rgbaOf([255, 60, 170], 0.06 * lit);
        ctx.fill();
      }
    }
    if (wow > 0.02) {
      for (const radius of [1, 1.4]) {
        ctx.strokeStyle = rgbaOf([255, 170, 230], 0.5 * wow);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(heart.x, heart.y, S * radius * (0.5 + (1 - wow) * 0.6), 0, TAU);
        ctx.stroke();
      }
    }

    for (const f of flies) {
      const free = wander(f, t);
      const target = onHeart(f, t);
      const k = easeInOut(clamp(gather * 1.2 - f.slot * 0.2));
      const x = lerp(free.x, target.x, k);
      const y = lerp(free.y, target.y, k);
      const heading = Math.atan2(y - f.y, x - f.x);
      // Si salta mucho (primer cuadro, reinicio o cuadros lentos) la estela empieza de nuevo
      if (Math.hypot(x - f.x, y - f.y) > S * 0.15) f.trail.length = 0;
      f.x = x;
      f.y = y;
      f.trail.push({ x, y });
      if (f.trail.length > TRAIL) f.trail.shift();

      if (f.trail.length > 1) {
        ctx.strokeStyle = rgbaOf(f.color, 0.25 * intro);
        ctx.lineWidth = f.size * 0.18;
        ctx.beginPath();
        f.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
      }

      drawButterfly(ctx, x, y, f.size * (k > 0.9 ? 0.85 : 1), heading + Math.PI / 2, Math.sin(t * f.flap + f.seed), f.color, intro);
    }

    if (t > IGNITE) {
      for (let i = 0; i < 8; i++) {
        const p = heartPoint((i / 8 + t * 0.05) % 1, heart.size * 1.15);
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 2);
        sparkle(ctx, heart.x + p.x, heart.y + p.y, S * 0.012 * tw, [255, 220, 255], 0.7 * tw * lit);
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

// Mariposa de neón: alas con relleno tenue y contorno brillante; `flap` (-1..1) las abre y cierra.
function drawButterfly(ctx, x, y, s, angle, flap, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const open = 0.2 + 0.8 * Math.abs(flap);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side * open, 1);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.1);
    ctx.bezierCurveTo(s * 0.5, -s * 1.1, s * 1.35, -s * 0.8, s * 1.0, -s * 0.05);
    ctx.bezierCurveTo(s * 0.9, s * 0.25, s * 0.45, s * 0.15, 0, 0);
    ctx.moveTo(0, s * 0.05);
    ctx.bezierCurveTo(s * 0.75, s * 0.2, s * 0.8, s * 0.85, s * 0.3, s * 0.85);
    ctx.quadraticCurveTo(0, s * 0.6, 0, s * 0.05);
    ctx.fillStyle = rgbaOf(color, 0.18 * alpha);
    ctx.fill();
    ctx.strokeStyle = rgbaOf(color, 0.35 * alpha);
    ctx.lineWidth = s * 0.14;
    ctx.stroke();
    ctx.strokeStyle = rgbaOf([255, 255, 255], 0.8 * alpha);
    ctx.lineWidth = Math.max(0.6, s * 0.035);
    ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = rgbaOf([255, 255, 255], 0.9 * alpha);
  ctx.lineWidth = Math.max(0.8, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.3);
  ctx.lineTo(0, s * 0.45);
  ctx.moveTo(0, -s * 0.3);
  ctx.quadraticCurveTo(-s * 0.1, -s * 0.6, -s * 0.25, -s * 0.7);
  ctx.moveTo(0, -s * 0.3);
  ctx.quadraticCurveTo(s * 0.1, -s * 0.6, s * 0.25, -s * 0.7);
  ctx.stroke();
  ctx.restore();
}
