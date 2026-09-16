import { TAU, clamp, ease, progress, seeded, quality, backdrop, point, flare,
  textTargets, particleName, recipient, consumeTap } from './flower-premium-core.js';

export default function create(ctx, w, h, dpr = 1, stage) {
  const rand = seeded(941), particles = [];
  const total = stage?.preview ? 720 : Math.max(1300, quality(stage, w, h));
  for (let i = 0; i < total; i++) {
    const pet = i % 15, u = rand(), v = rand() * 2 - 1, a = pet * TAU / 15;
    const len = .3 + u * 1.13, width = Math.sin(u * Math.PI) * v * .28;
    particles.push({
      x: Math.cos(a) * len - Math.sin(a) * width,
      y: Math.sin(a) * len + Math.cos(a) * width,
      z: Math.sin(u * Math.PI) * .24 - v * v * .12,
      seed: rand(), phase: rand() * TAU,
    });
  }
  let dissolveAt = null, cached = '', namePts = [];
  return (t) => {
    backdrop(ctx, w, h, '#020b14', '#051921', t);
    const cx = w / 2, cy = h * .47, s = Math.min(w * .31, h * .22);
    const name = recipient(stage);
    if (name !== cached) { cached = name; namePts = textTargets(`PARA ${name}`, w * .82, stage?.preview ? 5 : 3); }
    if (consumeTap(stage) && t > 4 && dissolveAt === null) dissolveAt = t;
    if (dissolveAt === null && t > 8.2) dissolveAt = t;
    const age = dissolveAt === null ? -1 : t - dissolveAt;
    const build = progress(t, .9, 4.5), fade = age < 0 ? 0 : progress(age, 0, 1.3);
    const words = age < 0 ? 0 : progress(age, 1.2, 2.0);
    if (stage && age > 3.2) stage.revealed = true;
    const floorY = h * .76;
    // Pedestal de escaneo: retícula y anillos en perspectiva.
    ctx.strokeStyle = 'rgba(89,213,235,.19)'; ctx.lineWidth = 1;
    for (let j = -5; j <= 5; j++) {
      ctx.beginPath(); ctx.moveTo(cx + j * w * .075, floorY - 12);
      ctx.lineTo(cx + j * w * .18, h); ctx.stroke();
    }
    for (let j = 0; j < 5; j++) {
      const y = floorY + j * j * h * .012;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    flare(ctx, cx, floorY, w * .45, build * .48, '66,214,235');
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(255,219,104,${build * (.25 + i * .13)})`;
      ctx.beginPath(); ctx.ellipse(cx, floorY, w * (.18 + i * .055), h * (.023 + i * .01), 0, 0, TAU); ctx.stroke();
    }
    const scan = cy + s - ((t * .7) % 1) * s * 2;
    ctx.strokeStyle = `rgba(111,247,255,${build * (1 - fade) * .75})`;
    ctx.beginPath(); ctx.moveTo(cx - s * 1.2, scan); ctx.lineTo(cx + s * 1.2, scan); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const yaw = .23 + Math.sin(t * .28) * .28, cosy = Math.cos(yaw), siny = Math.sin(yaw);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const x3 = p.x * cosy + p.z * siny, z3 = p.z * cosy - p.x * siny;
      const f = 1 / (1 - z3 * .17);
      const drawX = cx + x3 * s * f, drawY = cy + p.y * s * f;
      const arrival = ease((t - .9 - p.seed * 2.7) / 1.5);
      const dist = (1 - arrival) * (70 + p.seed * 90);
      const jitter = Math.sin(t * 3 + p.phase) * 1.3;
      point(ctx, drawX + Math.cos(p.phase) * dist + jitter,
        drawY + Math.sin(p.phase) * dist + jitter,
        i % 23 === 0 ? 2.1 : .7 + p.seed * .5,
        arrival * (1 - fade) * (.3 + .65 * Math.sin(t * 2 + p.phase) ** 2),
        i % 5 ? '#ffe17b' : '#8cf4ff');
    }
    ctx.restore();
    // Ejes y disco central del girasol como alambre luminoso.
    ctx.strokeStyle = `rgba(115,244,255,${build * (1 - fade) * .5})`;
    for (let i = 0; i < 15; i++) {
      const a = i * TAU / 15 + yaw;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(s * .28, 0);
      ctx.bezierCurveTo(s * .55, -s * .28, s * 1.2, -s * .23, s * 1.47, 0);
      ctx.bezierCurveTo(s * 1.2, s * .23, s * .55, s * .28, s * .28, 0);
      ctx.stroke(); ctx.restore();
    }
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(cx, cy, s * (.2 + i * .035), s * (.2 + i * .035), 0, 0, TAU); ctx.stroke();
    }
    if (age >= 0) particleName(ctx, namePts, cx, h * .48, t, words, '#a7f3ff');
    ctx.fillStyle = 'rgba(117,226,235,.6)'; ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.fillText('HOLOGRAMA · SECUENCIA DE LUZ', cx, h * .84);
  };
}
