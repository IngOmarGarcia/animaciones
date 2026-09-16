import { TAU, clamp, ease, progress, mix, seeded, quality, backdrop, project,
  sunflower, point, flare, textTargets, particleName, recipient, consumeTap } from './flower-premium-core.js';

// Un enjambre de girasoles viaja por Z, dibuja un corazón volumétrico y entrega su materia al nombre.
export default function create(ctx, w, h, dpr = 1, stage) {
  const rand = seeded(8017), count = stage?.preview ? 17 : 23;
  const pollen = Array.from({ length: quality(stage, w, h) }, () => ({
    a: rand() * TAU, r: rand(), z: rand() * 4 - 2, phase: rand() * TAU,
  }));
  const flowers = Array.from({ length: count }, (_, i) => {
    const a = i * TAU / count;
    return { a, z: -7 - rand() * 7, phase: rand() * TAU, size: .18 + rand() * .07 };
  });
  let impactAt = null, cachedName = '', namePts = [];
  return (t) => {
    backdrop(ctx, w, h, '#02050e', '#1c0d10', t);
    const cx = w / 2, cy = h * .53;
    const name = recipient(stage);
    if (name !== cachedName) { cachedName = name; namePts = textTargets(name, w * .77, stage?.preview ? 5 : 3); }
    if (consumeTap(stage) && t > 4.8 && impactAt === null) impactAt = t;
    if (impactAt === null && t > 8.3) impactAt = t;
    const age = impactAt === null ? -1 : t - impactAt;
    const form = progress(t, 1.1, 4.8), breakup = age < 0 ? 0 : progress(age, .06, .8);
    const nameForm = age < 0 ? 0 : progress(age, 1.25, 1.9);
    if (stage && age > 3.2) stage.revealed = true;
    flare(ctx, cx, cy, Math.min(w, h) * .53, form * (1 - breakup) * .25);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pollen.length; i++) {
      const p = pollen[i];
      const travel = t * (.4 + p.r * .7) + p.phase;
      const rr = (40 + p.r * w * .48) * (1 + .08 * Math.sin(t + p.phase));
      point(ctx, cx + Math.cos(p.a + travel * .22) * rr,
        cy + Math.sin(p.a + travel * .22) * rr * .85,
        .45 + p.r * 1.1, (.1 + .22 * Math.sin(travel) ** 2) * (1 - nameForm * .3), '#ffe58a');
    }
    ctx.restore();
    if (form > 0 && breakup < 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 240; i++) {
        const a = i * TAU / 240;
        const hx = .78 * Math.sin(a) ** 3;
        const hy = .85 * (Math.cos(a) * .85 - .34 * Math.cos(2 * a) - .15 * Math.cos(3 * a) - .07 * Math.cos(4 * a)) + .4;
        const p = project(w, h, hx, hy, .45);
        const j = (1 - form) * 75;
        point(ctx, p.x + Math.sin(i * 13.3 + t) * j, p.y + Math.cos(i * 17.2 + t) * j,
          i % 13 === 0 ? 1.5 : .6, form * (1 - breakup) * .48, '#ffc956');
      }
      ctx.restore();
    }
    flowers.forEach((f, i) => {
      const a = f.a;
      const tx = .78 * Math.sin(a) ** 3;
      const ty = .85 * (Math.cos(a) * .85 - .34 * Math.cos(2 * a) - .15 * Math.cos(3 * a) - .07 * Math.cos(4 * a));
      const phase = clamp((t - i * .1 - .35) / 4.2);
      const k = ease(phase);
      const orbit = (1 - k) * .9;
      const z = mix(f.z, .9 + .26 * Math.sin(a * 3), k);
      const bx = mix(Math.cos(a + t * .6) * 2.2, tx, k) + Math.cos(t * .56 + f.phase) * .025;
      const by = mix(Math.sin(a + t * .6) * 1.4, ty, k) + Math.sin(t * .7 + f.phase) * .025;
      const boom = age < 0 ? 0 : Math.sin(Math.PI * clamp(age / 1.55)) * (1 - nameForm);
      const p = project(w, h, bx + Math.cos(a * 3 + t) * (orbit + boom * 1.2),
        by + Math.sin(a * 2 + t) * boom * .8 + .4, z + boom * 2.2);
      const radius = clamp(p.scale * f.size * (1 + Math.sin(t + f.phase) * .025), 2, w * .057);
      sunflower(ctx, p.x, p.y, radius, t * .1 + a * .12, k * (1 - nameForm), 12);
    });
    if (age >= 0) {
      const wave = clamp(age / 1.3);
      ctx.strokeStyle = `rgba(255,213,91,${(1 - wave) * .45})`;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, wave * w * .48, wave * h * .28, 0, 0, TAU); ctx.stroke();
      particleName(ctx, namePts, cx, h * .58, t, nameForm);
    }
  };
}
