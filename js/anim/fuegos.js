import { TAU, rand, pick, makeStars, drawStars } from './util.js';

const GREEN = '#22c55e';
const WHITE = '#ffffff';
const RED = '#ef4444';
const GOLD = '#ffd166';
const TYPES = ['tricolor', 'tricolor', 'ring', 'peony', 'gold'];
const MAX_PARTICLES = 1400;

export default function create(ctx, w, h) {
  const gravity = h * 1.2;
  const groundY = h * 0.84;
  const minSide = Math.min(w, h);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#050816');
  bg.addColorStop(0.6, '#101a3a');
  bg.addColorStop(1, '#1b1040');

  const stars = makeStars(w, h * 0.7, Math.round((w * h) / 6000));

  // Siluetas de edificios con ventanas encendidas
  const buildings = [];
  const windows = [];
  for (let x = 0; x < w;) {
    const bw = rand(w * 0.03, w * 0.08);
    const bh = rand(h * 0.04, h * 0.13);
    buildings.push({ x, w: bw, h: bh });
    const cols = Math.max(1, Math.floor(bw / 9));
    const rows = Math.max(1, Math.floor(bh / 12));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (Math.random() < 0.3) windows.push({ x: x + 4 + c * 9, y: groundY - bh + 6 + r * 12 });
      }
    }
    x += bw;
  }

  const rockets = [];
  const particles = [];
  const flashes = [];
  let nextLaunch = 0.2;

  function launch() {
    const y0 = groundY;
    const targetY = rand(h * 0.1, h * 0.42);
    rockets.push({ x: rand(w * 0.15, w * 0.85), y: y0, vx: rand(-20, 20), vy: -Math.sqrt(2 * gravity * (y0 - targetY)) });
  }

  function explode(x, y) {
    const type = pick(TYPES);
    const count = particles.length > MAX_PARTICLES ? 50 : Math.round(rand(80, 120));
    const maxSpeed = minSide * rand(0.65, 0.95);
    const ringColor = pick([GREEN, WHITE, RED]);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + rand(-0.05, 0.05);
      const speed = type === 'ring' ? maxSpeed * rand(0.92, 1) : maxSpeed * Math.sqrt(Math.random());
      let color;
      if (type === 'tricolor') color = a < TAU / 3 ? GREEN : a < (2 * TAU) / 3 ? WHITE : RED;
      else if (type === 'gold') color = GOLD;
      else if (type === 'ring') color = ringColor;
      else color = pick([GREEN, WHITE, RED]);
      particles.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        age: 0, life: rand(1.1, 1.9), color, twinkle: type === 'gold',
      });
    }
    flashes.push({ x, y, age: 0 });
  }

  return (t, dt) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    drawStars(ctx, stars, t);

    if (t >= nextLaunch) {
      launch();
      if (t < 0.5) {
        launch();
        launch();
      }
      nextLaunch = t + rand(0.3, 0.75);
    }

    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.age += dt;
      if (f.age > 0.35) {
        flashes.splice(i, 1);
        continue;
      }
      const radius = minSide * 0.25;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
      g.addColorStop(0, `rgba(255, 240, 200, ${0.35 * (1 - f.age / 0.35)})`);
      g.addColorStop(1, 'rgba(255, 240, 200, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(f.x - radius, f.y - radius, radius * 2, radius * 2);
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.9)';
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.vy += gravity * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      ctx.beginPath();
      ctx.moveTo(r.x - r.vx * 0.06, r.y - r.vy * 0.06);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
      if (r.vy >= -gravity * 0.05) {
        explode(r.x, r.y);
        rockets.splice(i, 1);
      }
    }

    const drag = Math.exp(-1.8 * dt);
    ctx.lineWidth = Math.max(1.6, minSide * 0.005);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        particles[i] = particles[particles.length - 1];
        particles.pop();
        continue;
      }
      p.vx *= drag;
      p.vy = p.vy * drag + gravity * 0.12 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const life = 1 - p.age / p.life;
      ctx.globalAlpha = life * life * (p.twinkle ? 0.5 + 0.5 * Math.random() : 1);
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
      ctx.lineTo(p.x + 0.01, p.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    drawSkyline(ctx, w, h, groundY, buildings, windows);
  };
}

function drawSkyline(ctx, w, h, groundY, buildings, windows) {
  ctx.fillStyle = '#05040d';
  for (const b of buildings) ctx.fillRect(b.x, groundY - b.h, b.w + 1, h - groundY + b.h);
  ctx.fillRect(0, groundY, w, h - groundY);

  ctx.fillStyle = 'rgba(255, 214, 120, 0.55)';
  for (const win of windows) ctx.fillRect(win.x, win.y, 3, 4);

  // Columna con figura dorada al centro, al estilo de un monumento a la Independencia
  const mx = w / 2;
  const columnW = Math.max(4, w * 0.01);
  const columnH = h * 0.24;
  ctx.fillStyle = '#05040d';
  ctx.fillRect(mx - w * 0.04, groundY - h * 0.03, w * 0.08, h * 0.03);
  ctx.fillRect(mx - columnW / 2, groundY - columnH, columnW, columnH);
  const topY = groundY - columnH;
  const s = Math.max(5, columnW * 1.4);
  ctx.fillStyle = '#e0b050';
  ctx.beginPath();
  ctx.arc(mx, topY - s * 0.9, s * 0.35, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(mx, topY - s * 0.5);
  ctx.lineTo(mx - s * 1.2, topY - s * 1.3);
  ctx.lineTo(mx - s * 0.3, topY);
  ctx.lineTo(mx + s * 0.3, topY);
  ctx.lineTo(mx + s * 1.2, topY - s * 1.3);
  ctx.closePath();
  ctx.fill();
}
