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

// ---- Utilidades de escena ----
export const easeInOut = (x) => x * x * (3 - 2 * x);

export const rgbaOf = ([r, g, b], a) => `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;

// Número pseudoaleatorio estable (0..1) para el mismo `n`.
export const hash01 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Fondo pintado a baja resolución y ampliado: queda desenfocado como bokeh de cámara.
export function softBackdrop(w, h, dpr, paint, blur = 6) {
  const scale = Math.min(2, Math.max(1, dpr));
  const pad = 2; // margen con los bordes repetidos para que al ampliar no se mezclen con transparente
  const cw = Math.max(2, Math.ceil((w * scale) / blur));
  const ch = Math.max(2, Math.ceil((h * scale) / blur));
  const small = document.createElement('canvas');
  small.width = cw + pad * 2;
  small.height = ch + pad * 2;
  const s = small.getContext('2d');
  s.save();
  s.translate(pad, pad);
  // Escala exacta para que la pintura cubra todo el canvas chico (sin columna transparente al borde)
  s.scale(cw / w, ch / h);
  paint(s);
  s.restore();
  s.drawImage(small, pad, 0, 1, small.height, 0, 0, pad, small.height);
  s.drawImage(small, pad + cw - 1, 0, 1, small.height, pad + cw, 0, pad, small.height);
  s.drawImage(small, 0, pad, small.width, 1, 0, 0, small.width, pad);
  s.drawImage(small, 0, pad + ch - 1, small.width, 1, 0, pad + ch, small.width, pad);
  const out = document.createElement('canvas');
  out.width = Math.ceil(w * scale);
  out.height = Math.ceil(h * scale);
  const o = out.getContext('2d');
  o.imageSmoothingQuality = 'high';
  o.drawImage(small, pad, pad, cw, ch, 0, 0, out.width, out.height);
  return out;
}

// Capa nítida pre-renderizada; `paint` dibuja en píxeles CSS.
export function makeLayer(w, h, dpr, paint) {
  const scale = Math.min(2, Math.max(1, dpr));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * scale);
  canvas.height = Math.ceil(h * scale);
  const g = canvas.getContext('2d');
  g.scale(scale, scale);
  paint(g);
  return canvas;
}

export function makeVignette(ctx, w, h, strength = 0.65, cx = w / 2, cy = h / 2) {
  const g = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.25, cx, cy, Math.max(w, h) * 0.8);
  g.addColorStop(0, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
  return g;
}

// Resplandor radial (se ve mejor con globalCompositeOperation = 'lighter').
export function glow(ctx, x, y, r, rgb, a) {
  if (r <= 0 || a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgbaOf(rgb, a));
  g.addColorStop(1, rgbaOf(rgb, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Traza (sin rellenar) un corazón centrado en (x, y) de ancho `size`.
export function heartPath(ctx, x, y, size, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(0, -0.22);
  ctx.bezierCurveTo(0, -0.52, -0.5, -0.52, -0.5, -0.17);
  ctx.bezierCurveTo(-0.5, 0.13, 0, 0.38, 0, 0.6);
  ctx.bezierCurveTo(0, 0.38, 0.5, 0.13, 0.5, -0.17);
  ctx.bezierCurveTo(0.5, -0.52, 0, -0.52, 0, -0.22);
  ctx.closePath();
  ctx.restore();
}

// Punto del contorno de un corazón para u en 0..1 (alto aproximado = size).
export function heartPoint(u, size) {
  const a = u * TAU;
  return {
    x: (size * 16 * Math.sin(a) ** 3) / 32,
    y: (-size * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))) / 32,
  };
}

// Destello en cruz con halo.
export function sparkle(ctx, x, y, size, rgb, a) {
  if (size <= 0 || a <= 0) return;
  glow(ctx, x, y, size * 1.6, rgb, a * 0.5);
  ctx.strokeStyle = rgbaOf([255, 255, 255], a);
  ctx.lineWidth = Math.max(0.8, size * 0.12);
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
}

// Cámara 3D: y hacia arriba, mira hacia +z. cam = { cx, cy, U, D, yaw, pitch }.
export function project3D(cam, x, y, z) {
  const x1 = x * Math.cos(cam.yaw) + z * Math.sin(cam.yaw);
  const z1 = -x * Math.sin(cam.yaw) + z * Math.cos(cam.yaw);
  const y2 = y * Math.cos(cam.pitch) - z1 * Math.sin(cam.pitch);
  const z2 = y * Math.sin(cam.pitch) + z1 * Math.cos(cam.pitch);
  const f = cam.D / (cam.D + z2 * cam.U);
  return { x: cam.cx + x1 * cam.U * f, y: cam.cy - y2 * cam.U * f, z: z2, f };
}

// Puntos dentro de un texto, centrados en (0, 0), para formarlo con partículas.
// `weight` ligero (ej. 200) deja trazos de un solo punto de ancho, útil para constelaciones.
export function textPoints(text, width, height, gap, weight = 900) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const family = weight >= 700 ? '"Arial Black", system-ui, sans-serif' : 'system-ui, "Segoe UI", sans-serif';
  let size = height * 0.8;
  g.font = `${weight} ${size}px ${family}`;
  const measured = g.measureText(text).width;
  if (measured > width * 0.92) size *= (width * 0.92) / measured;
  g.font = `${weight} ${size}px ${family}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.fillText(text, canvas.width / 2, canvas.height / 2);
  const data = g.getImageData(0, 0, canvas.width, canvas.height).data;
  const pts = [];
  for (let y = 0; y < canvas.height; y += gap) {
    for (let x = 0; x < canvas.width; x += gap) {
      if (data[(y * canvas.width + x) * 4 + 3] > 128) pts.push({ x: x - canvas.width / 2, y: y - canvas.height / 2 });
    }
  }
  return pts;
}

