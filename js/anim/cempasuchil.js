import { TAU, clamp, rand, easeOutBack, makeStars, drawStars } from './util.js';

const MARIGOLD = ['#e8590c', '#f76707', '#fd7e14', '#ffa94d'];

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);
  const archX = w / 2;
  const archY = h * 0.8;
  const rx = w * 0.4;
  const ry = h * 0.46;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0b0620');
  bg.addColorStop(0.6, '#2a0f3d');
  bg.addColorStop(1, '#4a1a3a');
  const warm = ctx.createRadialGradient(w / 2, h * 0.98, 0, w / 2, h * 0.98, S * 1.1);
  warm.addColorStop(0, 'rgba(255, 146, 43, 0.4)');
  warm.addColorStop(1, 'rgba(255, 146, 43, 0)');

  const stars = makeStars(w, h * 0.6, Math.round((w * h) / 7000));

  // Arco de flores: primero florecen las orillas y al final la de arriba
  const count = 13;
  const flowers = Array.from({ length: count }, (_, i) => {
    const a = Math.PI + (i / (count - 1)) * Math.PI;
    const fromEdge = 1 - Math.abs(i - (count - 1) / 2) / ((count - 1) / 2);
    return {
      x: archX + Math.cos(a) * rx,
      y: archY + Math.sin(a) * ry,
      r: S * rand(0.05, 0.065),
      rot: rand(0, TAU),
      delay: 0.3 + fromEdge * 1.4,
    };
  });
  const candles = [0.1, 0.28, 0.5, 0.72, 0.9].map((u, i) => ({
    x: w * u, height: S * (0.08 + (i % 2) * 0.05 + (i === 2 ? 0.06 : 0)), phase: rand(0, TAU),
  }));
  const petals = Array.from({ length: 45 }, () => ({
    x: rand(0, w), y: rand(-h, h), vy: rand(20, 50), vx: rand(-10, 10), rot: rand(0, TAU), spin: rand(-2, 2),
    size: rand(3, 6), color: MARIGOLD[Math.floor(rand(0, MARIGOLD.length))],
  }));
  const butterflies = [0, 1, 2].map((k) => ({
    phase: k * 2.1, speed: 0.35 + k * 0.08, size: S * (0.035 + k * 0.006), delay: 1.2 + k * 0.6,
  }));

  return (t, dt) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    drawStars(ctx, stars, t);
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = clamp(t / 1.2);
    ctx.strokeStyle = '#2f9e44';
    ctx.lineWidth = S * 0.018;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(archX, archY, rx, ry, 0, Math.PI, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (const f of flowers) {
      const bloom = easeOutBack(clamp((t - f.delay) / 0.6));
      if (bloom > 0.01) drawMarigold(ctx, f.x, f.y, f.r * bloom, f.rot + t * 0.1);
    }

    for (const c of candles) {
      const base = h * 0.97;
      const width = S * 0.05;
      const flicker = 1 + 0.12 * Math.sin(t * 15 + c.phase) + 0.08 * Math.sin(t * 27 + c.phase);
      const glow = ctx.createRadialGradient(c.x, base - c.height, 0, c.x, base - c.height, S * 0.16);
      glow.addColorStop(0, 'rgba(255, 190, 90, 0.45)');
      glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(c.x - S * 0.16, base - c.height - S * 0.16, S * 0.32, S * 0.32);
      ctx.fillStyle = '#f1e3c6';
      ctx.fillRect(c.x - width / 2, base - c.height, width, c.height);
      const tall = S * 0.045 * flicker;
      ctx.fillStyle = '#ffa94d';
      ctx.beginPath();
      ctx.moveTo(c.x, base - c.height - tall);
      ctx.quadraticCurveTo(c.x + width * 0.5, base - c.height - tall * 0.3, c.x, base - c.height);
      ctx.quadraticCurveTo(c.x - width * 0.5, base - c.height - tall * 0.3, c.x, base - c.height - tall);
      ctx.fill();
    }

    for (const p of petals) {
      p.y += p.vy * dt;
      p.x += (p.vx + Math.sin(t + p.rot) * 12) * dt;
      p.rot += p.spin * dt;
      if (p.y > h + 10) {
        p.y = -10;
        p.x = rand(0, w);
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    for (const b of butterflies) {
      const life = t - b.delay;
      if (life < 0) continue;
      const x = w * 0.5 + Math.sin(life * b.speed * 2 + b.phase) * w * 0.36;
      const y = h * 0.55 + Math.sin(life * b.speed * 3.1 + b.phase) * h * 0.16;
      ctx.globalAlpha = clamp(life / 0.6);
      drawMonarch(ctx, x, y, b.size, Math.sin(t * 14 + b.phase));
      ctx.globalAlpha = 1;
    }
  };
}

// Flor de cempasúchil: anillos de pétalos redondos, de afuera hacia adentro.
function drawMarigold(ctx, x, y, r, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const rings = [[14, 1, MARIGOLD[0]], [11, 0.74, MARIGOLD[1]], [8, 0.5, MARIGOLD[2]], [5, 0.28, MARIGOLD[3]]];
  for (const [petals, scale, color] of rings) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let k = 0; k < petals; k++) {
      const a = (k * TAU) / petals + scale * 3;
      const px = Math.cos(a) * r * scale * 0.72;
      const py = Math.sin(a) * r * scale * 0.72;
      ctx.moveTo(px + r * scale * 0.36, py);
      ctx.arc(px, py, r * scale * 0.36, 0, TAU);
    }
    ctx.fill();
  }
  ctx.fillStyle = '#ffd43b';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// Mariposa monarca; `flap` (-1..1) abre y cierra las alas.
function drawMonarch(ctx, x, y, s, flap) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.3);
  const open = 0.25 + 0.75 * Math.abs(flap);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side * open, 1);
    ctx.fillStyle = '#f76707';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = Math.max(1, s * 0.12);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.4, -s * 1.2, s * 1.4, -s * 0.9, s * 1.1, -s * 0.1);
    ctx.bezierCurveTo(s * 1.2, s * 0.4, s * 0.5, s * 0.3, 0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(s * 0.8, s * 0.2, s * 0.9, s * 0.9, s * 0.3, s * 0.9);
    ctx.quadraticCurveTo(0, s * 0.6, 0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = '#111111';
  ctx.fillRect(-s * 0.06, -s * 0.4, s * 0.12, s * 1.1);
  ctx.restore();
}
