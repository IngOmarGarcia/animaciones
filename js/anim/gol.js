import { TAU, clamp, rand, pick, lerp, easeOutCubic, qpoint } from './util.js';

const KICK = 0.5;
const GOAL = 1.5;
const CROWD_COLORS = ['#ffffff', '#ffd43b', '#74c0fc', '#ff8787', '#b2f2bb'];

export default function create(ctx, w, h) {
  const S = Math.min(w, h * 0.62);
  const standsTop = h * 0.2;
  const horizon = h * 0.44;
  const goal = { x: w / 2, bottom: h * 0.56, width: S * 0.62, height: S * 0.24 };
  const start = { x: w * 0.24, y: h * 0.95 };
  const ctrl = { x: w * 0.02, y: h * 0.4 };
  const end = { x: goal.x + goal.width * 0.3, y: goal.bottom - goal.height * 0.65 };

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#02050f');
  sky.addColorStop(1, '#0d2244');

  const crowd = Array.from({ length: Math.round(Math.min(500, (w * (horizon - standsTop)) / 90)) }, () => ({
    x: rand(0, w), y: rand(standsTop + 4, horizon - 4), color: pick(CROWD_COLORS), phase: rand(0, TAU),
  }));
  const confetti = Array.from({ length: 120 }, () => ({
    x: rand(0, w), y: rand(-h * 0.8, -10), vy: rand(90, 200), sway: rand(10, 30),
    rot: rand(0, TAU), spin: rand(-6, 6), size: rand(4, 8), color: pick(CROWD_COLORS),
  }));

  return (t, dt) => {
    const scored = t >= GOAL;

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon);

    // Gradas con público y flashes de cámaras
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, standsTop, w, horizon - standsTop);
    for (const f of crowd) {
      const wave = Math.sin(t * (scored ? 10 : 2.5) + f.phase);
      ctx.globalAlpha = scored ? 0.45 + 0.45 * wave : 0.25 + 0.15 * wave;
      ctx.fillStyle = f.color;
      ctx.fillRect(f.x, f.y - (scored ? Math.abs(wave) * 3 : 0), 2, 2);
    }
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < (scored ? 4 : 1); i++) {
      if (Math.random() > 0.5) continue;
      ctx.globalAlpha = rand(0.5, 1);
      ctx.beginPath();
      ctx.arc(rand(0, w), rand(standsTop, horizon), rand(1.5, 3.5), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Cancha con franjas en perspectiva
    const bands = 10;
    for (let i = 0; i < bands; i++) {
      const y0 = horizon + (h - horizon) * (i / bands) ** 1.7;
      const y1 = horizon + (h - horizon) * ((i + 1) / bands) ** 1.7;
      ctx.fillStyle = i % 2 ? '#2b8a3e' : '#37a24b';
      ctx.fillRect(0, y0, w, y1 - y0 + 1);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(goal.x - goal.width * 0.95, goal.bottom);
    ctx.lineTo(goal.x - goal.width * 1.35, h * 0.72);
    ctx.lineTo(goal.x + goal.width * 1.35, h * 0.72);
    ctx.lineTo(goal.x + goal.width * 0.95, goal.bottom);
    ctx.closePath();
    ctx.stroke();

    // Reflectores
    for (const side of [-1, 1]) {
      const lx = w / 2 + side * w * 0.46;
      ctx.fillStyle = 'rgba(255, 255, 225, 0.05)';
      ctx.beginPath();
      ctx.moveTo(lx, standsTop - h * 0.04);
      ctx.lineTo(w / 2 - side * w * 0.1, h);
      ctx.lineTo(w / 2 + side * w * 0.35, h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fffbe6';
      ctx.fillRect(lx - S * 0.05, standsTop - h * 0.05, S * 0.1, S * 0.03);
    }

    const bulge = scored ? Math.exp(-(t - GOAL) * 2.2) : 0;
    const p = clamp((t - KICK) / (GOAL - KICK));
    let ball;
    if (scored) {
      const drop = easeOutCubic(clamp((t - GOAL) / 0.5));
      ball = { x: end.x, y: lerp(end.y, goal.bottom - S * 0.03, drop), r: S * 0.03, spin: GOAL * 14 + (t - GOAL) * 3 };
    } else {
      const q = qpoint(start, ctrl, end, p);
      ball = { x: q.x, y: q.y, r: lerp(S * 0.08, S * 0.03, p), spin: p * 14 };
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(ball.x, scored ? goal.bottom : lerp(start.y + S * 0.06, goal.bottom, p), ball.r, ball.r * 0.3, 0, 0, TAU);
    ctx.fill();

    // Dentro de la portería el balón queda detrás de la red
    if (scored) drawBall(ctx, ball);
    drawGoal(ctx, goal, end, bulge, S);
    if (!scored) drawBall(ctx, ball);

    if (scored) {
      for (const c of confetti) {
        c.y += c.vy * dt;
        c.rot += c.spin * dt;
        if (c.y > h + 10) {
          c.y = -10;
          c.x = rand(0, w);
        }
        ctx.save();
        ctx.translate(c.x + Math.sin(t * 2 + c.rot) * c.sway, c.y);
        ctx.rotate(c.rot);
        ctx.scale(1, Math.cos(t * 5 + c.spin));
        ctx.fillStyle = c.color;
        ctx.fillRect(-c.size / 2, -c.size * 0.3, c.size, c.size * 0.6);
        ctx.restore();
      }
      const flash = 1 - (t - GOAL) / 0.45;
      if (flash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * flash})`;
        ctx.fillRect(0, 0, w, h);
      }
    }
  };
}

// Portería con red que se deforma hacia el punto de impacto.
function drawGoal(ctx, goal, hit, bulge, S) {
  const left = goal.x - goal.width / 2;
  const top = goal.bottom - goal.height;
  const spread = 2 * (S * 0.1) ** 2;
  const pull = (px, py) => {
    const near = Math.exp(-((px - hit.x) ** 2 + (py - hit.y) ** 2) / spread) * bulge;
    return [px + (hit.x - px) * near * 0.35, py + (hit.y - py) * near * 0.35 - near * S * 0.02];
  };

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const cols = 14;
  const rows = 6;
  const steps = 12;
  for (let c = 0; c <= cols; c++) {
    const x = left + (goal.width * c) / cols;
    for (let s = 0; s <= steps; s++) {
      const [px, py] = pull(x, top + (goal.height * s) / steps);
      if (s) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
  }
  for (let r = 0; r <= rows; r++) {
    const y = top + (goal.height * r) / rows;
    for (let s = 0; s <= steps * 2; s++) {
      const [px, py] = pull(left + (goal.width * s) / (steps * 2), y);
      if (s) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
  }
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, S * 0.016);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(left, goal.bottom);
  ctx.lineTo(left, top);
  ctx.lineTo(left + goal.width, top);
  ctx.lineTo(left + goal.width, goal.bottom);
  ctx.stroke();
}

function drawBall(ctx, { x, y, r, spin }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#212529';
  drawPolygon(ctx, 0, 0, r * 0.34, 0);
  for (let k = 0; k < 5; k++) {
    const a = (k * TAU) / 5 - Math.PI / 2;
    drawPolygon(ctx, Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.3, a);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawPolygon(ctx, x, y, r, rotation) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = rotation + (i * TAU) / 5 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}
