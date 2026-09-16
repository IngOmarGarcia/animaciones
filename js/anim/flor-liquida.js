import { TAU, clamp, progress, seeded, backdrop, point, flare,
  textHalo, recipient, consumeTap } from './flower-premium-core.js';

export default function create(ctx, w, h, dpr = 1, stage) {
  const rand = seeded(4402), drops = Array.from({ length: stage?.preview ? 70 : 150 }, () => ({
    a: rand() * TAU, speed: .5 + rand(), distance: rand(), phase: rand() * TAU,
  }));
  let bloomAt = null;
  const metalPetal = (x, y, r, a, open) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    const g = ctx.createLinearGradient(-r * .22, -r, r * .3, 0);
    g.addColorStop(0, '#fff6c8'); g.addColorStop(.22, '#ffcf58');
    g.addColorStop(.54, '#a65b12'); g.addColorStop(.78, '#f8bc43'); g.addColorStop(1, '#52300c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-r * .36 * open, -r * .3, -r * .36, -r * .86, 0, -r);
    ctx.bezierCurveTo(r * .36, -r * .86, r * .36 * open, -r * .3, 0, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,249,205,.62)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-r * .04, -r * .14); ctx.quadraticCurveTo(-r * .11, -r * .6, 0, -r * .93); ctx.stroke();
    ctx.restore();
  };
  return (t) => {
    backdrop(ctx, w, h, '#03060a', '#15100b', t);
    const cx = w / 2, surface = h * .7, cy = h * .45, R = Math.min(w * .27, h * .22);
    if (consumeTap(stage) && t > 3.1 && bloomAt === null) bloomAt = t;
    if (bloomAt === null && t > 6.2) bloomAt = t;
    const age = bloomAt === null ? -1 : t - bloomAt;
    const fall = progress(t, .4, 2.4), splash = progress(t, 2.9, .45) * (1 - progress(t, 4.5, 1.3));
    const rise = age < 0 ? 0 : progress(age, 0, 1.7), flower = age < 0 ? 0 : progress(age, 1.1, 2.2);
    if (stage && age > 3.3) stage.revealed = true;
    // Piso negro pulido: una línea especular y la reflexión deformada del objeto.
    ctx.fillStyle = '#050709'; ctx.fillRect(0, surface, w, h - surface);
    const shine = ctx.createLinearGradient(0, surface, 0, h);
    shine.addColorStop(0, 'rgba(220,144,34,.22)'); shine.addColorStop(1, 'rgba(220,144,34,0)');
    ctx.fillStyle = shine; ctx.fillRect(0, surface, w, h - surface);
    ctx.strokeStyle = 'rgba(255,207,93,.54)'; ctx.beginPath(); ctx.moveTo(0, surface); ctx.lineTo(w, surface); ctx.stroke();
    flare(ctx, cx, surface, w * .45, .38 * (splash + flower));
    if (flower < 1) {
      const dropY = -R + fall * (surface + R);
      const radius = R * (.14 + .18 * fall) * (1 - rise) * (1 - progress(t, 2.9, .85));
      if (radius > .5) {
        const metal = ctx.createRadialGradient(cx - radius * .28, dropY - radius * .32, 1, cx, dropY, radius);
        metal.addColorStop(0, '#fff5be'); metal.addColorStop(.34, '#f6ba3e');
        metal.addColorStop(.72, '#a15b12'); metal.addColorStop(1, '#3c240b');
        ctx.fillStyle = metal; ctx.beginPath(); ctx.ellipse(cx, dropY, radius * .72, radius * 1.25, 0, 0, TAU); ctx.fill();
      }
    }
    for (let i = 0; i < 3; i++) {
      const e = clamp((t - 2.8 - i * .25) / 2.4);
      ctx.strokeStyle = `rgba(255,213,100,${(1 - e) * (.48 + splash * .25)})`;
      ctx.lineWidth = 2 - e;
      ctx.beginPath(); ctx.ellipse(cx, surface, w * e * .45, h * e * .045, 0, Math.PI, TAU); ctx.stroke();
    }
    // Materia salpicada que invierte su trayectoria y se une a los pétalos.
    for (const d of drops) {
      const orbit = d.distance * w * .36;
      const x = cx + Math.cos(d.a) * orbit * (1 - flower * .65);
      const y = surface - Math.sin(d.a) ** 2 * splash * h * .18
        - rise * (surface - cy) * (.4 + d.distance * .7);
      point(ctx, x + Math.sin(t + d.phase) * 2, y, .7 + d.speed * 1.5,
        (splash + rise) * (1 - flower * .75) * .62, '#ffd166');
    }
    if (rise > 0) {
      const stem = ctx.createLinearGradient(cx - 8, 0, cx + 8, 0);
      stem.addColorStop(0, '#4f2b0b'); stem.addColorStop(.4, '#ffd874'); stem.addColorStop(1, '#8b4b0d');
      ctx.strokeStyle = stem; ctx.lineWidth = 5 + flower * 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, surface); ctx.bezierCurveTo(cx - w * .09, surface - h * .12,
        cx + w * .08, cy + h * .08, cx, surface - rise * (surface - cy)); ctx.stroke();
      for (let i = 0; i < 13; i++) {
        const a = i * TAU / 13 + Math.sin(t * .3) * .07;
        ctx.globalAlpha = flower;
        metalPetal(cx, cy, R * (0.42 + flower * .58), a, flower);
        ctx.globalAlpha = 1;
      }
      const disk = ctx.createRadialGradient(cx - R * .1, cy - R * .1, 0, cx, cy, R * .35);
      disk.addColorStop(0, '#ffda6b'); disk.addColorStop(.45, '#6c3b0e'); disk.addColorStop(1, '#24160c');
      ctx.fillStyle = disk; ctx.beginPath(); ctx.arc(cx, cy, R * .28 * flower, 0, TAU); ctx.fill();
      if (flower > .7) textHalo(ctx, recipient(stage), cx, cy + R * .08, Math.max(15, w * .075), progress(flower, .7, .3), '#fff2ba');
    }
  };
}
