import { TAU, clamp, ease, seeded, backdrop, point, flare, petal,
  textHalo, recipient, consumeTap } from './flower-premium-core.js';

export default function create(ctx, w, h, dpr = 1, stage) {
  const rand = seeded(662), motes = Array.from({ length: stage?.preview ? 90 : 210 }, () => ({
    a: rand() * TAU, r: rand(), speed: .35 + rand() * .9, phase: rand() * TAU,
  }));
  let charge = 0, completedAt = null;
  return (t, dt = .016) => {
    backdrop(ctx, w, h, '#010509', '#061b17', t);
    const cx = w / 2, baseY = h * .77, bloomY = h * .39, R = Math.min(w * .29, h * .19);
    const holding = !!stage?.holding;
    if (consumeTap(stage) && stage?.preview) charge = Math.max(charge, .2);
    if (holding) charge += dt * .28;
    else if (stage?.preview || !stage) charge += dt * .15;
    else if (t > 10) charge += dt * .055;
    else charge -= dt * .012;
    charge = clamp(charge);
    if (charge >= 1 && completedAt === null) completedAt = t;
    if (stage && charge >= 1) stage.revealed = true;
    const pulse = 1 + Math.sin(t * 3) * .06;
    flare(ctx, cx, baseY, R * 1.8, .22 + charge * .32, '82,255,170');
    flare(ctx, cx, bloomY, R * 2.2, charge * .34, '255,230,99');
    // Raíces se ramifican desde el núcleo y alimentan el tallo según la carga real.
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const a = Math.PI / 2 + i * Math.PI / 6;
      const len = R * (.4 + i % 3 * .17) * ease(charge * 3);
      const x = cx + Math.cos(a) * len, y = baseY + Math.sin(a) * len * .23;
      ctx.strokeStyle = `rgba(92,245,158,${charge * (.22 + i % 2 * .25)})`;
      ctx.lineWidth = i % 2 ? 1 : 2;
      ctx.beginPath(); ctx.moveTo(cx, baseY);
      ctx.quadraticCurveTo(cx + Math.cos(a) * len * .52, baseY + len * .1, x, y); ctx.stroke();
      point(ctx, x, y, 1.2, charge * .8, '#b2ffd4');
    }
    const stem = ease((charge - .18) / .43);
    if (stem > 0) {
      const tip = baseY - stem * (baseY - bloomY);
      ctx.strokeStyle = `rgba(113,255,180,${.25 + stem * .7})`; ctx.lineWidth = 5;
      ctx.shadowColor = '#50ffa7'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(cx, baseY);
      ctx.bezierCurveTo(cx - w * .08, baseY - h * .11, cx + w * .06, tip + h * .08, cx, tip); ctx.stroke();
      ctx.shadowBlur = 0;
      for (const [u, side] of [[.45, -1], [.68, 1]]) if (stem > u) {
        const y = baseY - stem * (baseY - bloomY) * u;
        ctx.save(); ctx.translate(cx, y); ctx.rotate(side * .85);
        ctx.globalAlpha = ease((stem - u) / .25);
        petal(ctx, 0, 0, R * .52, R * .11, 0, '#a6ffc7', '#1d7a55');
        ctx.restore();
      }
    }
    const flower = ease((charge - .57) / .43);
    if (flower > 0) {
      for (let i = 0; i < 14; i++) {
        const a = i * TAU / 14 + Math.sin(t * .34) * .035;
        ctx.save(); ctx.globalAlpha = flower;
        ctx.shadowColor = '#ffe877'; ctx.shadowBlur = 9 * flower;
        petal(ctx, cx, bloomY, R * flower * pulse, R * .2, a, '#fff4a5', '#c77419');
        ctx.restore();
      }
      point(ctx, cx, bloomY, R * .24 * flower, flower, '#552e14');
      for (let i = 0; i < 20; i++) {
        const a = i * 2.399, rr = Math.sqrt(i / 20) * R * .2;
        point(ctx, cx + Math.cos(a) * rr, bloomY + Math.sin(a) * rr, 1.2, flower, '#ffcf68');
      }
    }
    for (const p of motes) {
      const rr = R * (.4 + p.r * 2), a = p.a + t * p.speed * .28;
      point(ctx, cx + Math.cos(a) * rr, bloomY + Math.sin(a) * rr * .85,
        .5 + p.r * 1.3, (.07 + charge * .42) * Math.sin(t * 1.6 + p.phase) ** 2, '#c6ffd5');
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#b9f7d0'; ctx.font = '600 12px system-ui, sans-serif';
    if (charge < 1) {
      ctx.fillText('MANTÉN PULSADO PARA DARLE VIDA', cx, h * .89, w * .9);
      ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(w * .18, h * .91, w * .64, 3);
      ctx.fillStyle = '#ffe681'; ctx.fillRect(w * .18, h * .91, w * .64 * charge, 3);
    } else {
      const show = ease((t - completedAt) / .9);
      textHalo(ctx, `Esta la hice para ${recipient(stage)}`, cx, h * .87,
        Math.max(14, w * .06), show);
    }
  };
}
