import { TAU, clamp, rand, easeOutCubic, makeStars, drawStars } from './util.js';

const POINTS = 26;

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);
  const cx = w / 2;
  const cy = h * 0.58;
  const k = S * 0.021;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#03060f');
  bg.addColorStop(0.6, '#0b1a3a');
  bg.addColorStop(1, '#22295e');

  const stars = makeStars(w, h, Math.round((w * h) / 4500));
  // Estrellas sobre la curva clásica del corazón
  const points = Array.from({ length: POINTS }, (_, i) => {
    const a = (i / POINTS) * TAU;
    return {
      x: cx + k * 16 * Math.sin(a) ** 3,
      y: cy - k * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)),
      phase: rand(0, TAU),
    };
  });

  let shooting = null;
  let nextShot = 4.5;

  return (t, dt) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    drawStars(ctx, stars, t);

    const glow = easeOutCubic(clamp((t - 3.8) / 1.5));
    if (glow > 0) {
      ctx.save();
      ctx.globalAlpha = glow * (0.16 + 0.06 * Math.sin(t * 2));
      ctx.fillStyle = '#ff8fab';
      ctx.beginPath();
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Líneas que unen las estrellas una por una
    const link = clamp((t - 1) / 2.6) * POINTS;
    const whole = Math.floor(link);
    ctx.strokeStyle = glow > 0 ? 'rgba(255, 214, 231, 0.75)' : 'rgba(180, 210, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < Math.min(whole, POINTS); i++) {
      const a = points[i];
      const b = points[(i + 1) % POINTS];
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    if (whole < POINTS) {
      const a = points[whole];
      const b = points[(whole + 1) % POINTS];
      const f = link - whole;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
    }
    ctx.stroke();

    for (let i = 0; i < POINTS; i++) {
      const on = clamp((t - 0.3 - i * 0.03) / 0.5);
      if (on <= 0) continue;
      const p = points[i];
      const r = (1.5 + 0.8 * Math.sin(t * 3 + p.phase)) * on;
      ctx.fillStyle = glow > 0 ? '#ffd6e7' : '#ffffff';
      ctx.globalAlpha = 0.22 * on;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 3.5, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = on;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Estrella fugaz de vez en cuando
    if (!shooting && t > nextShot) {
      shooting = { x: rand(w * 0.4, w * 1.1), y: rand(h * 0.02, h * 0.3), age: 0 };
      nextShot = t + rand(2.5, 4.5);
    }
    if (shooting) {
      shooting.age += dt;
      const q = shooting.age / 0.9;
      if (q >= 1) {
        shooting = null;
      } else {
        const len = S * 0.3;
        const x = shooting.x - q * S * 0.9;
        const y = shooting.y + q * S * 0.45;
        const trail = ctx.createLinearGradient(x, y, x + len, y - len * 0.5);
        trail.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        trail.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.globalAlpha = Math.sin(q * Math.PI);
        ctx.strokeStyle = trail;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y - len * 0.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  };
}
