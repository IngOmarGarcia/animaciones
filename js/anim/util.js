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

// Aclara (amount > 0) u oscurece (amount < 0) un color #rrggbb.
export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  const ch = (v) => Math.round(v + (target - v) * k);
  return `rgb(${ch((n >> 16) & 255)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`;
}

// Figura cerrada suave que pasa cerca de los puntos dados.
export function smoothClosed(ctx, pts) {
  const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const start = mid(pts[pts.length - 1], pts[0]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % pts.length]);
    ctx.quadraticCurveTo(p.x, p.y, m.x, m.y);
  });
  ctx.closePath();
}

// ---- Jugador de fútbol articulado ----
// Vista lateral mirando a la derecha. Ángulos en grados: 0 = hacia abajo, positivo = hacia adelante.
// `lean` inclina todo el cuerpo hacia adelante y `bend` dobla el pecho sobre la cadera.
export const toRad = (deg) => (deg * Math.PI) / 180;

export const limbEnd = (p, deg, len) => ({
  x: p.x + Math.sin(toRad(deg)) * len,
  y: p.y + Math.cos(toRad(deg)) * len,
});

export function mixPose(a, b, k) {
  const pose = {};
  for (const key of Object.keys(a)) pose[key] = a[key] + ((b[key] ?? a[key]) - a[key]) * k;
  return pose;
}

export function playerJoints(pose, H) {
  const hip = { x: pose.x, y: pose.y };
  const chest = pose.lean + pose.bend;
  const neck = limbEnd(hip, 180 - chest, H * 0.3);
  const shoulder = limbEnd(hip, 180 - chest, H * 0.265);
  const head = limbEnd(neck, 180 - chest - pose.head, H * 0.085);
  const leg = (hipDeg, kneeDeg, ankleDeg) => {
    const thigh = hipDeg - pose.lean;
    const knee = limbEnd(hip, thigh, H * 0.245);
    const shin = thigh + kneeDeg;
    const ankle = limbEnd(knee, shin, H * 0.235);
    const foot = shin + 90 + ankleDeg;
    return { knee, ankle, heel: limbEnd(ankle, foot, -H * 0.028), toe: limbEnd(ankle, foot, H * 0.1) };
  };
  const arm = (shoulderDeg, elbowDeg) => {
    const upper = shoulderDeg - chest;
    const elbow = limbEnd(shoulder, upper, H * 0.16);
    return { elbow, hand: limbEnd(elbow, upper + elbowDeg, H * 0.145) };
  };
  return {
    hip, neck, shoulder, head, chest,
    legN: leg(pose.hipN, pose.kneeN, pose.ankleN),
    legF: leg(pose.hipF, pose.kneeF, pose.ankleF),
    armN: arm(pose.shN, pose.elN),
    armF: arm(pose.shF, pose.elF),
  };
}

// Extremidad redondeada de `a` a `b` con sombreado cilíndrico (luz del lado izquierdo del trazo).
export function drawSegment(ctx, a, b, r1, r2, light, dark, bulge = 1) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const rm = ((r1 + r2) / 2) * bulge * 1.1;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  if (light === dark) {
    ctx.fillStyle = light;
  } else {
    const g = ctx.createLinearGradient(mx + nx * rm, my + ny * rm, mx - nx * rm, my - ny * rm);
    g.addColorStop(0, light);
    g.addColorStop(0.45, light);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
  }
  const start = Math.atan2(ny, nx);
  ctx.beginPath();
  ctx.moveTo(a.x + nx * r1, a.y + ny * r1);
  ctx.quadraticCurveTo(mx + nx * rm, my + ny * rm, b.x + nx * r2, b.y + ny * r2);
  ctx.arc(b.x, b.y, r2, start, start + Math.PI, true);
  ctx.quadraticCurveTo(mx - nx * rm, my - ny * rm, a.x - nx * r1, a.y - ny * r1);
  ctx.arc(a.x, a.y, r1, start + Math.PI, start, true);
  ctx.closePath();
  ctx.fill();
}