// Nombre para escenas que lo dibujan (el reproductor lo pasa en stage.card).
export function cardName(stage, fallback) {
  const name = stage && stage.card && stage.card.p;
  return (name || fallback).toUpperCase().slice(0, 12);
}

// ---- Partículas WebGL (corazon-energia y escenas de fútbol) ----
// Tangente de medio campo de visión vertical (38°) de la cámara de estas escenas.
export const PARTICLE_TAN = Math.tan((19 * Math.PI) / 180);

// Cantidad de partículas según el dispositivo y el área del canvas; `scale` es la resolución interna.
export function particleQuality(w, h, amount = 1) {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  let count;
  if (coarse) count = cores >= 8 && memory >= 4 ? 16000 : cores >= 6 ? 11000 : 7000;
  else count = cores >= 8 ? 28000 : 18000;
  const area = (w * h) / (390 * 844);
  count = Math.round(count * amount * clamp(Math.sqrt(area), 0.35, 1));
  return { count: Math.max(Math.round(2500 * amount), count), scale: coarse ? 0.8 : 1 };
}

// Matriz vista·proyección (column-major, como WebGL). `up` permite tomas cenitales.
// `near`/`far` solo hacen falta en escenas con mundos grandes (una luna a 1000 unidades se
// recortaría con el plano lejano por defecto); el resto de animaciones no cambia.
export function viewProjection(out, eye, target, aspect, up = [0, 1, 0], tanHalf = PARTICLE_TAN, near = 0.05, far = 200) {
  let fx = eye[0] - target[0];
  let fy = eye[1] - target[1];
  let fz = eye[2] - target[2];
  let len = Math.hypot(fx, fy, fz) || 1;
  fx /= len; fy /= len; fz /= len;
  let sx = up[1] * fz - up[2] * fy;
  let sy = up[2] * fx - up[0] * fz;
  let sz = up[0] * fy - up[1] * fx;
  len = Math.hypot(sx, sy, sz) || 1;
  sx /= len; sy /= len; sz /= len;
  const ux = fy * sz - fz * sy;
  const uy = fz * sx - fx * sz;
  const uz = fx * sy - fy * sx;
  const tx = -(sx * eye[0] + sy * eye[1] + sz * eye[2]);
  const ty = -(ux * eye[0] + uy * eye[1] + uz * eye[2]);
  const tz = -(fx * eye[0] + fy * eye[1] + fz * eye[2]);
  const f = 1 / tanHalf;
  const nf = 1 / (near - far);
  const a = f / aspect;
  const c = (far + near) * nf;
  const d = 2 * far * near * nf;
  out[0] = a * sx; out[1] = f * ux; out[2] = c * fx; out[3] = -fx;
  out[4] = a * sy; out[5] = f * uy; out[6] = c * fy; out[7] = -fy;
  out[8] = a * sz; out[9] = f * uz; out[10] = c * fz; out[11] = -fz;
  out[12] = a * tx; out[13] = f * ty; out[14] = c * tz + d; out[15] = -tz;
  return out;
}

// Vigila el tiempo real entre cuadros: devuelve true cuando conviene bajar la calidad (máx. 3 veces).
export function qualityGovernor() {
  let ema = 16;
  let slow = 0;
  let last = 0;
  let downgrades = 0;
  return (t) => {
    const now = performance.now();
    let drop = false;
    if (last) {
      const real = now - last;
      if (real < 250) ema += (real - ema) * 0.05;
      if (t > 1.5 && ema > 24 && downgrades < 3) {
        slow += real / 1000;
        if (slow > 1.5) {
          downgrades++;
          slow = 0;
          ema = 16;
          drop = true;
        }
      } else {
        slow = 0;
      }
    }
    last = now;
    return drop;
  };
}

