export const TAU = Math.PI * 2;

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (min, max) => min + Math.random() * (max - min);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// Punto y derivada de una curva cuadrática de Bézier.
export function qpoint(p0, p1, p2, s) {
  const u = 1 - s;
  return {
    x: u * u * p0.x + 2 * u * s * p1.x + s * s * p2.x,
    y: u * u * p0.y + 2 * u * s * p1.y + s * s * p2.y,
  };
}

export function qderiv(p0, p1, p2, s) {
  return {
    x: 2 * (1 - s) * (p1.x - p0.x) + 2 * s * (p2.x - p1.x),
    y: 2 * (1 - s) * (p1.y - p0.y) + 2 * s * (p2.y - p1.y),
  };
}

// Dibuja una curva cuadrática solo hasta la fracción `amount` (0..1).
export function strokePartialCurve(ctx, p0, p1, p2, amount, steps = 24) {
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  for (let k = 1; k <= steps; k++) {
    const p = qpoint(p0, p1, p2, (amount * k) / steps);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
}

export function makeStars(w, h, count) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: rand(0.3, 1.3),
    speed: rand(0.8, 2.5),
    phase: rand(0, TAU),
  }));
}

export function drawStars(ctx, stars, t) {
  ctx.fillStyle = '#ffffff';
  for (const s of stars) {
    ctx.globalAlpha = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawLeaf(ctx, x, y, length, angle, color = '#37b24d') {
  if (length <= 0.5) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length * 0.5, -length * 0.34, length, 0);
  ctx.quadraticCurveTo(length * 0.5, length * 0.34, 0, 0);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(15, 70, 25, 0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length * 0.85, 0);
  ctx.stroke();
  ctx.restore();
}

// Florecita de 5 pétalos.
export function drawMiniFlower(ctx, x, y, r, rotation, petalColor, centerColor) {
  if (r <= 0.3) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = petalColor;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    const px = Math.cos(a) * r * 0.52;
    const py = Math.sin(a) * r * 0.52;
    ctx.moveTo(px + r * 0.48, py);
    ctx.arc(px, py, r * 0.48, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = centerColor;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}