// kit: { shirt, shorts, socks, skin, hair, boots, accent, gloves? } en #rrggbb,
// o { flat: 'rgba(...)' } para dibujar la silueta de un solo color (luz de contorno, estelas).
export function drawPlayer(ctx, pose, H, kit) {
  const j = playerJoints(pose, H);
  const { flat } = kit;
  const tone = (hex, near) => flat || shade(hex, near ? 0 : -0.3);
  const seg = (a, b, r1, r2, hex, near, bulge) => drawSegment(
    ctx, a, b, r1 * H, r2 * H,
    flat || shade(hex, near ? 0.15 : -0.2),
    flat || shade(hex, near ? -0.4 : -0.6),
    bulge,
  );
  const along = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });

  const arm = (limb, near) => {
    seg(j.shoulder, limb.elbow, 0.03, 0.024, kit.skin, near, 1.15);
    seg(limb.elbow, limb.hand, 0.024, 0.017, kit.skin, near, 1.1);
    seg(j.shoulder, along(j.shoulder, limb.elbow, 0.5), 0.045, 0.036, kit.shirt, near, 1);
    ctx.fillStyle = tone(kit.gloves || kit.skin, near);
    ctx.beginPath();
    ctx.arc(limb.hand.x, limb.hand.y, H * (kit.gloves ? 0.03 : 0.02), 0, TAU);
    ctx.fill();
  };

  const leg = (limb, near) => {
    seg(j.hip, limb.knee, 0.052, 0.033, kit.skin, near, 1.2);
    seg(limb.knee, limb.ankle, 0.033, 0.019, kit.skin, near, 1.3);
    seg(along(limb.knee, limb.ankle, 0.25), limb.ankle, 0.037, 0.023, kit.socks, near, 1.2);
    seg(j.hip, along(j.hip, limb.knee, 0.55), 0.066, 0.056, kit.shorts, near, 1);
    ctx.strokeStyle = tone(kit.boots, near);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = H * 0.036;
    ctx.beginPath();
    ctx.moveTo(limb.ankle.x, limb.ankle.y);
    ctx.lineTo(limb.heel.x, limb.heel.y);
    ctx.lineTo(limb.toe.x, limb.toe.y);
    ctx.stroke();
  };

  const torso = () => {
    const c = toRad(j.chest);
    const up = { x: Math.sin(c), y: -Math.cos(c) };
    const fwd = { x: Math.cos(c), y: Math.sin(c) };
    const at = (s, side) => ({
      x: j.hip.x + up.x * s * H * 0.3 + fwd.x * side * H,
      y: j.hip.y + up.y * s * H * 0.3 + fwd.y * side * H,
    });
    const profile = [[-0.05, 0.058, 0.052], [0.35, 0.05, 0.046], [0.7, 0.06, 0.07], [0.93, 0.055, 0.05], [1.02, 0.03, 0.028]];
    const pts = [
      ...profile.map(([s, , front]) => at(s, front)),
      ...profile.map(([s, back]) => at(s, -back)).reverse(),
    ];
    if (flat) {
      ctx.fillStyle = flat;
    } else {
      const from = at(0.5, -0.07);
      const to = at(0.5, 0.07);
      const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      g.addColorStop(0, shade(kit.shirt, 0.2));
      g.addColorStop(0.5, kit.shirt);
      g.addColorStop(1, shade(kit.shirt, -0.45));
      ctx.fillStyle = g;
    }
    smoothClosed(ctx, pts);
    ctx.fill();
    if (!flat) {
      const s1 = at(0.08, 0);
      const s2 = at(0.9, 0);
      ctx.strokeStyle = kit.accent;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = H * 0.01;
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = tone(kit.shorts, true);
    ctx.beginPath();
    ctx.arc(j.hip.x, j.hip.y, H * 0.062, 0, TAU);
    ctx.fill();
  };

  const head = () => {
    seg(j.shoulder, j.neck, 0.027, 0.024, kit.skin, true, 1);
    const r = H * 0.062;
    ctx.save();
    ctx.translate(j.head.x, j.head.y);
    ctx.rotate(toRad(j.chest + pose.head));
    if (flat) {
      ctx.fillStyle = flat;
    } else {
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r * 1.3);
      g.addColorStop(0, shade(kit.skin, 0.2));
      g.addColorStop(1, shade(kit.skin, -0.45));
      ctx.fillStyle = g;
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.6, -r * 0.15);
    ctx.lineTo(r * 1.08, r * 0.15);
    ctx.lineTo(r * 0.8, r * 0.32);
    ctx.quadraticCurveTo(r * 0.75, r * 0.95, r * 0.1, r * 1.0);
    ctx.lineTo(-r * 0.1, r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = flat || kit.hair;
    ctx.beginPath();
    ctx.arc(0, -r * 0.05, r * 1.03, toRad(150), toRad(335));
    ctx.quadraticCurveTo(0, -r * 0.45, -r * 0.9, r * 0.45);
    ctx.closePath();
    ctx.fill();
    if (!flat) {
      ctx.fillStyle = shade(kit.skin, -0.3);
      ctx.beginPath();
      ctx.ellipse(-r * 0.15, r * 0.1, r * 0.14, r * 0.2, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  arm(j.armF, false);
  leg(j.legF, false);
  torso();
  leg(j.legN, true);
  head();
  arm(j.armN, true);
}

// Balón pre-renderizado: parches (giran) y sombreado esférico (fijo).
export function makeSoccerBall(radius, scale = 1) {
  const css = radius * 2 + 2;
  const make = () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(css * scale);
    canvas.height = Math.ceil(css * scale);
    const g = canvas.getContext('2d');
    g.scale(scale, scale);
    g.translate(css / 2, css / 2);
    return [canvas, g];
  };
  const [patches, p] = make();
  p.beginPath();
  p.arc(0, 0, radius, 0, TAU);
  p.fillStyle = '#f1f3f5';
  p.fill();
  p.clip();
  p.fillStyle = '#1f2328';
  const pentagon = (x, y, s, rotation, squash) => {
    p.save();
    p.translate(x, y);
    p.rotate(rotation);
    p.scale(1, squash);
    p.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * TAU) / 5 - Math.PI / 2;
      p.lineTo(Math.cos(a) * s, Math.sin(a) * s);
    }
    p.closePath();
    p.fill();
    p.restore();
  };
  pentagon(0, 0, radius * 0.32, 0, 1);
  for (let k = 0; k < 5; k++) {
    const a = (k * TAU) / 5 - Math.PI / 2;
    pentagon(Math.cos(a) * radius * 0.88, Math.sin(a) * radius * 0.88, radius * 0.28, a + Math.PI / 2, 0.5);
  }
  p.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  p.lineWidth = radius * 0.035;
  p.beginPath();
  for (let k = 0; k < 5; k++) {
    const a = (k * TAU) / 5 - Math.PI / 2;
    p.moveTo(Math.cos(a) * radius * 0.32, Math.sin(a) * radius * 0.32);
    p.lineTo(Math.cos(a) * radius * 0.7, Math.sin(a) * radius * 0.7);
  }
  p.stroke();

  const [light, l] = make();
  const g = l.createRadialGradient(-radius * 0.35, -radius * 0.4, radius * 0.05, 0, 0, radius);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  g.addColorStop(0.35, 'rgba(255, 255, 255, 0)');
  g.addColorStop(0.75, 'rgba(0, 0, 0, 0.2)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  l.fillStyle = g;
  l.beginPath();
  l.arc(0, 0, radius, 0, TAU);
  l.fill();
  return { patches, light, css, radius };
}

export function drawSoccerBall(ctx, ball, x, y, spin, r = ball.radius) {
  const size = ball.css * (r / ball.radius);
  ctx.save();
  ctx.translate(x, y);
  ctx.save();
  ctx.rotate(spin);
  ctx.drawImage(ball.patches, -size / 2, -size / 2, size, size);
  ctx.restore();
  ctx.drawImage(ball.light, -size / 2, -size / 2, size, size);
  ctx.restore();
}
