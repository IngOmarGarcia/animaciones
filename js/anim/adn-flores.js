import { TAU, clamp, ease, progress, mix, seeded, backdrop, project,
  sunflower, point, flare, textHalo, recipient, consumeTap } from './flower-premium-core.js';

export default function create(ctx, w, h, dpr = 1, stage) {
  const rand = seeded(63921), count = stage?.preview ? 360 : 950;
  const nodes = Array.from({ length: count }, (_, i) => ({
    y: i / count * 3.6 - 1.8, strand: i % 2 ? 1 : -1,
    petal: i % 15, u: rand(), v: rand() * 2 - 1, phase: rand() * TAU,
  }));
  let collapseAt = null;
  return (t) => {
    backdrop(ctx, w, h, '#020818', '#151024', t);
    const cx = w / 2, cy = h * .49, R = Math.min(w * .30, h * .19);
    if (consumeTap(stage) && t > 4.4 && collapseAt === null) collapseAt = t;
    if (collapseAt === null && t > 7.1) collapseAt = t;
    const age = collapseAt === null ? -1 : t - collapseAt;
    const helix = progress(t, .6, 2.8), blossom = progress(t, 3.4, 1.7);
    const morph = age < 0 ? 0 : progress(age, 0, 2.5);
    const final = age < 0 ? 0 : progress(age, 1.8, 1.7);
    if (stage && age > 3.4) stage.revealed = true;
    flare(ctx, cx, cy, R * 2, helix * .15 + final * .28);
    // Puentes visibles sólo mientras la doble hélice conserva su estructura.
    if (morph < 1) for (let i = 0; i < 19; i++) {
      const y = i / 18 * 3.45 - 1.72, a = y * 4.1 + t * .42;
      const p1 = project(w, h, Math.cos(a) * .72, y, Math.sin(a) * .72);
      const p2 = project(w, h, -Math.cos(a) * .72, y, -Math.sin(a) * .72);
      ctx.strokeStyle = `rgba(255,226,143,${helix * (1 - morph) * .29})`;
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i], a = p.y * 4.1 + t * .42 + p.strand * Math.PI * .5;
      const hx = Math.cos(a) * .72 * p.strand, hz = Math.sin(a) * .72 * p.strand;
      const bloomA = p.petal * TAU / 15;
      const radial = (.18 + p.u * .9) * Math.sin(p.u * Math.PI * .9);
      const flowerX = Math.cos(bloomA) * radial - Math.sin(bloomA) * p.v * .16;
      const flowerY = Math.sin(bloomA) * radial + Math.cos(bloomA) * p.v * .16;
      const x = mix(hx, flowerX, morph) + Math.sin(t + p.phase) * .01;
      const y = mix(p.y, flowerY, morph) + Math.sin(t * .8 + p.phase) * .01;
      const z = mix(hz, Math.sin(p.u * Math.PI) * .20, morph);
      const scr = project(w, h, x, y, z);
      point(ctx, scr.x, scr.y, i % 27 === 0 ? 1.9 : .8,
        helix * (.25 + .65 * Math.sin(t * 1.6 + p.phase) ** 2),
        i % 6 ? '#ffd56e' : '#f4f6ca');
    }
    ctx.restore();
    if (blossom > 0 && morph < .8) {
      for (let i = 0; i < 11; i++) {
        const y = i / 10 * 3.25 - 1.6, a = y * 4.1 + t * .42;
        const p = project(w, h, Math.cos(a) * .72, y, Math.sin(a) * .72);
        sunflower(ctx, p.x, p.y, (5 + blossom * 6) * (1 - morph), a, blossom * (1 - morph), 9);
      }
    }
    if (morph > 0) {
      sunflower(ctx, cx, cy, R * final, Math.sin(t * .21) * .05,
        final * .85, 15);
      ctx.strokeStyle = `rgba(255,222,140,${final * .35})`;
      ctx.beginPath(); ctx.ellipse(cx, cy, R * (1.3 + Math.sin(t) * .03), R * .42, t * .08, 0, TAU); ctx.stroke();
      textHalo(ctx, recipient(stage), cx, h * .77, Math.max(22, w * .105), final);
    }
  };
}
