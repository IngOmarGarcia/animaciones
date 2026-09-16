import { TAU, clamp, progress, mix, seeded, backdrop, point, flare,
  recipient, consumeTap } from './flower-premium-core.js';

export default function create(ctx, w, h, dpr = 1, stage) {
  const rand = seeded(33291), cx = w / 2, cy = h * .45;
  const R = Math.min(w * .34, h * .28), shards = [];
  for (let pet = 0; pet < 12; pet++) {
    const a = pet * TAU / 12, next = a + TAU / 12;
    const inner = R * .16, middle = R * .64, outer = R * .98;
    const P = (r, angle) => [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    const midA = a + TAU / 24;
    shards.push({ poly:[P(inner,a),P(middle,a),P(middle,midA)], pet, part:0, dx:(rand()-.5)*w*1.4,dy:(rand()-.5)*h*.8, spin:rand()*6 });
    shards.push({ poly:[P(inner,a),P(middle,midA),P(middle,next)], pet, part:1, dx:(rand()-.5)*w*1.4,dy:(rand()-.5)*h*.8,spin:rand()*6 });
    shards.push({ poly:[P(middle,a),P(outer,midA),P(middle,midA)], pet, part:2, dx:(rand()-.5)*w*1.4,dy:(rand()-.5)*h*.8,spin:rand()*6 });
    shards.push({ poly:[P(middle,midA),P(outer,midA),P(middle,next)], pet, part:3, dx:(rand()-.5)*w*1.4,dy:(rand()-.5)*h*.8,spin:rand()*6 });
  }
  const palette = ['#f0ae2c','#f8d969','#f9ebad','#e69922','#bd7b24','#e5c776'];
  let lightAt = null;
  return (t) => {
    backdrop(ctx, w, h, '#080b1b', '#171220', t);
    if (consumeTap(stage) && t > 4.2 && lightAt === null) lightAt = t;
    if (lightAt === null && t > 7) lightAt = t;
    const age = lightAt === null ? -1 : t - lightAt;
    const assembled = progress(t, 1, 4.5), illuminated = age < 0 ? 0 : progress(age, 0, 1.7);
    if (stage && age > 2.2) stage.revealed = true;
    // Marco gótico en profundidad y vano oscuro detrás del cristal.
    const frame = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
    frame.addColorStop(0, '#543d31'); frame.addColorStop(.2, '#d5a968');
    frame.addColorStop(.55, '#423427'); frame.addColorStop(.8, '#bb9867'); frame.addColorStop(1, '#362a25');
    ctx.lineWidth = Math.max(6, R * .08); ctx.strokeStyle = frame;
    ctx.beginPath(); ctx.moveTo(cx - R * 1.03, cy + R * 1.22);
    ctx.lineTo(cx - R * 1.03, cy - R * .35);
    ctx.quadraticCurveTo(cx - R, cy - R * 1.2, cx, cy - R * 1.45);
    ctx.quadraticCurveTo(cx + R, cy - R * 1.2, cx + R * 1.03, cy - R * .35);
    ctx.lineTo(cx + R * 1.03, cy + R * 1.22); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,244,219,.42)'; ctx.lineWidth = 1;
    ctx.strokeRect(cx - R * 1.07, cy + R * 1.2, R * 2.14, 3);
    // Ensamble por piezas. Cada triángulo tiene espesor de plomo, gradiente interno y highlight de borde.
    for (let i = 0; i < shards.length; i++) {
      const s = shards[i], k = progress(t, 1 + i * .053, 2.35);
      if (k <= 0) continue;
      const ox = s.dx * (1 - k), oy = s.dy * (1 - k);
      const center = s.poly.reduce((a,p)=>[a[0]+p[0]/3,a[1]+p[1]/3],[0,0]);
      ctx.save(); ctx.translate(center[0] + ox, center[1] + oy);
      ctx.rotate((1 - k) * s.spin);
      const pts = s.poly.map((p) => [p[0]-center[0],p[1]-center[1]]);
      const glass = ctx.createLinearGradient(-R * .45, -R * .4, R * .45, R * .4);
      glass.addColorStop(0, palette[(s.pet + s.part) % palette.length]);
      glass.addColorStop(.55, palette[(s.pet + s.part + 2) % palette.length]);
      glass.addColorStop(1, '#593528');
      ctx.globalAlpha = k * (.72 + illuminated * .28);
      ctx.fillStyle = glass; ctx.beginPath(); ctx.moveTo(...pts[0]);
      for (let j = 1; j < pts.length; j++) ctx.lineTo(...pts[j]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#17151b'; ctx.lineWidth = 3.3; ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,230,${.25 + illuminated * .55})`;
      ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.stroke();
      ctx.restore();
    }
    if (assembled > .2) {
      ctx.save(); ctx.globalAlpha = assembled;
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12 + TAU / 24;
        ctx.translate(cx, cy); ctx.rotate(a);
        ctx.strokeStyle = 'rgba(57,39,33,.85)'; ctx.lineWidth = 2.1;
        ctx.beginPath(); ctx.moveTo(R * .21, 0);
        ctx.bezierCurveTo(R * .48, -R * .29, R * .80, -R * .24, R * .98, 0);
        ctx.bezierCurveTo(R * .80, R * .24, R * .48, R * .29, R * .21, 0);
        ctx.stroke();
        ctx.rotate(-a); ctx.translate(-cx, -cy);
      }
      const disk = ctx.createRadialGradient(cx - R * .06, cy - R * .06, 0, cx, cy, R * .21);
      disk.addColorStop(0, '#ffe6a0'); disk.addColorStop(.45, '#b76e24'); disk.addColorStop(1, '#492d24');
      ctx.fillStyle = disk; ctx.strokeStyle = '#211921'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, R * .20, 0, TAU); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 20; i++) {
        const a = i * 2.399, rr = Math.sqrt(i / 20) * R * .17;
        point(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1, .65, '#ffe6a0');
      }
      ctx.restore();
    }
    // El barrido blanco simula reflejo de Fresnel; la luz atraviesa y crea cáusticas.
    const sweep = (t * .16) % 1;
    const sx = cx - R + sweep * R * 2;
    const spec = ctx.createLinearGradient(sx - R * .2, 0, sx + R * .2, 0);
    spec.addColorStop(0, 'rgba(255,255,255,0)');
    spec.addColorStop(.5, `rgba(255,255,240,${assembled * (.12 + illuminated * .28)})`);
    spec.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    ctx.fillStyle = spec; ctx.fillRect(cx - R, cy - R, R * 2, R * 2); ctx.restore();
    if (illuminated > 0) {
      flare(ctx, cx, cy, R * 1.7, illuminated * .4, '255,212,112');
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12 + Math.sin(t * .16) * .04;
        ctx.fillStyle = `rgba(255,215,124,${illuminated * .035})`;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * .55, cy + Math.sin(a) * R * .55);
        ctx.lineTo(w * .5 + Math.cos(a) * w * .7, h);
        ctx.lineTo(w * .5 + Math.cos(a+.2) * w * .7, h); ctx.fill();
      }
      ctx.save(); ctx.translate(cx, h * .81); ctx.transform(1, 0, -.22, .46, 0, 0);
      ctx.textAlign = 'center'; ctx.font = `700 ${Math.max(24,w * .13)}px Georgia, serif`;
      ctx.fillStyle = `rgba(255,220,132,${illuminated * .85})`;
      ctx.shadowColor = '#f5c45b'; ctx.shadowBlur = 16;
      ctx.fillText(recipient(stage), 0, 0, w * .75); ctx.restore();
    }
  };
}
