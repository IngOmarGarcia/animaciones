import { TAU, clamp, rand, pick, easeOutBack, easeOutCubic } from './util.js';

const PARTY_COLORS = ['#ffd43b', '#ff6b9d', '#4dabf7', '#69db7c', '#b197fc', '#ff922b'];
const BURST = 2.6;

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);
  const cx = w / 2;
  const plateY = h * 0.86;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#140c2e');
  bg.addColorStop(1, '#3d1f5e');

  const bokeh = Array.from({ length: 14 }, () => ({
    x: rand(0, w), y: rand(0, h * 0.75), r: rand(S * 0.03, S * 0.09), color: pick(PARTY_COLORS), phase: rand(0, TAU),
  }));

  const tiers = [
    { width: S * 0.78, height: S * 0.2, body: '#f06595', top: '#f783ac', drip: '#fff0f6' },
    { width: S * 0.56, height: S * 0.17, body: '#fff0f6', top: '#ffffff', drip: '#f783ac' },
  ];
  const cakeTop = -tiers[0].height - tiers[1].height;
  const candles = [-2, -1, 0, 1, 2].map((i) => ({
    dx: i * S * 0.095,
    color: pick(['#74c0fc', '#ffd43b', '#b2f2bb', '#ffa8a8']),
    phase: rand(0, TAU),
    delay: 1 + (i + 2) * 0.12,
  }));
  const confetti = Array.from({ length: 110 }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, size: rand(4, 8), rot: rand(0, TAU), spin: rand(-8, 8), color: pick(PARTY_COLORS),
  }));
  let launched = false;

  return (t, dt) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    for (const b of bokeh) {
      ctx.globalAlpha = 0.1 + 0.06 * Math.sin(t * 1.5 + b.phase);
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pastel que aparece desde el plato
    const rise = easeOutBack(clamp(t / 0.9));
    ctx.save();
    ctx.translate(cx, plateY);
    ctx.scale(rise, rise);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, S * 0.03, S * 0.55, S * 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#dee2e6';
    ctx.beginPath();
    ctx.ellipse(0, 0, S * 0.5, S * 0.06, 0, 0, TAU);
    ctx.fill();

    let bottom = 0;
    for (const tier of tiers) {
      drawTier(ctx, bottom, tier);
      bottom -= tier.height;
    }

    for (const c of candles) {
      const grow = easeOutCubic(clamp((t - c.delay) / 0.4));
      if (grow <= 0) continue;
      const height = S * 0.11 * grow;
      const width = S * 0.028;
      const base = cakeTop + S * 0.01;
      ctx.fillStyle = c.color;
      ctx.fillRect(c.dx - width / 2, base - height, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      for (let s = 1; s < 4; s++) ctx.fillRect(c.dx - width / 2, base - (height * s) / 4, width, S * 0.006);
      const lit = clamp((t - c.delay - 0.6) / 0.3);
      if (lit > 0) drawCandleFlame(ctx, c.dx, base - height - S * 0.004, S * 0.05 * lit, t, c.phase);
    }
    ctx.restore();

    // Confeti que sale disparado del pastel y luego cae suave
    if (t >= BURST) {
      if (!launched) {
        launched = true;
        for (const c of confetti) {
          c.x = cx + rand(-S * 0.1, S * 0.1);
          c.y = plateY + cakeTop;
          c.vx = rand(-1, 1) * S * 1.3;
          c.vy = -rand(0.6, 1.8) * S;
        }
      }
      for (const c of confetti) {
        c.vy = Math.min(c.vy + S * 1.5 * dt, S * 0.35);
        c.vx *= 1 - Math.min(1, 1.5 * dt);
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += c.spin * dt;
        if (c.y > h + 20) {
          c.y = -20;
          c.x = rand(0, w);
          c.vy = rand(0.1, 0.3) * S;
          c.vx = rand(-0.1, 0.1) * S;
        }
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rot);
        ctx.scale(1, Math.cos(c.rot * 1.3));
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size * 0.3, c.size, c.size * 0.6);
        ctx.restore();
      }
    }
  };
}

// Piso del pastel con betún escurrido; `bottom` es la base del piso.
function drawTier(ctx, bottom, { width, height, body, top, drip }) {
  const rx = width / 2;
  const ry = height * 0.22;
  const topY = bottom - height;

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, bottom, rx, ry, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillRect(-rx, topY, width, height);

  ctx.fillStyle = drip;
  ctx.beginPath();
  ctx.ellipse(0, topY, rx, ry, 0, 0, TAU);
  ctx.fill();
  const drips = 9;
  const dw = (width / drips) * 0.6;
  for (let i = 0; i < drips; i++) {
    const x = -rx + ((i + 0.5) * width) / drips;
    const len = height * (0.2 + 0.15 * ((i * 7) % 3));
    const edgeY = topY + ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
    ctx.fillRect(x - dw / 2, edgeY - 2, dw, len);
    ctx.beginPath();
    ctx.arc(x, edgeY + len, dw / 2, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(0, topY, rx * 0.92, ry * 0.8, 0, 0, TAU);
  ctx.fill();
}

function drawCandleFlame(ctx, x, y, size, t, phase) {
  const flicker = 1 + 0.12 * Math.sin(t * 17 + phase) + 0.08 * Math.sin(t * 29 + phase * 2);
  const tall = size * flicker;
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#ffd43b';
  ctx.beginPath();
  ctx.arc(x, y - tall * 0.4, size * 1.2, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  for (const [width, height, color] of [[size * 0.45, tall, '#ff922b'], [size * 0.22, tall * 0.55, '#fff3bf']]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - height);
    ctx.quadraticCurveTo(x + width * 1.6, y - height * 0.25, x, y);
    ctx.quadraticCurveTo(x - width * 1.6, y - height * 0.25, x, y - height);
    ctx.fill();
  }
}
