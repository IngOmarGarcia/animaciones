// Geometría y utilidades compartidas. Cada escena define su propio guion y composición.
export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const mix = (a, b, t) => a + (b - a) * t;
export const progress = (t, start, duration) => ease((t - start) / duration);
export const recipient = (stage) => (stage?.card?.p || 'TI').trim().slice(0, 32).toUpperCase();
export const message = (stage, fallback) => (stage?.card?.m || fallback).trim().slice(0, 140);

export function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
    n = (n + Math.imul(n ^ n >>> 7, 61 | n)) ^ n;
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

export function quality(stage, w, h) {
  const mobile = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const factor = stage?.preview ? 0.32 : mobile ? 0.65 : 1;
  return Math.max(80, Math.round(Math.min(1600, w * h / 260) * factor));
}

export function backdrop(ctx, w, h, top = '#03050c', bottom = '#1b1009', t = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const cx = w * (0.5 + Math.sin(t * 0.08) * 0.02), cy = h * 0.54;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.57);
  glow.addColorStop(0, 'rgba(255,185,55,.055)'); glow.addColorStop(1, 'rgba(255,185,55,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
}

export function point(ctx, x, y, r, a = 1, color = '#ffe78d') {
  if (a <= 0 || r <= 0) return;
  const before = ctx.globalAlpha;
  ctx.globalAlpha = before * a;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.globalAlpha = before;
}

export function flare(ctx, x, y, r, a = 1, color = '255,196,58') {
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color},${0.48 * a})`);
  g.addColorStop(0.25, `rgba(${color},${0.12 * a})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function project(w, h, x, y, z, camera = 5.8, unit = 0.54) {
  const depth = Math.max(0.6, camera - z);
  const f = Math.min(w, h * unit) * 2.45 / depth;
  return { x: w * 0.5 + x * f, y: h * 0.52 - y * f, scale: f, depth };
}

export function petal(ctx, x, y, length, width, angle, c1 = '#ffe787', c2 = '#d38716') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  const g = ctx.createLinearGradient(-width, 0, width, -length);
  g.addColorStop(0, c2); g.addColorStop(.55, c1); g.addColorStop(1, '#fff4b4');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-width * 1.15, -length * .3, -width * .7, -length * .8, 0, -length);
  ctx.bezierCurveTo(width * .7, -length * .8, width * 1.15, -length * .3, 0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,248,199,.48)'; ctx.lineWidth = Math.max(.5, width * .05);
  ctx.beginPath(); ctx.moveTo(0, -length * .07); ctx.lineTo(0, -length * .9); ctx.stroke();
  ctx.restore();
}

export function sunflower(ctx, x, y, radius, rotation = 0, alpha = 1, count = 14) {
  if (alpha <= 0 || radius < 1) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rotation);
  for (let i = 0; i < count; i++) {
    petal(ctx, 0, 0, radius, radius * .2, i * TAU / count,
      i % 3 ? '#ffdb5d' : '#fff09a', i % 2 ? '#b85c0d' : '#d69021');
  }
  const disk = ctx.createRadialGradient(-radius * .08, -radius * .08, 0, 0, 0, radius * .34);
  disk.addColorStop(0, '#a65a1b'); disk.addColorStop(.65, '#4b270f'); disk.addColorStop(1, '#26150d');
  ctx.fillStyle = disk; ctx.beginPath(); ctx.arc(0, 0, radius * .34, 0, TAU); ctx.fill();
  for (let i = 0; i < 24; i++) {
    const a = i * 2.39996, d = Math.sqrt(i / 24) * radius * .3;
    point(ctx, Math.cos(a) * d, Math.sin(a) * d, Math.max(.65, radius * .017), .7, '#e2a746');
  }
  ctx.restore();
}

export function textTargets(text, maxWidth = 240, step = 4) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(maxWidth); c.height = 56;
  const g = c.getContext('2d', { willReadFrequently: true });
  let size = 42;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  do { g.font = `800 ${size--}px system-ui, sans-serif`; } while (size > 18 && g.measureText(text).width > maxWidth - 8);
  g.fillStyle = '#fff'; g.fillText(text, c.width / 2, 28);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  const pts = [];
  for (let y = 0; y < c.height; y += step) for (let x = 0; x < c.width; x += step) {
    if (data[(y * c.width + x) * 4 + 3] > 100) pts.push([x - c.width / 2, y - 28]);
  }
  return pts;
}

export function particleName(ctx, pts, cx, cy, t, amount = 1, color = '#ffe783') {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const p = ease(amount);
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    const phase = i * 2.399;
    const drift = (1 - p) * 80;
    point(ctx, cx + x * p + Math.cos(phase + t) * drift + Math.sin(t * 2 + i) * 1.1,
      cy + y * p + Math.sin(phase + t) * drift + Math.cos(t * 1.7 + i) * 1.1,
      i % 8 === 0 ? 1.8 : 1, .35 + .65 * p, color);
  }
  ctx.restore();
}

export function textHalo(ctx, text, x, y, size, alpha = 1, color = '#fff1bf') {
  if (!text || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'center';
  ctx.font = `600 ${size}px Georgia, serif`;
  ctx.shadowColor = '#ffc358'; ctx.shadowBlur = 15;
  ctx.fillStyle = color; ctx.fillText(text, x, y, Math.max(80, ctx.canvas.width * .78));
  ctx.restore();
}

export function consumeTap(stage) {
  if (!stage?.taps?.length) return false;
  stage.taps.length = 0;
  return true;
}
