import { TAU, clamp, progress, seeded, backdrop, petal, point, flare,
  textHalo, recipient, consumeTap } from './flower-premium-core.js';

export default function create(ctx, w, h, dpr = 1, stage) {
  const rand = seeded(285), dust = Array.from({ length: stage?.preview ? 80 : 180 }, () => ({
    a: rand() * TAU, r: rand(), phase: rand() * TAU,
  }));
  let rewindAt = null;
  return (t) => {
    backdrop(ctx, w, h, '#08111c', '#291509', t);
    const cx = w / 2, cy = h * .47, R = Math.min(w * .38, h * .30);
    if (consumeTap(stage) && t > 3.5 && rewindAt === null) rewindAt = t;
    if (rewindAt === null && t > 6.3) rewindAt = t;
    const age = rewindAt === null ? -1 : t - rewindAt;
    const face = progress(t, .8, 2.5), stop = age < 0 ? 0 : progress(age, 0, .55);
    const reverse = age < 0 ? 0 : progress(age, .8, 2);
    const hero = age < 0 ? 0 : progress(age, 2.6, 1.2);
    if (stage && age > 3.7) stage.revealed = true;
    flare(ctx, cx, cy, R * 1.6, face * .22);
    // Dial: marcas y dos anillos hechos con pétalos; las agujas se detienen y retroceden.
    ctx.strokeStyle = `rgba(255,219,119,${face * .45})`; ctx.lineWidth = 1.4;
    for (const r of [R * .96, R * .76, R * .31]) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    }
    for (let i = 0; i < 60; i++) {
      const a = i * TAU / 60 - Math.PI / 2;
      const inner = R * (i % 5 ? .86 : .80), outer = R * .94;
      ctx.strokeStyle = `rgba(255,223,135,${face * (i % 5 ? .24 : .72)})`;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer); ctx.stroke();
    }
    const run = t * .55 * (1 - stop) + stop * (rewindAt || 0) * .55 - reverse * 3.8;
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 + (ring ? -run * .23 : run * .16);
      const r = R * (ring ? .42 : .64), px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      ctx.globalAlpha = face * (ring ? .68 : 1);
      petal(ctx, px, py, R * (ring ? .22 : .31), R * .09, a + Math.PI / 2,
        ring ? '#fff0b3' : '#ffdb71', ring ? '#ae771f' : '#9e5415');
      ctx.globalAlpha = 1;
    }
    const hand = (a, length, width, color) => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-width, 0);
      ctx.lineTo(0, -length); ctx.lineTo(width, 0); ctx.lineTo(0, length * .16);
      ctx.closePath(); ctx.fill(); ctx.restore();
    };
    hand(run - Math.PI / 2, R * .57, 3.1, '#fff4c6');
    hand(run * .2 - Math.PI / 2, R * .42, 5, '#d9a840');
    point(ctx, cx, cy, R * .07, face, '#5b3419'); point(ctx, cx, cy, R * .026, face, '#fff3b6');
    // Estelas retrógradas se separan del dial y vuelven hacia la flor.
    if (age >= 0) for (let j = 0; j < 6; j++) {
      const a = -Math.PI / 2 - reverse * (j + 1) * .7;
      ctx.strokeStyle = `rgba(255,196,84,${(1 - j / 6) * reverse * .4})`;
      ctx.beginPath(); ctx.arc(cx, cy, R * (.5 + j * .075), a, a + .6); ctx.stroke();
    }
    for (const p of dust) {
      const a = p.a - t * .09 - reverse * 1.5, r = R * (1.02 + p.r * .38);
      point(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, .5 + p.r,
        (.1 + .3 * Math.sin(t * 2 + p.phase) ** 2) * face, '#ffe09b');
    }
    if (hero > 0) {
      textHalo(ctx, 'Volvería a elegirte', cx, h * .77, Math.max(15, w * .066), hero);
      textHalo(ctx, recipient(stage), cx, h * .84, Math.max(20, w * .10), hero, '#fff3c4');
    }
  };
}