// Punto del mundo → [u, v, distancia] con u y v de 0 a 1 (v hacia arriba).
export function projectVP(vp, x, y, z) {
  const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
  return [
    ((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw) * 0.5 + 0.5,
    ((vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw) * 0.5 + 0.5,
    cw,
  ];
}

// Renderizador compartido: puntos aditivos + estelas + bloom en dos niveles + composición.
// Un solo contexto WebGL para todas las escenas (el reproductor recrea la escena al cambiar de tamaño).
// Devuelve null si no hay WebGL: usa drawParticles2D.
export function getParticleRenderer() {
  const self = getParticleRenderer;
  if (self.cache === undefined) {
    try {
      self.cache = createParticleRenderer();
    } catch (err) {
      console.warn('Partículas: WebGL no disponible', err);
      self.cache = null;
    }
  }
  return self.cache && !self.cache.gl.isContextLost() ? self.cache : null;
}

// Opciones de render(o): width, height, vp, pos (x, y, z, intensidad), col (r, g, b, tamaño en unidades),
// count, px (píxeles por unidad a distancia 1), focus, aperture, maxSize, trail (0..1), flash,
// glow [u, v, fuerza], beam [u, v, fuerza], bg/glowColor/beamColor/flashColor [r, g, b], exposure, time, reset, owner.
export function createParticleRenderer() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance',
  });
  if (!gl) return null;
  const POINT_VS = `
attribute vec4 aPos;
attribute vec4 aCol;
uniform mat4 uVP;
uniform float uPx;
uniform float uFocus;
uniform float uAperture;
uniform float uMaxSize;
varying vec3 vCol;
varying float vSharp;
void main() {
  vec4 clip = uVP * vec4(aPos.xyz, 1.0);
  if (clip.w < 0.15 || aPos.w <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
  gl_Position = clip;
  float size = aCol.w * uPx / clip.w;
  float coc = uAperture * uPx * abs(clip.w - uFocus) / (clip.w * uFocus);
  float total = clamp(sqrt(size * size + coc * coc), 2.0, uMaxSize);
  vSharp = clamp(size / total, 0.0, 1.0);
  float energy = min(1.0, (size * size) / (total * total) * mix(3.5, 1.0, vSharp));
  vCol = aCol.rgb * aPos.w * energy;
  gl_PointSize = total;
}`;
  const POINT_FS = `
precision mediump float;
varying vec3 vCol;
varying float vSharp;
void main() {
  vec2 d = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(d, d);
  if (r2 > 1.0) discard;
  float sharp = exp(-r2 * 10.0) + 0.16 * exp(-r2 * 2.6);
  float disc = smoothstep(1.0, 0.6, r2) * (0.4 + 0.25 * r2);
  float a = mix(disc, sharp, vSharp);
  float hot = exp(-r2 * 34.0) * vSharp * dot(vCol, vec3(0.45));
  gl_FragColor = vec4(vCol * a + vec3(hot), 1.0);
}`;
  const QUAD_VS = `
attribute vec2 aXY;
varying vec2 vUv;
void main() { vUv = aXY * 0.5 + 0.5; gl_Position = vec4(aXY, 0.0, 1.0); }`;
  const COPY_FS = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uGain;
