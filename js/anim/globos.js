import { TAU, rand, pick } from './util.js';

const BALLOON_COLORS = ['#ff6b6b', '#ffd43b', '#4dabf7', '#69db7c', '#f783ac', '#b197fc', '#ff922b'];

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#1c2a6b');
  bg.addColorStop(0.6, '#6741d9');
  bg.addColorStop(1, '#f783ac');

  const spawn = (first) => {
    const r = S * rand(0.06, 0.11);
    return {
      x: rand(r, w - r),
      y: first ? h * rand(0.3, 1.9) : h + r * 2 + rand(0, h * 0.3),
      r,
      speed: rand(0.14, 0.24) * h,
      wobble: rand(0.8, 1.6),
      phase: rand(0, TAU),
      color: pick(BALLOON_COLORS),
    };
  };
  const balloons = Array.from({ length: Math.round(14 + w / 60) }, () => spawn(true)).sort((a, b) => a.r - b.r);
  const sparkles = Array.from({ length: 50 }, () => ({
    x: rand(0, w), y: rand(0, h), r: rand(0.6, 1.8), phase: rand(0, TAU), speed: rand(1, 3),
  }));

  return (t, dt) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#ffffff';
    for (const s of sparkles) {
      ctx.globalAlpha = 0.15 + 0.6 * Math.max(0, Math.sin(t * s.speed + s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const b of balloons) {
      b.y -= b.speed * dt;
      if (b.y < -b.r * 5) Object.assign(b, spawn(false));
      const sway = Math.sin(t * b.wobble + b.phase);
      drawBalloon(ctx, b.x + sway * b.r * 0.4, b.y, b.r, b.color, sway * 0.12, t, b.phase);
    }
  };
}

function drawBalloon(ctx, x, y, r, color, tilt, t, phase) {
  // Hilo ondulado
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 1.25);
  for (let k = 1; k <= 8; k++) {
    const s = k / 8;
    ctx.lineTo(x + Math.sin(t * 3 + phase + s * 5) * r * 0.15 * s, y + r * 1.25 + s * r * 3);
  }
  ctx.stroke();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 1.18, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, r * 1.12);
  ctx.lineTo(r * 0.14, r * 1.3);
  ctx.lineTo(-r * 0.14, r * 1.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.38, -r * 0.45, r * 0.2, r * 0.34, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}
