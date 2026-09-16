import { TAU, clamp, progress, mix, seeded, backdrop, sunflower, flare,
  textHalo, recipient, consumeTap } from './flower-premium-core.js';

export default function create(ctx, w, h, dpr = 1, stage) {
  const rand = seeded(707), glints = Array.from({ length: 90 }, () => ({x:rand(),y:rand(),p:rand()*TAU}));
  let alignAt = null;
  return (t) => {
    backdrop(ctx, w, h, '#04040d', '#160c22', t);
    const cx = w / 2, cy = h * .50;
    if (consumeTap(stage) && t > 2.4 && alignAt === null) alignAt = t;
    if (alignAt === null && t > 6.7) alignAt = t;
    const age = alignAt === null ? -1 : t - alignAt;
    const arrive = progress(t, .7, 3.1), synced = age < 0 ? 0 : progress(age, 0, 1.15);
    const reveal = age < 0 ? 0 : progress(age, 1.3, 1.7);
    if (stage && age > 3.1) stage.revealed = true;
    // Paredes del corredor: bordes de Fresnel, reflejo oblicuo y franjas de refracción.
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx + side * w * .19, h * .12);
      ctx.lineTo(cx + side * w * .49, 0);
      ctx.lineTo(cx + side * w * .49, h);
      ctx.lineTo(cx + side * w * .19, h * .88);
      ctx.closePath(); ctx.clip();
      const g = ctx.createLinearGradient(cx + side * w * .2, 0, cx + side * w * .5, 0);
      g.addColorStop(0, 'rgba(255,238,173,.055)');
      g.addColorStop(.4, 'rgba(133,105,152,.16)');
      g.addColorStop(.72, 'rgba(10,9,25,.75)');
      g.addColorStop(1, 'rgba(249,218,145,.24)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) {
        const y = i * h / 11 + Math.sin(t * .4 + i) * 3;
        ctx.strokeStyle = `rgba(255,231,165,${.045 + i % 4 * .017})`;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + side * 8); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = `rgba(255,240,200,${.32 + .13 * Math.sin(t * .7)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx + side * w * .19, h * .12); ctx.lineTo(cx + side * w * .19, h * .88); ctx.stroke();
    }
    // Dos espejos enfrentados producen copias cada vez más pequeñas y tintadas por distancia.
    const copies = stage?.preview ? 7 : 11;
    for (let k = copies - 1; k >= 0; k--) {
      const depth = k / copies, contraction = Math.pow(.76, k);
      const sway = (1 - synced) * Math.sin(t * (.5 + depth) + k * .9) * w * .035;
      const px = cx + sway + Math.sin(k * 1.4) * w * .11 * depth;
      const py = cy + (k % 2 ? -1 : 1) * h * .22 * depth;
      const radius = w * .31 * contraction * arrive;
      flare(ctx, px, py, radius * 1.8, (.13 + .2 * contraction) * arrive);
      sunflower(ctx, px, py, radius, t * .08 + k * .35, (.28 + .72 * contraction) * arrive * (1 - reveal * .22), 16);
      if (k < 5) {
        ctx.save(); ctx.translate(px, py); ctx.scale(1, -.42); ctx.globalAlpha = .12 * arrive * contraction;
        sunflower(ctx, 0, -radius * 2.1, radius, -t * .08, 1, 16); ctx.restore();
      }
    }
    // Glints viajan por las capas como rayos que rebotan.
    for (const p of glints) {
      const v = (p.y + t * .045) % 1, x = w * (.2 + p.x * .6) + Math.sin(t + p.p) * 3;
      ctx.fillStyle = `rgba(255,239,192,${(.15 + .4 * Math.sin(t * 2 + p.p) ** 2) * arrive})`;
      ctx.fillRect(x, h * v, 1, 1.5);
    }
    if (age >= 0) {
      const pulse = Math.exp(-age * 1.5);
      ctx.strokeStyle = `rgba(255,247,207,${pulse * .7})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, w * (.2 + age * .15), h * (.08 + age * .08), 0, 0, TAU); ctx.stroke();
      const label = recipient(stage);
      // Debajo del bloque de mensaje y firma del visor, que ocupa la franja superior
      textHalo(ctx, label, cx, h * .44, Math.max(19, w * .12), reveal);
      ctx.save(); ctx.translate(0, h * .7); ctx.scale(1, -.42);
      textHalo(ctx, label, cx, 0, Math.max(19, w * .12), reveal * .22, '#d9b8ff'); ctx.restore();
    }
  };
}