uniform float uFloor;
void main() {
  vec3 c = texture2D(uTex, vUv + uTexel * vec2(-1.0, -1.0)).rgb
    + texture2D(uTex, vUv + uTexel * vec2(1.0, -1.0)).rgb
    + texture2D(uTex, vUv + uTexel * vec2(-1.0, 1.0)).rgb
    + texture2D(uTex, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  gl_FragColor = vec4(max(c * 0.25 * uGain - uFloor, 0.0), 1.0);
}`;
  const BLUR_FS = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb * 0.227027;
  c += (texture2D(uTex, vUv + uDir * 1.3846).rgb + texture2D(uTex, vUv - uDir * 1.3846).rgb) * 0.3162162;
  c += (texture2D(uTex, vUv + uDir * 3.2308).rgb + texture2D(uTex, vUv - uDir * 3.2308).rgb) * 0.0702703;
  gl_FragColor = vec4(c, 1.0);
}`;
  const COMPOSITE_FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloomA;
uniform sampler2D uBloomB;
uniform vec2 uRes;
uniform float uTime;
uniform float uAspect;
uniform vec3 uGlow;
uniform vec3 uBeam;
uniform float uFlash;
uniform vec3 uBg;
uniform vec3 uGlowColor;
uniform vec3 uBeamColor;
uniform vec3 uFlashColor;
uniform float uExposure;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 scene = texture2D(uScene, vUv).rgb;
  vec3 bloom = texture2D(uBloomA, vUv).rgb * 1.1 + texture2D(uBloomB, vUv).rgb * 1.5;
  vec2 p = (vUv - uGlow.xy) * vec2(uAspect, 1.0);
  vec3 bg = uBg + uGlowColor * uGlow.z * exp(-dot(p, p) * 5.0);
  vec2 q = vUv - uBeam.xy;
  q.x *= uAspect;
  float beam = exp(-q.x * q.x * 55.0) * smoothstep(-0.015, 0.02, q.y) * exp(-max(q.y, 0.0) * 2.4);
  float base = exp(-(q.x * q.x * 6.0 + q.y * q.y * 260.0));
  bg += uBeamColor * (beam * 0.28 + base * 0.4) * uBeam.z;
  vec3 col = bg + scene * 1.15 + bloom + uFlashColor * uFlash;
  col = vec3(1.0) - exp(-col * uExposure);
  vec2 v = (vUv - 0.5) * vec2(uAspect * 0.9 + 0.3, 1.0);
  col *= 1.0 - smoothstep(0.25, 0.95, length(v)) * 0.75;
  col += (hash(vUv * uRes + fract(uTime * 7.13) * 91.0) - 0.5) * 0.014;
  gl_FragColor = vec4(col, 1.0);
}`;

  const program = (vs, fs, attribs) => {
    const p = gl.createProgram();
    for (const [src, type] of [[vs, gl.VERTEX_SHADER], [fs, gl.FRAGMENT_SHADER]]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    attribs.forEach((name, i) => gl.bindAttribLocation(p, i, name));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name;
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p, u };
  };
  const points = program(POINT_VS, POINT_FS, ['aPos', 'aCol']);
  const copy = program(QUAD_VS, COPY_FS, ['aXY']);
  const blur = program(QUAD_VS, BLUR_FS, ['aXY']);
  const composite = program(QUAD_VS, COMPOSITE_FS, ['aXY']);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posBuf = gl.createBuffer();
  const colBuf = gl.createBuffer();
  let capacity = 0;
  let owner = null;
  const maxPoint = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64;

  const makeTarget = () => ({ tex: gl.createTexture(), fb: gl.createFramebuffer(), w: 0, h: 0 });
  const sizeTarget = (t, w, h) => {
    if (t.w === w && t.h === h) return;
    t.w = w;
    t.h = h;
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  const scenes = [makeTarget(), makeTarget()];
  const bloomA = makeTarget();
  const tmpA = makeTarget();
  const bloomB = makeTarget();
  const tmpB = makeTarget();
  let current = 0;

  const bindTarget = (t) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fb : null);
    gl.viewport(0, 0, t ? t.w : canvas.width, t ? t.h : canvas.height);
  };
  const drawQuad = () => {
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const texture = (unit, tex, loc) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc, unit);
  };
  const copyPass = (src, dst, gain, texel, floor = 0) => {
    bindTarget(dst);
    gl.useProgram(copy.p);
    texture(0, src.tex, copy.u.uTex);
    gl.uniform2f(copy.u.uTexel, texel ? 1 / src.w : 0, texel ? 1 / src.h : 0);
    gl.uniform1f(copy.u.uGain, gain);
    gl.uniform1f(copy.u.uFloor, floor);
    drawQuad();
  };
  const blurPass = (src, dst, dx, dy) => {
    bindTarget(dst);
    gl.useProgram(blur.p);
    texture(0, src.tex, blur.u.uTex);
    gl.uniform2f(blur.u.uDir, dx / src.w, dy / src.h);
    drawQuad();
  };
  const vec3 = (loc, v, fallback) => gl.uniform3fv(loc, v || fallback);

  return {
    gl,
    canvas,
    render(o) {
      const { width, height } = o;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      sizeTarget(scenes[0], width, height);
      sizeTarget(scenes[1], width, height);
      const aw = Math.max(1, Math.round(width / 4));
      const ah = Math.max(1, Math.round(height / 4));
      sizeTarget(bloomA, aw, ah);
      sizeTarget(tmpA, aw, ah);
      sizeTarget(bloomB, Math.max(1, Math.round(aw / 2)), Math.max(1, Math.round(ah / 2)));
      sizeTarget(tmpB, bloomB.w, bloomB.h);
      // Otra escena usó el contexto (galería): su estela no debe mezclarse con esta
      if (o.reset || o.owner !== owner) {
        owner = o.owner;
        for (const t of scenes) {
          bindTarget(t);
          gl.clearColor(0, 0, 0, 1);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
      }

      gl.disable(gl.BLEND);
      const prev = scenes[current];
      const next = scenes[1 - current];
      if (o.trail > 0.01) {
        copyPass(prev, next, o.trail, false, 2 / 255);
      } else {
        bindTarget(next);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(points.p);
      gl.uniformMatrix4fv(points.u.uVP, false, o.vp);
      gl.uniform1f(points.u.uPx, o.px);
      gl.uniform1f(points.u.uFocus, o.focus);
      gl.uniform1f(points.u.uAperture, o.aperture);
      gl.uniform1f(points.u.uMaxSize, Math.min(maxPoint, o.maxSize));
      if (capacity < o.pos.byteLength) {
        capacity = o.pos.byteLength;
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, capacity, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
        gl.bufferData(gl.ARRAY_BUFFER, capacity, gl.DYNAMIC_DRAW);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, o.pos.subarray(0, o.count * 4));
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, o.col.subarray(0, o.count * 4));
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, o.count);
      gl.disable(gl.BLEND);
      current = 1 - current;

      copyPass(next, bloomA, 1, true);
      blurPass(bloomA, tmpA, 1, 0);
      blurPass(tmpA, bloomA, 0, 1);
      copyPass(bloomA, bloomB, 1, true);
      blurPass(bloomB, tmpB, 1, 0);
      blurPass(tmpB, bloomB, 0, 1);
      blurPass(bloomB, tmpB, 2, 0);
      blurPass(tmpB, bloomB, 0, 2);

      bindTarget(null);
      gl.useProgram(composite.p);
      texture(0, next.tex, composite.u.uScene);
      texture(1, bloomA.tex, composite.u.uBloomA);
      texture(2, bloomB.tex, composite.u.uBloomB);
      gl.uniform2f(composite.u.uRes, width, height);
      gl.uniform1f(composite.u.uTime, o.time);
      gl.uniform1f(composite.u.uAspect, width / height);
      vec3(composite.u.uGlow, o.glow, [0.5, 0.5, 0]);
      vec3(composite.u.uBeam, o.beam, [0.5, 0, 0]);
      gl.uniform1f(composite.u.uFlash, o.flash || 0);
      vec3(composite.u.uBg, o.bg, [0.001, 0.002, 0.006]);
      vec3(composite.u.uGlowColor, o.glowColor, [0.006, 0.025, 0.07]);
      vec3(composite.u.uBeamColor, o.beamColor, [0.03, 0.2, 0.45]);
      vec3(composite.u.uFlashColor, o.flashColor, [0.12, 0.4, 0.8]);
      gl.uniform1f(composite.u.uExposure, o.exposure || 1.5);
      drawQuad();
    },
  };
}

// Respaldo sin WebGL: los mismos buffers dibujados como puntos luminosos en Canvas 2D.
export function drawParticles2D(ctx, w, h, vp, pos, col, count, focus, aperture = 0.05, bg = '#010207') {
  const sprites = drawParticles2D.sprites || (drawParticles2D.sprites = new Map());
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  const cssPx = h / (2 * PARTICLE_TAN);
  const step = count > 6000 ? 2 : 1;
  for (let k = 0; k < count; k += step) {
    const q = k * 4;
    const I = pos[q + 3];
    if (I <= 0.02) continue;
    const x = pos[q];
    const y = pos[q + 1];
    const z = pos[q + 2];
    const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    if (cw < 0.15) continue;
    const sx = ((vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / cw) * 0.5 + 0.5;
    const sy = 0.5 - ((vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / cw) * 0.5;
    const size = Math.min(60, Math.max(2, (col[q + 3] * cssPx) / cw + (aperture * cssPx * Math.abs(cw - focus)) / (cw * focus)) * 2);
    const key = (Math.round(col[q] * 3) << 4) | (Math.round(col[q + 1] * 3) << 2) | Math.round(col[q + 2] * 3);
    let dot = sprites.get(key);
    if (!dot) {
      dot = document.createElement('canvas');
      dot.width = dot.height = 32;
      const g = dot.getContext('2d');
      const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      const rgb = [col[q], col[q + 1], col[q + 2]].map((v) => Math.round(Math.min(1, Math.round(v * 3) / 3) * 255)).join(',');
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.18, `rgba(${rgb},0.9)`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, 32, 32);
      sprites.set(key, dot);
    }
    ctx.globalAlpha = Math.min(1, I * 0.8 * step);
    ctx.drawImage(dot, sx * w - size / 2, sy * h - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

// ---- Cuerpo humano de partículas ----
// 18 articulaciones en el espacio del jugador: mira hacia +z, y hacia arriba, su izquierda en +x, pies en y = 0.
// 0 cabeza, 1 cuello, 2 pecho, 3 pelvis, 4-6 brazo izq. (hombro, codo, mano), 7-9 brazo der.,
// 10-13 pierna izq. (cadera, rodilla, tobillo, punta), 14-17 pierna der.
// Ángulos en radianes: hip/sh = flexión hacia adelante, kn = rodilla doblada, el = codo, legOut/armOut = abrir hacia afuera,
// foot = punta estirada, lean = torso hacia adelante, twist = giro del torso, sway = inclinación lateral, head = mirar abajo.
export const STAND_POSE = {
  bob: 0, lean: 0, twist: 0, sway: 0, head: 0,
  hipL: 0, knL: 0.06, legOutL: 0.06, footL: 0, hipR: 0, knR: 0.06, legOutR: 0.06, footR: 0,
  shL: 0.05, elL: 0.3, armOutL: 0.12, shR: 0.05, elR: 0.3, armOutR: 0.12,
};

export function bodyPose(out, p) {
  const py = 0.95 + (p.bob || 0);
  const set = (j, x, y, z) => { out[j * 3] = x; out[j * 3 + 1] = y; out[j * 3 + 2] = z; };
  const seg = (j, from, f, ab, side, len) => {
    const b = from * 3;
    const c = Math.cos(f);
    set(j, out[b] + side * c * Math.sin(ab) * len, out[b + 1] - c * Math.cos(ab) * len, out[b + 2] + Math.sin(f) * len);
  };
  set(3, 0, py, 0);
  for (const [side, hip, kn, an, to, fl, knee, ab, foot] of [
    [1, 10, 11, 12, 13, p.hipL, p.knL, p.legOutL, p.footL],
    [-1, 14, 15, 16, 17, p.hipR, p.knR, p.legOutR, p.footR],
  ]) {
    set(hip, side * 0.1, py - 0.03, 0);
    seg(kn, hip, fl, ab, side, 0.46);
    seg(an, kn, fl - knee, ab, side, 0.44);
    seg(to, an, fl - knee + Math.PI / 2 - (foot || 0), ab * 0.3, side, 0.15);
  }
  set(2, 0, py + 0.36, 0);
  set(1, 0, py + 0.56, 0);
  const hc = Math.cos(p.head || 0);
  const hs = Math.sin(p.head || 0);
  set(0, 0, py + 0.56 + 0.18 * hc - 0.03 * hs, 0.18 * hs + 0.03 * hc);
  for (const [side, sh, el, ha, f, bend, ab] of [
    [1, 4, 5, 6, p.shL, p.elL, p.armOutL],
    [-1, 7, 8, 9, p.shR, p.elR, p.armOutR],
  ]) {
    set(sh, side * 0.19, py + 0.5, 0);
    seg(el, sh, f, ab, side, 0.29);
    seg(ha, el, f + bend, ab, side, 0.27);
  }
  // Giro, inclinación y ladeo del torso alrededor de la pelvis
  const ct = Math.cos(p.twist || 0);
  const st = Math.sin(p.twist || 0);
  const cl = Math.cos(p.lean || 0);
  const sl = Math.sin(p.lean || 0);
  const cs = Math.cos(p.sway || 0);
  const ss = Math.sin(p.sway || 0);
  for (const j of [0, 1, 2, 4, 5, 6, 7, 8, 9]) {
    let x = out[j * 3];
    let y = out[j * 3 + 1] - py;
    let z = out[j * 3 + 2];
    const x1 = x * ct + z * st;
    z = -x * st + z * ct;
    x = x1;
    const y1 = y * cl - z * sl;
    z = y * sl + z * cl;
    y = y1;
    const x2 = x * cs - y * ss;
    y = x * ss + y * cs;
    set(j, x2, y + py, z);
  }
  return out;
}

// Ciclo de carrera en `out` (se reutiliza el objeto). `amount` 0..1 = trote → sprint.
export function runPose(out, phase, amount = 1) {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const k = 0.55 + 0.45 * amount;
  out.bob = 0.03 * Math.cos(phase * 2) - 0.03;
  out.lean = 0.08 + 0.16 * amount;
  out.twist = 0.12 * s;
  out.sway = 0;
  out.head = -0.1 - 0.1 * amount;
  out.hipL = 0.6 * k * s;
  out.hipR = -0.6 * k * s;
  out.knL = 0.2 + Math.max(0, c) * 1.3 * k;
  out.knR = 0.2 + Math.max(0, -c) * 1.3 * k;
  out.footL = 0.25 * c;
  out.footR = -0.25 * c;
  out.legOutL = 0.04;
  out.legOutR = 0.04;
  out.shL = -0.55 * k * s;
  out.shR = 0.55 * k * s;
  out.elL = 1.35;
  out.elR = 1.35;
  out.armOutL = 0.14;
  out.armOutR = 0.14;
  return out;
}

// Muestrea `count` partículas sobre el cuerpo. extras: { hair, beard, number: '10' } (fracciones / texto en la espalda).
// feat: 0 cuerpo, 1 cabello, 2 barba, 3 número.
export function makeBody(count, extras = {}) {
  const J = bodyPose(new Float32Array(54), STAND_POSE);
  // [inicio, fin, radio inicio, radio fin, profundidad/ancho, referencia lateral: 0 hombros, 1 caderas, 2 vertical, esfera]
  const bones = [
    [3, 1, 0.15, 0.19, 0.62, 0], [14, 10, 0.1, 0.1, 0.8, 2], [7, 4, 0.065, 0.065, 0.9, 2], [1, 0, 0.055, 0.05, 1, 0],
    [4, 5, 0.055, 0.045, 1, 0], [5, 6, 0.045, 0.035, 1, 0], [7, 8, 0.055, 0.045, 1, 0], [8, 9, 0.045, 0.035, 1, 0],
    [10, 11, 0.085, 0.06, 1, 1], [11, 12, 0.06, 0.042, 1, 1], [12, 13, 0.045, 0.035, 1, 1],
    [14, 15, 0.085, 0.06, 1, 1], [15, 16, 0.06, 0.042, 1, 1], [16, 17, 0.045, 0.035, 1, 1],
  ].map(([a, b, r0, r1, depth, ref]) => ({ a, b, r0, r1, depth, ref, sphere: false }));
  // Esferas: cabeza (con el marco del cuello) y manos (con el antebrazo)
  bones.push({ a: 0, b: 0, r0: 0.115, r1: 0.115, depth: 1.12, ref: 0, sphere: true, frame: 3 });
  bones.push({ a: 6, b: 6, r0: 0.045, r1: 0.045, depth: 1, ref: 0, sphere: true, frame: 5 });
  bones.push({ a: 9, b: 9, r0: 0.045, r1: 0.045, depth: 1, ref: 0, sphere: true, frame: 7 });
  const weights = bones.map((bn) => {
    if (bn.sphere) return bn.r0 * bn.r0 * 12;
    const len = Math.hypot(J[bn.b * 3] - J[bn.a * 3], J[bn.b * 3 + 1] - J[bn.a * 3 + 1], J[bn.b * 3 + 2] - J[bn.a * 3 + 2]);
    return len * (bn.r0 + bn.r1) * (1 + bn.depth) * 1.6;
  });
  const total = weights.reduce((s, v) => s + v, 0);
  const bone = new Uint8Array(count);
  const pa = new Float32Array(count);
  const pb = new Float32Array(count);
  const pc = new Float32Array(count);
  const rad = new Float32Array(count);
  const feat = new Uint8Array(count);
  const g = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const unit = () => {
    let x;
    let y;
    let z;
    let l;
    do { x = g(); y = g(); z = g(); l = Math.hypot(x, y, z); } while (l < 1e-3);
    return [x / l, y / l, z / l];
  };
  const hairN = Math.round(count * (extras.hair || 0));
  const beardN = Math.round(count * (extras.beard || 0));
  let numberPts = [];
  if (extras.number) numberPts = textPoints(extras.number, 120, 120, 3, 900);
  const numberN = numberPts.length ? Math.round(count * 0.06) : 0;
  const headBone = bones.length - 3;
  for (let i = 0; i < count; i++) {
    if (i < hairN || (i >= hairN && i < hairN + beardN)) {
      const isHair = i < hairN;
      let d;
      do d = unit(); while (isHair ? !(d[1] > 0.2 || (d[1] > -0.25 && d[2] < -0.35)) : !(d[2] > 0.25 && d[1] < -0.05));
      bone[i] = headBone; pa[i] = d[0]; pb[i] = d[1]; pc[i] = d[2];
      rad[i] = isHair ? 1.06 + Math.random() * 0.14 : 1.02 + Math.random() * 0.1;
      feat[i] = isHair ? 1 : 2;
      continue;
    }
    if (i < hairN + beardN + numberN) {
      const p = numberPts[Math.floor(Math.random() * numberPts.length)];
      const u = clamp(((p.x + (Math.random() - 0.5) * 3) / 60) * 0.5, -0.6, 0.6);
      bone[i] = 0;
      pa[i] = clamp(0.8 - ((p.y + 60) / 120) * 0.42, 0.3, 0.95);
      pb[i] = -u;
      pc[i] = Math.sqrt(1 - u * u);
      rad[i] = 1.04;
      feat[i] = 3;
      continue;
    }
    let r = Math.random() * total;
    let b = 0;
    while (b < bones.length - 1 && r > weights[b]) r -= weights[b++];
    bone[i] = b;
    const inner = Math.random() < 0.18;
    rad[i] = inner ? Math.sqrt(Math.random()) * 0.85 : 1 - Math.abs(g()) * 0.06;
    if (bones[b].sphere) {
      const d = unit();
      pa[i] = d[0]; pb[i] = d[1]; pc[i] = d[2];
    } else {
      const th = Math.random() * Math.PI * 2;
      pa[i] = Math.random(); pb[i] = Math.cos(th); pc[i] = Math.sin(th);
    }
  }
  return { count, bones, bone, pa, pb, pc, rad, feat, frames: new Float32Array(bones.length * 12) };
}

// Coloca las partículas del cuerpo en el mundo: raíz (x, y, z), giro `yaw` (0 = mirando a +z) y escala.
export function placeBody(body, J, rx, ry, rz, yaw, ox, oy, oz, scale = 1) {
  const { bones, frames } = body;
  const norm = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
  const refs = [
    norm(J[12] - J[21], J[13] - J[22], J[14] - J[23]),
    norm(J[30] - J[42], J[31] - J[43], J[32] - J[44]),
    norm(J[3] - J[9], J[4] - J[10], J[5] - J[11]),
  ];
  for (let b = 0; b < bones.length; b++) {
    const bn = bones[b];
    const src = bn.sphere ? bones[bn.frame] : bn;
    let ax = J[src.b * 3] - J[src.a * 3];
    let ay = J[src.b * 3 + 1] - J[src.a * 3 + 1];
    let az = J[src.b * 3 + 2] - J[src.a * 3 + 2];
    const len = Math.hypot(ax, ay, az) || 1e-3;
    const [nx, ny, nz] = [ax / len, ay / len, az / len];
    const ref = refs[src.ref];
    const dot = ref[0] * nx + ref[1] * ny + ref[2] * nz;
    let [sx, sy, sz] = norm(ref[0] - nx * dot, ref[1] - ny * dot, ref[2] - nz * dot);
    if (Math.abs(dot) > 0.98) [sx, sy, sz] = [0, 0, 1];
    const f = b * 12;
    frames[f] = J[bn.a * 3]; frames[f + 1] = J[bn.a * 3 + 1]; frames[f + 2] = J[bn.a * 3 + 2];
    if (bn.sphere) { ax = nx; ay = ny; az = nz; }
    frames[f + 3] = ax; frames[f + 4] = ay; frames[f + 5] = az;
    frames[f + 6] = sx; frames[f + 7] = sy; frames[f + 8] = sz;
    frames[f + 9] = ny * sz - nz * sy; frames[f + 10] = nz * sx - nx * sz; frames[f + 11] = nx * sy - ny * sx;
  }
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const { bone, pa, pb, pc, rad } = body;
  for (let i = 0; i < body.count; i++) {
    const b = bone[i];
    const bn = bones[b];
    const f = b * 12;
    let x;
    let y;
    let z;
    if (bn.sphere) {
      const r = bn.r0 * rad[i];
      const u = pb[i] * bn.depth;
      x = frames[f] + (frames[f + 6] * pa[i] + frames[f + 3] * u - frames[f + 9] * pc[i]) * r;
      y = frames[f + 1] + (frames[f + 7] * pa[i] + frames[f + 4] * u - frames[f + 10] * pc[i]) * r;
      z = frames[f + 2] + (frames[f + 8] * pa[i] + frames[f + 5] * u - frames[f + 11] * pc[i]) * r;
    } else {
      const t = pa[i];
      const r = (bn.r0 + (bn.r1 - bn.r0) * t) * rad[i];
      const d = r * bn.depth;
      x = frames[f] + frames[f + 3] * t + frames[f + 6] * pb[i] * r + frames[f + 9] * pc[i] * d;
      y = frames[f + 1] + frames[f + 4] * t + frames[f + 7] * pb[i] * r + frames[f + 10] * pc[i] * d;
      z = frames[f + 2] + frames[f + 5] * t + frames[f + 8] * pb[i] * r + frames[f + 11] * pc[i] * d;
    }
    ox[i] = (x * cy + z * sy) * scale + rx;
    oy[i] = y * scale + ry;
    oz[i] = (-x * sy + z * cy) * scale + rz;
  }
}

// Balón de partículas: direcciones sobre la esfera y `patch` = 1 en los 12 parches (vértices de un icosaedro).
export function ballPoints(n) {
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const z = new Float32Array(n);
  const patch = new Uint8Array(n);
  const phi = (1 + Math.sqrt(5)) / 2;
  const verts = [];
  for (const [a, b] of [[1, phi], [-1, phi], [1, -phi], [-1, -phi]]) verts.push([0, a, b], [a, b, 0], [b, 0, a]);
  const vn = verts.map(([a, b, c]) => { const l = Math.hypot(a, b, c); return [a / l, b / l, c / l]; });
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const yy = 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(1 - yy * yy);
    const a = i * golden;
    x[i] = Math.cos(a) * r; y[i] = yy; z[i] = Math.sin(a) * r;
    let best = -1;
    for (const v of vn) best = Math.max(best, v[0] * x[i] + v[1] * y[i] + v[2] * z[i]);
    patch[i] = best > 0.93 ? 1 : 0;
  }
  return { n, x, y, z, patch };
}
